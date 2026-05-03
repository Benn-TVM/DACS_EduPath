from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import Count
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, CourseCategory, CourseTag, SavedCourse, SearchHistory
from .serializers import CourseCategorySerializer, CourseTagSerializer


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
        raise ValidationError({"tag_ids": ["tag_ids phai la mot danh sach ID."]})

    parsed_ids = []
    for item in raw_value:
        try:
            parsed_ids.append(int(item))
        except (TypeError, ValueError) as exc:
            raise ValidationError({"tag_ids": ["Moi tag_id phai la so nguyen hop le."]}) from exc
    return parsed_ids


def _existing_table_names() -> set[str]:
    try:
        return set(connection.introspection.table_names())
    except Exception:
        return set()


def _existing_column_names(table_name: str) -> set[str]:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = %s
                """,
                [table_name],
            )
            return {row[0] for row in cursor.fetchall()}
    except Exception:
        return set()


def _taxonomy_tables_available() -> bool:
    required_tables = {"DanhMucKhoaHoc", "TagKhoaHoc", "KhoaHoc_Tag"}
    return required_tables.issubset(_existing_table_names())


def _course_taxonomy_supported() -> bool:
    return "MaDanhMuc" in _existing_column_names("KhoaHoc") and _taxonomy_tables_available()


def _taxonomy_unavailable_response():
    return Response(
        {
            "detail": "Bang taxonomy chua san sang trong co so du lieu. Hay chay migrate de dung danh muc va tag."
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _course_schema_unavailable_response():
    return Response(
        {
            "detail": "Bang KhoaHoc trong SQL Server chua du schema admin moi. Hay chay migrate de dung chuc nang sua taxonomy."
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _fetch_admin_courses_from_legacy_schema() -> list[dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                MaKhoaHoc,
                TieuDe,
                MaMon,
                DonViToChuc,
                UrlKhoaHoc,
                TieuDeChuanHoa,
                VanBanTimKiem,
                TokenDaXuLy,
                DoKho,
                SoGio,
                LoaiGia,
                LoaiChungChi,
                TrangThai,
                NgayTao,
                NgayCapNhat
            FROM KhoaHoc
            ORDER BY NgayCapNhat DESC, TieuDe ASC
            """
        )
        rows = cursor.fetchall()

    payloads = []
    for row in rows:
        payloads.append(
            {
                "id": row[0],
                "title": row[1],
                "course_code": row[2],
                "provider": row[3],
                "course_url": row[4],
                "normalized_title": row[5],
                "search_document": row[6],
                "tokenized_text": row[7],
                "difficulty_level": row[8] or "",
                "estimated_hours": row[9],
                "price_type": row[10] or "free",
                "certificate_type": row[11] or "",
                "category": None,
                "tags": [],
                "is_active": row[12],
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
            }
        )
    return payloads


def _serialize_admin_course(course: Course, *, include_taxonomy: bool) -> dict:
    category_payload = None
    tag_payloads = []

    if include_taxonomy:
        if course.category_id and getattr(course, "category", None) is not None:
            category = course.category
            category_payload = {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
            }

        for tag in course.tags.all():
            tag_payloads.append(
                {
                    "id": tag.id,
                    "name": tag.name,
                    "slug": tag.slug,
                    "description": tag.description,
                }
            )

    return {
        "id": course.id,
        "title": course.title,
        "course_code": course.course_code,
        "provider": course.provider,
        "course_url": course.course_url,
        "normalized_title": course.normalized_title,
        "search_document": course.search_document,
        "tokenized_text": course.tokenized_text,
        "difficulty_level": course.difficulty_level,
        "estimated_hours": course.estimated_hours,
        "price_type": course.price_type,
        "certificate_type": course.certificate_type,
        "category": category_payload,
        "tags": tag_payloads,
        "is_active": course.is_active,
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "updated_at": course.updated_at.isoformat() if course.updated_at else None,
    }


class AdminStatsAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        user_model = get_user_model()
        total_courses = Course.objects.filter(is_active=True).count()
        total_users = user_model.objects.count()
        total_searches = SearchHistory.objects.count()
        total_saved = SavedCourse.objects.count()

        return Response(
            {
                "total_courses": total_courses,
                "total_users": total_users,
                "total_searches": total_searches,
                "total_saved": total_saved,
            }
        )


class AdminUserListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        user_model = get_user_model()
        users = user_model.objects.all().order_by("-date_joined")
        results = []
        for user in users:
            results.append(
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                    "is_active": user.is_active,
                    "date_joined": user.date_joined.isoformat(),
                    "last_login": user.last_login.isoformat() if user.last_login else None,
                }
            )
        return Response(results)


class AdminCourseAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        include_taxonomy = _course_taxonomy_supported()
        if not include_taxonomy:
            return Response(_fetch_admin_courses_from_legacy_schema())

        courses = Course.objects.order_by("-updated_at", "title")
        courses = courses.select_related("category").prefetch_related("tags")
        return Response([_serialize_admin_course(course, include_taxonomy=include_taxonomy) for course in courses])

    def post(self, request):
        data = request.data
        title = (data.get("title") or "").strip()
        if not title:
            return Response({"detail": "Ten khoa hoc la bat buoc."}, status=status.HTTP_400_BAD_REQUEST)

        include_taxonomy = _course_taxonomy_supported()
        if not include_taxonomy:
            return _course_schema_unavailable_response()
        category = None
        tags = []

        course_url = (data.get("course_url") or "").strip()
        if not course_url:
            course_url = f"https://edupath.local/courses/{slugify(title) or 'course'}"

        category_id = data.get("category_id")
        if category_id not in (None, ""):
            if not include_taxonomy:
                return _taxonomy_unavailable_response()
            category = CourseCategory.objects.filter(id=category_id).first()
            if category is None:
                return Response({"detail": "Khong tim thay danh muc da chon."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tag_ids = _parse_tag_ids(data.get("tag_ids"))
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        if tag_ids:
            if not include_taxonomy:
                return _taxonomy_unavailable_response()
            tags = list(CourseTag.objects.filter(id__in=tag_ids))
            if len(tags) != len(set(tag_ids)):
                return Response({"detail": "Mot hoac nhieu tag khong ton tai."}, status=status.HTTP_400_BAD_REQUEST)

        course = Course.objects.create(
            title=title,
            course_code=(data.get("course_code") or "").strip(),
            provider=(data.get("provider") or "").strip(),
            course_url=course_url,
            normalized_title=(data.get("normalized_title") or title.lower()).strip(),
            search_document=(data.get("search_document") or "").strip(),
            tokenized_text=(data.get("tokenized_text") or "").strip(),
            difficulty_level=(data.get("difficulty_level") or "").strip(),
            estimated_hours=data.get("estimated_hours") or None,
            price_type=(data.get("price_type") or "free").strip(),
            certificate_type=(data.get("certificate_type") or "").strip(),
            category=category,
            is_active=bool(data.get("is_active", True)),
        )
        if tags:
            course.tags.set(tags)

        course_queryset = Course.objects
        if include_taxonomy:
            course_queryset = course_queryset.select_related("category").prefetch_related("tags")
        course = course_queryset.get(id=course.id)

        return Response(
            {
                "detail": "Tao khoa hoc thanh cong.",
                "course": _serialize_admin_course(course, include_taxonomy=include_taxonomy),
            },
            status=status.HTTP_201_CREATED,
        )

    def put(self, request):
        course_id = request.data.get("id")
        if not course_id:
            return Response({"detail": "Thieu ID khoa hoc."}, status=status.HTTP_400_BAD_REQUEST)

        include_taxonomy = _course_taxonomy_supported()
        if not include_taxonomy:
            return _course_schema_unavailable_response()
        course = Course.objects.filter(id=course_id).first()
        if course is None:
            return Response({"detail": "Khong tim thay khoa hoc."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if "title" in data:
            course.title = (data.get("title") or "").strip()
        if "course_code" in data:
            course.course_code = (data.get("course_code") or "").strip()
        if "provider" in data:
            course.provider = (data.get("provider") or "").strip()
        if "course_url" in data:
            course.course_url = (data.get("course_url") or "").strip()
        if "normalized_title" in data:
            course.normalized_title = (data.get("normalized_title") or "").strip()
        if "search_document" in data:
            course.search_document = (data.get("search_document") or "").strip()
        if "tokenized_text" in data:
            course.tokenized_text = (data.get("tokenized_text") or "").strip()
        if "difficulty_level" in data:
            course.difficulty_level = (data.get("difficulty_level") or "").strip()
        if "estimated_hours" in data:
            course.estimated_hours = data.get("estimated_hours") or None
        if "price_type" in data:
            course.price_type = (data.get("price_type") or "free").strip()
        if "certificate_type" in data:
            course.certificate_type = (data.get("certificate_type") or "").strip()
        if "is_active" in data:
            course.is_active = bool(data.get("is_active"))
        if "category_id" in data:
            category_id = data.get("category_id")
            if category_id in (None, ""):
                course.category = None
            else:
                if not include_taxonomy:
                    return _taxonomy_unavailable_response()
                category = CourseCategory.objects.filter(id=category_id).first()
                if category is None:
                    return Response({"detail": "Khong tim thay danh muc da chon."}, status=status.HTTP_400_BAD_REQUEST)
                course.category = category

        if not (course.title or "").strip():
            return Response({"detail": "Ten khoa hoc la bat buoc."}, status=status.HTTP_400_BAD_REQUEST)

        course.save()

        if "tag_ids" in data:
            try:
                tag_ids = _parse_tag_ids(data.get("tag_ids"))
            except ValidationError as exc:
                return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
            if tag_ids:
                if not include_taxonomy:
                    return _taxonomy_unavailable_response()
                tags = list(CourseTag.objects.filter(id__in=tag_ids))
                if len(tags) != len(set(tag_ids)):
                    return Response({"detail": "Mot hoac nhieu tag khong ton tai."}, status=status.HTTP_400_BAD_REQUEST)
                course.tags.set(tags)
            elif include_taxonomy:
                course.tags.clear()

        course_queryset = Course.objects
        if include_taxonomy:
            course_queryset = course_queryset.select_related("category").prefetch_related("tags")
        course = course_queryset.get(id=course.id)

        return Response(
            {
                "detail": "Cap nhat thanh cong.",
                "course": _serialize_admin_course(course, include_taxonomy=include_taxonomy),
            }
        )

    def delete(self, request):
        course_id = request.query_params.get("id") or request.data.get("id")
        if not course_id:
            return Response({"detail": "Thieu ID khoa hoc."}, status=status.HTTP_400_BAD_REQUEST)

        course = Course.objects.filter(id=course_id).first()
        if course is None:
            return Response({"detail": "Khong tim thay khoa hoc."}, status=status.HTTP_404_NOT_FOUND)

        course.delete()
        return Response({"detail": "Da xoa khoa hoc."}, status=status.HTTP_200_OK)


class AdminCategoryAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        categories = (
            CourseCategory.objects.annotate(course_count=Count("courses", distinct=True))
            .prefetch_related("courses__tags")
            .order_by("name")
        )
        results = []
        for category in categories:
            tag_ids = set()
            for course in category.courses.all():
                tag_ids.update(course.tags.values_list("id", flat=True))
            payload = CourseCategorySerializer(category).data
            payload["tag_count"] = len(tag_ids)
            results.append(payload)
        return Response(results)

    def post(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        name = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()
        if not name:
            return Response({"detail": "Ten danh muc la bat buoc."}, status=status.HTTP_400_BAD_REQUEST)
        if CourseCategory.objects.filter(name__iexact=name).exists():
            return Response({"detail": "Danh muc nay da ton tai."}, status=status.HTTP_400_BAD_REQUEST)

        category = CourseCategory.objects.create(
            name=name,
            slug=_build_unique_slug(CourseCategory, name),
            description=description,
        )
        payload = CourseCategorySerializer(category).data
        payload["course_count"] = 0
        payload["tag_count"] = 0
        return Response({"detail": "Tao danh muc thanh cong.", "category": payload}, status=status.HTTP_201_CREATED)

    def put(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        category_id = request.data.get("id")
        if not category_id:
            return Response({"detail": "Thieu ID danh muc."}, status=status.HTTP_400_BAD_REQUEST)
        category = CourseCategory.objects.filter(id=category_id).first()
        if category is None:
            return Response({"detail": "Khong tim thay danh muc."}, status=status.HTTP_404_NOT_FOUND)

        name = (request.data.get("name") or category.name).strip()
        description = (
            (request.data.get("description") if "description" in request.data else category.description) or ""
        ).strip()
        if not name:
            return Response({"detail": "Ten danh muc la bat buoc."}, status=status.HTTP_400_BAD_REQUEST)
        if CourseCategory.objects.filter(name__iexact=name).exclude(id=category.id).exists():
            return Response({"detail": "Danh muc nay da ton tai."}, status=status.HTTP_400_BAD_REQUEST)

        category.name = name
        category.slug = _build_unique_slug(CourseCategory, name, instance_id=category.id)
        category.description = description
        category.save()

        payload = CourseCategorySerializer(category).data
        payload["course_count"] = category.courses.count()
        tag_ids = set()
        for course in category.courses.prefetch_related("tags").all():
            tag_ids.update(course.tags.values_list("id", flat=True))
        payload["tag_count"] = len(tag_ids)
        return Response({"detail": "Cap nhat danh muc thanh cong.", "category": payload})

    def delete(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        category_id = request.query_params.get("id") or request.data.get("id")
        if not category_id:
            return Response({"detail": "Thieu ID danh muc."}, status=status.HTTP_400_BAD_REQUEST)
        category = CourseCategory.objects.filter(id=category_id).first()
        if category is None:
            return Response({"detail": "Khong tim thay danh muc."}, status=status.HTTP_404_NOT_FOUND)
        category.delete()
        return Response({"detail": "Da xoa danh muc."}, status=status.HTTP_200_OK)


class AdminTagAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        tags = CourseTag.objects.annotate(course_count=Count("courses", distinct=True)).order_by("name")
        return Response(CourseTagSerializer(tags, many=True).data)

    def post(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        name = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()
        if not name:
            return Response({"detail": "Ten tag la bat buoc."}, status=status.HTTP_400_BAD_REQUEST)
        if CourseTag.objects.filter(name__iexact=name).exists():
            return Response({"detail": "Tag nay da ton tai."}, status=status.HTTP_400_BAD_REQUEST)

        tag = CourseTag.objects.create(
            name=name,
            slug=_build_unique_slug(CourseTag, name),
            description=description,
        )
        payload = CourseTagSerializer(tag).data
        payload["course_count"] = 0
        return Response({"detail": "Tao tag thanh cong.", "tag": payload}, status=status.HTTP_201_CREATED)

    def put(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        tag_id = request.data.get("id")
        if not tag_id:
            return Response({"detail": "Thieu ID tag."}, status=status.HTTP_400_BAD_REQUEST)
        tag = CourseTag.objects.filter(id=tag_id).first()
        if tag is None:
            return Response({"detail": "Khong tim thay tag."}, status=status.HTTP_404_NOT_FOUND)

        name = (request.data.get("name") or tag.name).strip()
        description = ((request.data.get("description") if "description" in request.data else tag.description) or "").strip()
        if not name:
            return Response({"detail": "Ten tag la bat buoc."}, status=status.HTTP_400_BAD_REQUEST)
        if CourseTag.objects.filter(name__iexact=name).exclude(id=tag.id).exists():
            return Response({"detail": "Tag nay da ton tai."}, status=status.HTTP_400_BAD_REQUEST)

        tag.name = name
        tag.slug = _build_unique_slug(CourseTag, name, instance_id=tag.id)
        tag.description = description
        tag.save()
        payload = CourseTagSerializer(tag).data
        payload["course_count"] = tag.courses.count()
        return Response({"detail": "Cap nhat tag thanh cong.", "tag": payload})

    def delete(self, request):
        if not _taxonomy_tables_available():
            return _taxonomy_unavailable_response()

        tag_id = request.query_params.get("id") or request.data.get("id")
        if not tag_id:
            return Response({"detail": "Thieu ID tag."}, status=status.HTTP_400_BAD_REQUEST)
        tag = CourseTag.objects.filter(id=tag_id).first()
        if tag is None:
            return Response({"detail": "Khong tim thay tag."}, status=status.HTTP_404_NOT_FOUND)
        tag.delete()
        return Response({"detail": "Da xoa tag."}, status=status.HTTP_200_OK)
