import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model

from .ml_features import (
    FEATURE_NAMES,
    build_feature_vector,
    build_recommender_features,
    feature_dict_to_vector,
    load_course_interaction_stats,
)
from .models import Course, CourseReview, SavedCourse, UserProfile
from .services import build_profile_query, rank_courses_by_text


DEFAULT_MODEL_PATH = Path(
    getattr(settings, "ML_RERANKER_MODEL_PATH", settings.BASE_DIR / "ml_models" / "course_reranker.joblib")
)
DEFAULT_RERANK_CANDIDATE_POOL_SIZE = 50


@dataclass(frozen=True)
class TrainingExample:
    user_id: int
    course_id: int
    label: int
    query_text: str
    features: dict[str, float]


@dataclass(frozen=True)
class TrainingDataset:
    examples: list[TrainingExample]
    positive_count: int
    negative_count: int

    @property
    def feature_matrix(self) -> list[list[float]]:
        return [feature_dict_to_vector(example.features) for example in self.examples]

    @property
    def labels(self) -> list[int]:
        return [example.label for example in self.examples]


def _positive_course_ids_by_user() -> dict[int, set[int]]:
    positives: dict[int, set[int]] = {}

    saved_pairs = SavedCourse.objects.values_list("user_id", "course_id")
    review_pairs = CourseReview.objects.filter(
        is_active=True,
        rating__gte=4,
    ).values_list("user_id", "course_id")

    for user_id, course_id in saved_pairs:
        positives.setdefault(user_id, set()).add(course_id)
    for user_id, course_id in review_pairs:
        positives.setdefault(user_id, set()).add(course_id)

    return positives


def _baseline_lookup(query_text: str, *, candidate_pool_size: int) -> dict[int, dict]:
    ranked = rank_courses_by_text(query_text, top_k=candidate_pool_size)
    return {item["course"].id: item for item in ranked}


def _load_courses(course_ids: set[int]) -> dict[int, Course]:
    if not course_ids:
        return {}

    courses = (
        Course.objects.filter(id__in=course_ids, is_active=True)
        .select_related("category", "category__parent")
        .prefetch_related("tags")
    )
    return {course.id: course for course in courses}


def build_training_dataset(
    *,
    negative_per_positive: int = 3,
    candidate_pool_size: int = 50,
) -> TrainingDataset:
    positives_by_user = _positive_course_ids_by_user()
    if not positives_by_user:
        return TrainingDataset(examples=[], positive_count=0, negative_count=0)

    user_model = get_user_model()
    users = (
        user_model.objects.filter(id__in=positives_by_user.keys())
        .select_related("profile")
        .order_by("id")
    )

    all_needed_course_ids: set[int] = set()
    per_user_context: list[tuple[object, str, set[int], dict[int, dict], list[int]]] = []

    for user in users:
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            continue

        query_text = build_profile_query(profile)
        if not query_text.strip():
            continue

        positive_ids = positives_by_user.get(user.id, set())
        baseline_items = _baseline_lookup(query_text, candidate_pool_size=candidate_pool_size)
        negative_ids = [
            course_id
            for course_id in baseline_items
            if course_id not in positive_ids
        ][: max(0, len(positive_ids) * negative_per_positive)]

        all_needed_course_ids.update(positive_ids)
        all_needed_course_ids.update(negative_ids)
        per_user_context.append((profile, query_text, positive_ids, baseline_items, negative_ids))

    courses_by_id = _load_courses(all_needed_course_ids)
    stats_by_course_id = load_course_interaction_stats(list(courses_by_id))
    examples: list[TrainingExample] = []

    for profile, query_text, positive_ids, baseline_items, negative_ids in per_user_context:
        for course_id in sorted(positive_ids):
            course = courses_by_id.get(course_id)
            if course is None:
                continue

            baseline_item = baseline_items.get(course_id)
            features = build_recommender_features(
                profile,
                course,
                baseline_item=baseline_item,
                query_text=query_text,
                interaction_stats=stats_by_course_id.get(course_id),
            )
            examples.append(
                TrainingExample(
                    user_id=profile.user_id,
                    course_id=course_id,
                    label=1,
                    query_text=query_text,
                    features=features,
                )
            )

        for course_id in negative_ids:
            course = courses_by_id.get(course_id)
            if course is None:
                continue

            features = build_recommender_features(
                profile,
                course,
                baseline_item=baseline_items.get(course_id),
                query_text=query_text,
                interaction_stats=stats_by_course_id.get(course_id),
            )
            examples.append(
                TrainingExample(
                    user_id=profile.user_id,
                    course_id=course_id,
                    label=0,
                    query_text=query_text,
                    features=features,
                )
            )

    positive_count = sum(1 for example in examples if example.label == 1)
    negative_count = sum(1 for example in examples if example.label == 0)
    return TrainingDataset(
        examples=examples,
        positive_count=positive_count,
        negative_count=negative_count,
    )


def train_course_reranker(
    *,
    output_path: str | Path | None = None,
    negative_per_positive: int = 3,
    candidate_pool_size: int = 50,
    min_positive_examples: int = 2,
    min_negative_examples: int = 2,
) -> dict:
    dataset = build_training_dataset(
        negative_per_positive=negative_per_positive,
        candidate_pool_size=candidate_pool_size,
    )
    result = {
        "trained": False,
        "model_path": str(output_path or DEFAULT_MODEL_PATH),
        "positive_count": dataset.positive_count,
        "negative_count": dataset.negative_count,
        "total_count": len(dataset.examples),
        "feature_names": FEATURE_NAMES,
    }

    if dataset.positive_count < min_positive_examples:
        result["reason"] = "not_enough_positive_examples"
        return result
    if dataset.negative_count < min_negative_examples:
        result["reason"] = "not_enough_negative_examples"
        return result

    from joblib import dump
    from sklearn.linear_model import LogisticRegression

    model = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        random_state=42,
    )
    model.fit(dataset.feature_matrix, dataset.labels)

    model_path = Path(output_path or DEFAULT_MODEL_PATH)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "positive_count": dataset.positive_count,
        "negative_count": dataset.negative_count,
        "total_count": len(dataset.examples),
        "negative_per_positive": negative_per_positive,
        "candidate_pool_size": candidate_pool_size,
    }
    dump(payload, model_path)

    result.update(
        {
            "trained": True,
            "model_path": str(model_path),
            "reason": "",
        }
    )
    return result


def load_course_reranker(model_path: str | Path | None = None) -> dict | None:
    path = Path(model_path or DEFAULT_MODEL_PATH)
    if not path.exists():
        return None

    try:
        from joblib import load

        payload = load(path)
    except Exception:
        return None

    if not isinstance(payload, dict) or payload.get("feature_names") != FEATURE_NAMES:
        return None
    return payload


def _candidate_pool_size(top_k: int) -> int:
    return min(DEFAULT_RERANK_CANDIDATE_POOL_SIZE, max(30, top_k * 5))


def _ml_score_from_model(model, feature_matrix: list[list[float]]) -> list[float]:
    if not feature_matrix:
        return []

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(feature_matrix)
        return [float(row[1]) for row in probabilities]

    raw_scores = model.decision_function(feature_matrix)
    if not isinstance(raw_scores, list):
        raw_scores = list(raw_scores)
    return [1.0 / (1.0 + math.exp(-float(score))) for score in raw_scores]


def _round_rerank_score(value: float) -> float:
    return round(min(0.99, max(0.0, float(value or 0.0))), 4)


def _ml_explanation(item: dict, ml_score: float) -> str:
    baseline_explanation = item.get("explanation", "")
    prefix = f"ML reranking danh gia do phu hop {ml_score:.2f} dua tren ho so nguoi hoc va tin hieu khoa hoc."
    if baseline_explanation:
        return f"{prefix} {baseline_explanation}"
    return prefix


def rerank_courses_with_ml(
    profile,
    query_text: str,
    baseline_ranked: list[dict],
    *,
    top_k: int = 10,
    model_payload: dict | None = None,
) -> list[dict]:
    payload = model_payload if model_payload is not None else load_course_reranker()
    if not payload or not baseline_ranked:
        return baseline_ranked[:top_k]

    model = payload.get("model")
    if model is None:
        return baseline_ranked[:top_k]

    course_ids = [item["course"].id for item in baseline_ranked]
    stats_by_course_id = load_course_interaction_stats(course_ids)
    feature_matrix = [
        build_feature_vector(
            profile,
            item["course"],
            baseline_item=item,
            query_text=query_text,
            interaction_stats=stats_by_course_id.get(item["course"].id),
        )
        for item in baseline_ranked
    ]

    try:
        ml_scores = _ml_score_from_model(model, feature_matrix)
    except Exception:
        return baseline_ranked[:top_k]

    reranked: list[dict] = []
    for item, raw_ml_score in zip(baseline_ranked, ml_scores):
        baseline_score = item.get("baseline_score", item.get("score", 0.0))
        ml_score = _round_rerank_score(raw_ml_score)
        score_breakdown = {
            **item.get("score_breakdown", {}),
            "ml_score": ml_score,
        }
        reranked.append(
            {
                **item,
                "score": ml_score,
                "baseline_score": baseline_score,
                "ml_score": ml_score,
                "ranker": "ml_reranking",
                "score_breakdown": score_breakdown,
                "explanation": _ml_explanation(item, ml_score),
            }
        )

    reranked.sort(
        key=lambda item: (
            item["score"],
            item.get("baseline_score", 0.0),
        ),
        reverse=True,
    )
    return reranked[:top_k]


def rank_courses_for_profile(
    profile,
    query_text: str,
    *,
    top_k: int = 10,
    candidate_pool_size: int | None = None,
) -> list[dict]:
    pool_size = candidate_pool_size or _candidate_pool_size(top_k)
    baseline_ranked = rank_courses_by_text(query_text, top_k=pool_size)
    return rerank_courses_with_ml(profile, query_text, baseline_ranked, top_k=top_k)

