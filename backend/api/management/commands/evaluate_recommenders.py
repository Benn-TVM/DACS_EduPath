import csv
import math
from dataclasses import dataclass
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from api.ml_recommender import load_course_reranker, rank_courses_for_profile
from api.models import Course, CourseReview, SavedCourse, UserProfile
from api.preprocessing import tokenize_text
from api.services import build_profile_query, rank_courses_by_text


@dataclass(frozen=True)
class EvaluationCase:
    user_id: int
    profile: UserProfile
    query_text: str
    relevant_course_ids: set[int]


class CountVectorizerRanker:
    def __init__(self):
        from sklearn.feature_extraction.text import CountVectorizer

        self.courses = list(
            Course.objects.filter(is_active=True)
            .select_related("category", "category__parent")
            .prefetch_related("tags")
            .order_by("id")
        )
        documents = [self._document_for_course(course) for course in self.courses]
        self.vectorizer = CountVectorizer(token_pattern=r"(?u)\b\w+\b")
        self.course_matrix = self.vectorizer.fit_transform(documents) if documents else None

    def _document_for_course(self, course: Course) -> str:
        if course.tokenized_text:
            return course.tokenized_text
        return " ".join(tokenize_text(course.search_document or course.title))

    def rank(self, query_text: str, *, top_k: int) -> list[int]:
        if not self.courses or self.course_matrix is None:
            return []

        from sklearn.metrics.pairwise import cosine_similarity

        query_document = " ".join(tokenize_text(query_text))
        if not query_document:
            return []

        query_vector = self.vectorizer.transform([query_document])
        similarities = cosine_similarity(query_vector, self.course_matrix).ravel()
        scored_course_ids = [
            (course.id, float(score))
            for course, score in zip(self.courses, similarities)
            if score > 0
        ]
        scored_course_ids.sort(key=lambda item: item[1], reverse=True)
        return [course_id for course_id, _score in scored_course_ids[:top_k]]


def _positive_course_ids_by_user() -> dict[int, set[int]]:
    positives: dict[int, set[int]] = {}

    active_course_ids = set(Course.objects.filter(is_active=True).values_list("id", flat=True))
    saved_pairs = SavedCourse.objects.values_list("user_id", "course_id")
    review_pairs = CourseReview.objects.filter(
        is_active=True,
        rating__gte=4,
    ).values_list("user_id", "course_id")

    for user_id, course_id in saved_pairs:
        if course_id in active_course_ids:
            positives.setdefault(user_id, set()).add(course_id)
    for user_id, course_id in review_pairs:
        if course_id in active_course_ids:
            positives.setdefault(user_id, set()).add(course_id)

    return positives


def _build_evaluation_cases() -> list[EvaluationCase]:
    positives_by_user = _positive_course_ids_by_user()
    if not positives_by_user:
        return []

    user_model = get_user_model()
    users = (
        user_model.objects.filter(id__in=positives_by_user.keys())
        .select_related("profile")
        .order_by("id")
    )
    cases: list[EvaluationCase] = []
    for user in users:
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            continue

        query_text = build_profile_query(profile)
        if not query_text.strip():
            continue

        relevant_course_ids = positives_by_user.get(user.id, set())
        if relevant_course_ids:
            cases.append(
                EvaluationCase(
                    user_id=user.id,
                    profile=profile,
                    query_text=query_text,
                    relevant_course_ids=relevant_course_ids,
                )
            )

    return cases


def _precision_at_k(recommended_ids: list[int], relevant_ids: set[int], k: int) -> float:
    if k <= 0:
        return 0.0
    hits = len(set(recommended_ids[:k]).intersection(relevant_ids))
    return hits / k


def _recall_at_k(recommended_ids: list[int], relevant_ids: set[int], k: int) -> float:
    if not relevant_ids:
        return 0.0
    hits = len(set(recommended_ids[:k]).intersection(relevant_ids))
    return hits / len(relevant_ids)


def _dcg_at_k(recommended_ids: list[int], relevant_ids: set[int], k: int) -> float:
    score = 0.0
    for index, course_id in enumerate(recommended_ids[:k], start=1):
        if course_id in relevant_ids:
            score += 1.0 / math.log2(index + 1)
    return score


def _ndcg_at_k(recommended_ids: list[int], relevant_ids: set[int], k: int) -> float:
    ideal_hits = min(len(relevant_ids), k)
    if ideal_hits == 0:
        return 0.0

    ideal_dcg = sum(1.0 / math.log2(index + 1) for index in range(1, ideal_hits + 1))
    if ideal_dcg == 0:
        return 0.0
    return _dcg_at_k(recommended_ids, relevant_ids, k) / ideal_dcg


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


class Command(BaseCommand):
    help = "Evaluate course recommenders with Precision@K, Recall@K, and NDCG@K."

    def add_arguments(self, parser):
        parser.add_argument(
            "--k",
            type=int,
            default=5,
            help="Cutoff K for Precision@K, Recall@K, and NDCG@K.",
        )
        parser.add_argument(
            "--candidate-pool-size",
            type=int,
            default=50,
            help="Hybrid candidate pool size before ML reranking.",
        )
        parser.add_argument(
            "--output",
            type=str,
            default="",
            help="Optional CSV output path for the aggregate metrics table.",
        )

    def handle(self, *args, **options):
        k = max(1, int(options["k"]))
        candidate_pool_size = max(k, int(options["candidate_pool_size"]))
        cases = _build_evaluation_cases()
        if not cases:
            self.stdout.write(
                self.style.WARNING(
                    "No evaluation cases found. Need users with profile data plus saved courses or reviews >= 4."
                )
            )
            return

        count_ranker = CountVectorizerRanker()
        model_payload = load_course_reranker()
        model_ready = model_payload is not None
        metrics: dict[str, dict[str, list[float]]] = {
            "CountVectorizer cosine": {"precision": [], "recall": [], "ndcg": []},
            "TF-IDF/hybrid": {"precision": [], "recall": [], "ndcg": []},
            "ML reranking": {"precision": [], "recall": [], "ndcg": []},
        }

        for case in cases:
            rankings = {
                "CountVectorizer cosine": count_ranker.rank(case.query_text, top_k=k),
                "TF-IDF/hybrid": [
                    item["course"].id
                    for item in rank_courses_by_text(case.query_text, top_k=k)
                ],
                "ML reranking": [
                    item["course"].id
                    for item in rank_courses_for_profile(
                        case.profile,
                        case.query_text,
                        top_k=k,
                        candidate_pool_size=candidate_pool_size,
                    )
                ],
            }

            for model_name, recommended_ids in rankings.items():
                metrics[model_name]["precision"].append(
                    _precision_at_k(recommended_ids, case.relevant_course_ids, k)
                )
                metrics[model_name]["recall"].append(
                    _recall_at_k(recommended_ids, case.relevant_course_ids, k)
                )
                metrics[model_name]["ndcg"].append(
                    _ndcg_at_k(recommended_ids, case.relevant_course_ids, k)
                )

        rows = []
        for model_name, metric_values in metrics.items():
            rows.append(
                {
                    "model": model_name,
                    f"precision@{k}": round(_mean(metric_values["precision"]), 4),
                    f"recall@{k}": round(_mean(metric_values["recall"]), 4),
                    f"ndcg@{k}": round(_mean(metric_values["ndcg"]), 4),
                }
            )

        self.stdout.write("")
        self.stdout.write(f"Evaluation cases: {len(cases)}")
        self.stdout.write(f"Relevant interactions: {sum(len(case.relevant_course_ids) for case in cases)}")
        self.stdout.write(f"ML model ready: {model_ready}")
        self.stdout.write("")
        header = f"{'Model':<26} {'Precision@' + str(k):>12} {'Recall@' + str(k):>10} {'NDCG@' + str(k):>10}"
        self.stdout.write(header)
        self.stdout.write("-" * len(header))
        for row in rows:
            self.stdout.write(
                f"{row['model']:<26} "
                f"{row[f'precision@{k}']:>12.4f} "
                f"{row[f'recall@{k}']:>10.4f} "
                f"{row[f'ndcg@{k}']:>10.4f}"
            )

        output_path = options["output"]
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("w", encoding="utf-8", newline="") as output_file:
                writer = csv.DictWriter(
                    output_file,
                    fieldnames=["model", f"precision@{k}", f"recall@{k}", f"ndcg@{k}"],
                )
                writer.writeheader()
                writer.writerows(rows)
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"Saved evaluation table to {path}"))
