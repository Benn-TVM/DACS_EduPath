import csv
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.utils.text import slugify

from api.models import Course, CourseTag
from api.preprocessing import normalize_text, tokenize_text


TITLE_COLUMNS = ("Course Name", "course_name", "course_title", "title", "Name")
PROVIDER_COLUMNS = ("University", "Partner", "Institution", "provider", "organization", "course_organization")
URL_COLUMNS = ("Course URL", "course_url", "url", "Link", "course_link")
DESCRIPTION_COLUMNS = ("Course Description", "description", "course_description", "Description")
SKILLS_COLUMNS = ("Skills", "skills", "course_skills", "Skill")
DIFFICULTY_COLUMNS = ("Difficulty Level", "difficulty", "course_difficulty", "level")


def _first_value(row: dict[str, str], columns: tuple[str, ...], default: str = "") -> str:
    for column in columns:
        value = row.get(column)
        if value is not None and str(value).strip():
            return " ".join(str(value).strip().split())
    return default


def _normalize_difficulty(value: str) -> str:
    normalized = normalize_text(value)
    if "beginner" in normalized:
        return "beginner"
    if "intermediate" in normalized:
        return "intermediate"
    if "advanced" in normalized:
        return "advanced"
    if "mixed" in normalized:
        return "mixed"
    return normalized[:20]


def _split_skills(value: str) -> list[str]:
    value = value or ""
    raw_items = re.split(r"[,;|]", value)
    if len(raw_items) <= 1 and len(value) > 120:
        raw_items = tokenize_text(value)

    cleaned_items: list[str] = []
    seen: set[str] = set()

    for item in raw_items:
        skill = " ".join(item.strip().split())
        if not skill:
            continue

        normalized = normalize_text(skill)
        if not normalized or normalized in seen:
            continue

        seen.add(normalized)
        cleaned_items.append(skill[:120])

    return cleaned_items[:20]


def _unique_slug_for_tag(name: str, used_slugs: set[str]) -> str:
    base_slug = slugify(normalize_text(name)) or "tag"
    base_slug = base_slug[:120]
    candidate = base_slug
    suffix = 2

    while candidate in used_slugs:
        candidate = f"{base_slug[:115]}-{suffix}"
        suffix += 1

    used_slugs.add(candidate)
    return candidate


def _get_or_create_tag(
    name: str,
    tag_cache: dict[str, CourseTag],
    used_slugs: set[str],
) -> tuple[CourseTag, bool]:
    cache_key = normalize_text(name)
    existing = tag_cache.get(cache_key)
    if existing:
        return existing, False

    try:
        tag = CourseTag.objects.create(name=name, slug=_unique_slug_for_tag(name, used_slugs))
        tag_cache[cache_key] = tag
        return tag, True
    except IntegrityError:
        existing = CourseTag.objects.filter(name__iexact=name).first()
        if existing:
            tag_cache[cache_key] = existing
            return existing, False
        raise


def _course_lookup(title: str, course_url: str) -> Course | None:
    existing = Course.objects.filter(course_url=course_url).first()
    if existing:
        return existing

    normalized_title = normalize_text(title)
    if not normalized_title:
        return None

    return Course.objects.filter(normalized_title=normalized_title).first()


class Command(BaseCommand):
    help = "Import Coursera course CSV into Course and CourseTag for ML recommendation data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            required=True,
            type=str,
            help="Path to Coursera CSV file.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Optional maximum number of CSV rows to read.",
        )

    def handle(self, *args, **options):
        source = Path(options["source"])
        if not source.exists():
            raise CommandError(f"Khong tim thay file du lieu: {source}")

        created_count = 0
        updated_count = 0
        skipped_count = 0
        tag_created_count = 0
        processed_count = 0
        seen_urls: set[str] = set()
        seen_titles: set[str] = set()
        tag_cache = {normalize_text(tag.name): tag for tag in CourseTag.objects.all()}
        used_slugs = set(CourseTag.objects.values_list("slug", flat=True))

        with source.open("r", encoding="utf-8-sig", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            if not reader.fieldnames:
                raise CommandError("File CSV khong co header.")

            for row in reader:
                if options["limit"] is not None and processed_count >= options["limit"]:
                    break

                processed_count += 1
                title = _first_value(row, TITLE_COLUMNS)
                course_url = _first_value(row, URL_COLUMNS)
                provider = _first_value(row, PROVIDER_COLUMNS, default="Coursera")
                description = _first_value(row, DESCRIPTION_COLUMNS)
                skills_text = _first_value(row, SKILLS_COLUMNS)
                difficulty = _normalize_difficulty(_first_value(row, DIFFICULTY_COLUMNS))
                normalized_title = normalize_text(title)

                if not title or not course_url or not normalized_title:
                    skipped_count += 1
                    continue

                if len(title) > Course._meta.get_field("title").max_length:
                    title = title[: Course._meta.get_field("title").max_length]
                if len(course_url) > Course._meta.get_field("course_url").max_length:
                    skipped_count += 1
                    continue

                normalized_url = course_url.lower()
                if normalized_url in seen_urls or normalized_title in seen_titles:
                    skipped_count += 1
                    continue
                seen_urls.add(normalized_url)
                seen_titles.add(normalized_title)

                skills = _split_skills(skills_text)
                search_document = " ".join(
                    part
                    for part in [title, description, skills_text, difficulty, provider]
                    if part
                )
                tokens = tokenize_text(search_document)
                defaults = {
                    "title": title,
                    "course_code": None,
                    "provider": provider[: Course._meta.get_field("provider").max_length] or "Coursera",
                    "course_url": course_url,
                    "normalized_title": normalized_title[: Course._meta.get_field("normalized_title").max_length],
                    "search_document": search_document,
                    "tokenized_text": " ".join(tokens),
                    "difficulty_level": difficulty,
                    "price_type": "free",
                    "is_active": True,
                }

                with transaction.atomic():
                    course = _course_lookup(title, course_url)
                    if course is None:
                        course = Course.objects.create(**defaults)
                        created_count += 1
                    else:
                        for field, value in defaults.items():
                            setattr(course, field, value)
                        course.save()
                        updated_count += 1

                    tag_ids = []
                    for skill in skills:
                        tag, tag_created = _get_or_create_tag(skill, tag_cache, used_slugs)
                        tag_ids.append(tag.id)
                        if tag_created:
                            tag_created_count += 1
                    if tag_ids:
                        course.tags.set(tag_ids)

        self.stdout.write(
            self.style.SUCCESS(
                "Import Coursera hoan tat. "
                f"Dong doc: {processed_count}, tao moi: {created_count}, "
                f"cap nhat: {updated_count}, bo qua: {skipped_count}, "
                f"tag tao moi: {tag_created_count}."
            )
        )
