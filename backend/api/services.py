import math
from collections import Counter
from functools import lru_cache

from django.db.models import Count, Max
from .models import Course
from .preprocessing import tokenize_text


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


def _course_index_signature() -> tuple[int, str]:
    summary = Course.objects.filter(is_active=True).aggregate(total=Count("id"), latest=Max("updated_at"))
    latest = summary["latest"]
    latest_text = latest.isoformat() if latest else ""
    return int(summary["total"] or 0), latest_text


@lru_cache(maxsize=8)
def _build_course_index(total_courses: int, latest_updated_at: str) -> tuple[tuple[dict, ...], dict[str, float]]:
    del total_courses, latest_updated_at

    courses = list(Course.objects.filter(is_active=True).order_by("id"))
    course_documents = [_course_tokens(course) for course in courses]
    idf_map = _idf_map(course_documents)

    indexed_courses = tuple(
        {
            "course": course,
            "tokens": tuple(tokens),
            "vector": _tfidf_vector(tokens, idf_map),
        }
        for course, tokens in zip(courses, course_documents)
    )
    return indexed_courses, idf_map


def rank_courses_by_text(query_text: str, *, top_k: int = 10) -> list[dict]:
    query_tokens = tokenize_text(query_text)
    if not query_tokens:
        return []

    indexed_courses, idf_map = _build_course_index(*_course_index_signature())
    query_vector = _tfidf_vector(query_tokens, idf_map)

    ranked_courses: list[dict] = []
    for course_entry in indexed_courses:
        course = course_entry["course"]
        tokens = course_entry["tokens"]
        score = _cosine_similarity(query_vector, course_entry["vector"])
        if score <= 0:
            continue

        ranked_courses.append(
            {
                "course": course,
                "score": round(score, 4),
                "matched_terms": sorted(set(query_tokens).intersection(tokens)),
            }
        )

    ranked_courses.sort(key=lambda item: item["score"], reverse=True)
    return ranked_courses[:top_k]
