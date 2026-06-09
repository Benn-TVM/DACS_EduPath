from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from ..models import SearchHistory
from ..serializers import (
    CourseSerializer,
)

def _parse_top_k(raw_value, *, default: int = 10, minimum: int = 1, maximum: int = 50) -> int:
    if raw_value in (None, ""):
        return default

    try:
        top_k = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({"top_k": ["top_k phải là số nguyên."]}) from exc

    if top_k < minimum or top_k > maximum:
        raise ValidationError({"top_k": [f"top_k phải nằm trong khoảng từ {minimum} đến {maximum}."]})

    return top_k


def _save_search_history(user, query_text: str) -> None:
    if not getattr(user, "is_authenticated", False):
        return

    normalized_query = query_text.strip()
    if not normalized_query:
        return

    latest_history = SearchHistory.objects.filter(user=user).order_by("-created_at").first()
    if latest_history and latest_history.query_text == normalized_query:
        return

    SearchHistory.objects.create(user=user, query_text=normalized_query)
    history_ids_to_keep = list(
        SearchHistory.objects.filter(user=user).order_by("-created_at").values_list("id", flat=True)[:20]
    )
    if history_ids_to_keep:
        SearchHistory.objects.filter(user=user).exclude(id__in=history_ids_to_keep).delete()


def _ranked_course_payload(item: dict) -> dict:
    return {
        **CourseSerializer(item["course"]).data,
        "score": item["score"],
        "baseline_score": item.get("baseline_score", item["score"]),
        "ml_score": item.get("ml_score"),
        "ranker": item.get("ranker", "hybrid"),
        "matched_terms": item.get("matched_terms", []),
        "explanation": item.get("explanation", ""),
        "score_breakdown": item.get("score_breakdown", {}),
    }


def _build_unique_slug(model, name: str, *, instance_id: int | None = None) -> str:
    base_slug = slugify(name) or "item"
    candidate = base_slug
    suffix = 2

    while True:
        queryset = model.objects.filter(slug=candidate)
        if instance_id is not None:
            queryset = queryset.exclude(id=instance_id)
        if not queryset.exists():
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


def _parse_tag_ids(raw_value):
    if raw_value in (None, ""):
        return []
    if not isinstance(raw_value, list):
        raise ValidationError({"tag_ids": ["tag_ids phải là một danh sách ID."]})

    parsed_ids = []
    for item in raw_value:
        try:
            parsed_ids.append(int(item))
        except (TypeError, ValueError) as exc:
            raise ValidationError({"tag_ids": ["Mỗi tag_id phải là số nguyên hợp lệ."]}) from exc
    return parsed_ids


