import math
from dataclasses import dataclass

from django.db.models import Avg, Count

from .models import Course, CourseReview, SavedCourse
from .preprocessing import normalize_text, tokenize_text
from .services import build_profile_query


FEATURE_NAMES = [
    "baseline_score",
    "cosine_score",
    "query_coverage_score",
    "title_match_score",
    "code_match_score",
    "metadata_match_score",
    "keyword_overlap",
    "title_overlap",
    "tag_overlap",
    "category_overlap",
    "difficulty_match",
    "saved_count_log",
    "review_count_log",
    "average_rating",
    "is_free",
    "has_certificate",
]

DIFFICULTY_ORDER = {
    "beginner": 1,
    "basic": 1,
    "introductory": 1,
    "intermediate": 2,
    "mixed": 2,
    "advanced": 3,
}


@dataclass(frozen=True)
class CourseInteractionStats:
    saved_count: int = 0
    review_count: int = 0
    average_rating: float = 0.0


def _clamp_score(value: float) -> float:
    return max(0.0, min(1.0, float(value or 0.0)))


def _log_count(value: int, *, cap: int = 100) -> float:
    if value <= 0:
        return 0.0
    return _clamp_score(math.log1p(value) / math.log1p(cap))


def _tokens_from_text(value: str) -> set[str]:
    return set(tokenize_text(value or ""))


def _course_tokens(course: Course) -> set[str]:
    if course.tokenized_text:
        return {token for token in course.tokenized_text.split() if token}
    return _tokens_from_text(course.search_document or course.title)


def _overlap_ratio(query_tokens: set[str], candidate_tokens: set[str]) -> float:
    if not query_tokens or not candidate_tokens:
        return 0.0
    return len(query_tokens.intersection(candidate_tokens)) / len(query_tokens)


def _tag_tokens(course: Course) -> set[str]:
    tokens: set[str] = set()
    prefetched_tags = getattr(course, "_prefetched_objects_cache", {}).get("tags")
    tags = prefetched_tags if prefetched_tags is not None else course.tags.all()
    for tag in tags:
        tokens.update(_tokens_from_text(tag.name))
    return tokens


def _category_tokens(course: Course) -> set[str]:
    tokens: set[str] = set()
    if course.category:
        tokens.update(_tokens_from_text(course.category.name))
        if course.category.parent:
            tokens.update(_tokens_from_text(course.category.parent.name))
    return tokens


def _difficulty_value(value: str) -> int | None:
    normalized = normalize_text(value)
    for keyword, score in DIFFICULTY_ORDER.items():
        if keyword in normalized:
            return score
    return None


def _difficulty_match(profile, course: Course) -> float:
    user_level = _difficulty_value(getattr(profile, "skill_level", ""))
    course_level = _difficulty_value(course.difficulty_level or "")
    if user_level is None or course_level is None:
        return 0.0

    gap = abs(user_level - course_level)
    if gap == 0:
        return 1.0
    if gap == 1:
        return 0.5
    return 0.0


def load_course_interaction_stats(course_ids: list[int] | tuple[int, ...]) -> dict[int, CourseInteractionStats]:
    unique_ids = list(dict.fromkeys(int(course_id) for course_id in course_ids if course_id))
    stats = {course_id: CourseInteractionStats() for course_id in unique_ids}
    if not unique_ids:
        return stats

    saved_counts = (
        SavedCourse.objects.filter(course_id__in=unique_ids)
        .values("course_id")
        .annotate(total=Count("id"))
    )
    review_stats = (
        CourseReview.objects.filter(course_id__in=unique_ids, is_active=True)
        .values("course_id")
        .annotate(total=Count("id"), average=Avg("rating"))
    )

    mutable_stats = {
        course_id: {
            "saved_count": 0,
            "review_count": 0,
            "average_rating": 0.0,
        }
        for course_id in unique_ids
    }
    for row in saved_counts:
        mutable_stats[row["course_id"]]["saved_count"] = int(row["total"] or 0)
    for row in review_stats:
        mutable_stats[row["course_id"]]["review_count"] = int(row["total"] or 0)
        mutable_stats[row["course_id"]]["average_rating"] = float(row["average"] or 0.0)

    return {
        course_id: CourseInteractionStats(**values)
        for course_id, values in mutable_stats.items()
    }


def get_course_interaction_stats(course: Course) -> CourseInteractionStats:
    return load_course_interaction_stats([course.id]).get(course.id, CourseInteractionStats())


def build_recommender_features(
    profile,
    course: Course,
    *,
    baseline_item: dict | None = None,
    query_text: str | None = None,
    interaction_stats: CourseInteractionStats | None = None,
) -> dict[str, float]:
    query = query_text if query_text is not None else build_profile_query(profile)
    query_tokens = _tokens_from_text(query)
    course_tokens = _course_tokens(course)
    title_tokens = _tokens_from_text(course.title)
    tag_tokens = _tag_tokens(course)
    category_tokens = _category_tokens(course)
    breakdown = (baseline_item or {}).get("score_breakdown", {})
    matched_terms = set((baseline_item or {}).get("matched_terms", []))
    stats = interaction_stats or get_course_interaction_stats(course)

    features = {
        "baseline_score": _clamp_score((baseline_item or {}).get("baseline_score", (baseline_item or {}).get("score", 0.0))),
        "cosine_score": _clamp_score(breakdown.get("cosine", 0.0)),
        "query_coverage_score": _clamp_score(breakdown.get("query_coverage", 0.0)),
        "title_match_score": _clamp_score(breakdown.get("title_match", 0.0)),
        "code_match_score": _clamp_score(breakdown.get("code_match", 0.0)),
        "metadata_match_score": _clamp_score(breakdown.get("metadata_match", 0.0)),
        "keyword_overlap": _overlap_ratio(query_tokens, course_tokens) if not matched_terms else len(matched_terms) / max(len(query_tokens), 1),
        "title_overlap": _overlap_ratio(query_tokens, title_tokens),
        "tag_overlap": _overlap_ratio(query_tokens, tag_tokens),
        "category_overlap": _overlap_ratio(query_tokens, category_tokens),
        "difficulty_match": _difficulty_match(profile, course),
        "saved_count_log": _log_count(stats.saved_count),
        "review_count_log": _log_count(stats.review_count),
        "average_rating": _clamp_score(stats.average_rating / 5.0),
        "is_free": 1.0 if normalize_text(course.price_type or "") == "free" else 0.0,
        "has_certificate": 1.0 if bool((course.certificate_type or "").strip()) else 0.0,
    }

    return {name: _clamp_score(features[name]) for name in FEATURE_NAMES}


def feature_dict_to_vector(features: dict[str, float]) -> list[float]:
    return [_clamp_score(features.get(name, 0.0)) for name in FEATURE_NAMES]


def build_feature_vector(
    profile,
    course: Course,
    *,
    baseline_item: dict | None = None,
    query_text: str | None = None,
    interaction_stats: CourseInteractionStats | None = None,
) -> list[float]:
    features = build_recommender_features(
        profile,
        course,
        baseline_item=baseline_item,
        query_text=query_text,
        interaction_stats=interaction_stats,
    )
    return feature_dict_to_vector(features)
