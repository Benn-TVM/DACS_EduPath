import math
from collections import Counter
from functools import lru_cache

from django.db.models import Count, Max
from .models import Course, CourseCategory, CourseTag
from .preprocessing import normalize_text, tokenize_text

HYBRID_SCORE_WEIGHTS = {
    "cosine": 0.45,
    "query_coverage": 0.20,
    "title_match": 0.20,
    "code_match": 0.10,
    "metadata_match": 0.05,
}


def build_profile_query(profile) -> str:
    parts = [
        profile.skill_level,
        profile.learning_goal,
        profile.interests,
        profile.learning_needs,
    ]
    return " ".join(part.strip() for part in parts if part and part.strip())


def _course_tokens(course: Course) -> list[str]:
    if course.tokenized_text:
        return [token for token in course.tokenized_text.split() if token]
    return tokenize_text(course.search_document or course.title)


def _idf_map(documents: list[list[str]]) -> dict[str, float]:
    document_count = len(documents)
    if document_count == 0:
        return {}

    doc_frequency: Counter[str] = Counter()
    for document in documents:
        doc_frequency.update(set(document))

    return {
        term: math.log((1 + document_count) / (1 + frequency)) + 1
        for term, frequency in doc_frequency.items()
    }


def _tfidf_vector(tokens: list[str], idf_map: dict[str, float]) -> dict[str, float]:
    if not tokens:
        return {}

    term_counts = Counter(tokens)
    token_count = len(tokens)
    return {
        term: (count / token_count) * idf_map.get(term, 0.0)
        for term, count in term_counts.items()
    }


def _cosine_similarity(
    left_vector: dict[str, float],
    right_vector: dict[str, float],
) -> float:
    if not left_vector or not right_vector:
        return 0.0

    common_terms = set(left_vector).intersection(right_vector)
    numerator = sum(left_vector[term] * right_vector[term] for term in common_terms)
    if numerator == 0:
        return 0.0

    left_norm = math.sqrt(sum(value * value for value in left_vector.values()))
    right_norm = math.sqrt(sum(value * value for value in right_vector.values()))
    if left_norm == 0 or right_norm == 0:
        return 0.0

    return numerator / (left_norm * right_norm)


def _token_overlap_ratio(query_tokens: list[str], candidate_tokens: tuple[str, ...] | list[str]) -> float:
    if not query_tokens or not candidate_tokens:
        return 0.0

    query_terms = set(query_tokens)
    candidate_terms = set(candidate_tokens)
    return len(query_terms.intersection(candidate_terms)) / len(query_terms)


def _title_match_score(
    normalized_query: str,
    normalized_title: str,
    query_tokens: list[str],
    title_tokens: tuple[str, ...],
) -> float:
    if not normalized_query or not normalized_title:
        return 0.0

    if normalized_title == normalized_query:
        return 1.0

    if normalized_query in normalized_title:
        return 0.9

    overlap_ratio = _token_overlap_ratio(query_tokens, title_tokens)
    if overlap_ratio == 1.0 and query_tokens:
        return 0.75

    return overlap_ratio


def _code_match_score(normalized_query: str, normalized_course_code: str) -> float:
    if not normalized_query or not normalized_course_code:
        return 0.0

    if normalized_query == normalized_course_code:
        return 1.0

    if normalized_query in normalized_course_code or normalized_course_code in normalized_query:
        return 0.8

    return 0.0


def _metadata_tokens(course: Course) -> list[str]:
    values = [course.provider]

    if course.category:
        values.append(course.category.name)
        if course.category.parent:
            values.append(course.category.parent.name)

    tokens: list[str] = []
    for value in values:
        tokens.extend(tokenize_text(value or ""))
    return tokens


def _round_score(value: float) -> float:
    return round(min(0.99, max(0.0, value)), 4)


def _build_explanation(score_breakdown: dict[str, float], matched_terms: list[str]) -> str:
    reasons: list[str] = []

    if matched_terms:
        visible_terms = ", ".join(matched_terms[:5])
        reasons.append(f"Khop tu khoa: {visible_terms}.")

    if score_breakdown["title_match"] >= 0.5:
        reasons.append("Tieu de khoa hoc gan voi truy van.")
    if score_breakdown["code_match"] >= 0.5:
        reasons.append("Ma mon/khoa hoc khop voi truy van.")
    if score_breakdown["metadata_match"] > 0:
        reasons.append("Danh muc, tag hoac don vi cung cap co lien quan.")
    if score_breakdown["cosine"] > 0 and not reasons:
        reasons.append("Noi dung khoa hoc co do tuong dong voi truy van.")

    return " ".join(reasons) or "Khoa hoc co diem phu hop tu baseline hybrid ranking."


def _hybrid_relevance_details(
    *,
    normalized_query: str,
    query_tokens: list[str],
    query_vector: dict[str, float],
    course_entry: dict,
) -> dict:
    cosine_score = _cosine_similarity(query_vector, course_entry["vector"])
    query_coverage_score = _token_overlap_ratio(query_tokens, course_entry["tokens"])
    title_score = _title_match_score(
        normalized_query,
        course_entry["normalized_title"],
        query_tokens,
        course_entry["title_tokens"],
    )
    code_score = _code_match_score(normalized_query, course_entry["normalized_course_code"])
    metadata_score = _token_overlap_ratio(query_tokens, course_entry["metadata_tokens"])

    final_score = (
        HYBRID_SCORE_WEIGHTS["cosine"] * cosine_score
        + HYBRID_SCORE_WEIGHTS["query_coverage"] * query_coverage_score
        + HYBRID_SCORE_WEIGHTS["title_match"] * title_score
        + HYBRID_SCORE_WEIGHTS["code_match"] * code_score
        + HYBRID_SCORE_WEIGHTS["metadata_match"] * metadata_score
    )

    score_breakdown = {
        "cosine": _round_score(cosine_score),
        "query_coverage": _round_score(query_coverage_score),
        "title_match": _round_score(title_score),
        "code_match": _round_score(code_score),
        "metadata_match": _round_score(metadata_score),
    }
    matched_terms = sorted(set(query_tokens).intersection(course_entry["tokens"]))
    score = _round_score(final_score)

    return {
        "score": score,
        "baseline_score": score,
        "score_breakdown": score_breakdown,
        "ranker": "hybrid",
        "matched_terms": matched_terms,
        "explanation": _build_explanation(score_breakdown, matched_terms),
    }


def _course_index_signature() -> tuple[int, str, int, str, int, str, int]:
    course_summary = Course.objects.filter(is_active=True).aggregate(total=Count("id"), latest=Max("updated_at"))
    category_summary = CourseCategory.objects.aggregate(total=Count("id"), latest=Max("updated_at"))
    tag_summary = CourseTag.objects.aggregate(total=Count("id"), latest=Max("updated_at"))
    relation_count = Course.tags.through.objects.count()

    course_latest = course_summary["latest"]
    category_latest = category_summary["latest"]
    tag_latest = tag_summary["latest"]

    return (
        int(course_summary["total"] or 0),
        course_latest.isoformat() if course_latest else "",
        int(category_summary["total"] or 0),
        category_latest.isoformat() if category_latest else "",
        int(tag_summary["total"] or 0),
        tag_latest.isoformat() if tag_latest else "",
        int(relation_count),
    )


@lru_cache(maxsize=8)
def _build_course_index(
    total_courses: int,
    latest_updated_at: str,
    total_categories: int,
    latest_category_updated_at: str,
    total_tags: int,
    latest_tag_updated_at: str,
    total_tag_relations: int,
) -> tuple[tuple[dict, ...], dict[str, float]]:
    del (
        total_courses,
        latest_updated_at,
        total_categories,
        latest_category_updated_at,
        total_tags,
        latest_tag_updated_at,
        total_tag_relations,
    )

    courses = list(
        Course.objects.filter(is_active=True)
        .select_related("category", "category__parent")
        .defer("search_document")
        .order_by("id")
    )
    course_documents = [_course_tokens(course) for course in courses]
    idf_map = _idf_map(course_documents)

    indexed_courses = tuple(
        {
            "course": course,
            "tokens": tuple(tokens),
            "vector": _tfidf_vector(tokens, idf_map),
            "normalized_title": course.normalized_title or normalize_text(course.title),
            "title_tokens": tuple(tokenize_text(course.title)),
            "normalized_course_code": normalize_text(course.course_code or ""),
            "metadata_tokens": tuple(_metadata_tokens(course)),
        }
        for course, tokens in zip(courses, course_documents)
    )
    return indexed_courses, idf_map


def rank_courses_by_text(query_text: str, *, top_k: int = 10) -> list[dict]:
    normalized_query = normalize_text(query_text)
    query_tokens = tokenize_text(query_text)
    if not query_tokens:
        return []

    indexed_courses, idf_map = _build_course_index(*_course_index_signature())
    query_vector = _tfidf_vector(query_tokens, idf_map)

    ranked_courses: list[dict] = []
    for course_entry in indexed_courses:
        course = course_entry["course"]
        rank_details = _hybrid_relevance_details(
            normalized_query=normalized_query,
            query_tokens=query_tokens,
            query_vector=query_vector,
            course_entry=course_entry,
        )
        score = rank_details["score"]
        if score <= 0:
            continue

        ranked_courses.append(
            {
                "course": course,
                **rank_details,
            }
        )

    ranked_courses.sort(key=lambda item: item["score"], reverse=True)
    return ranked_courses[:top_k]
