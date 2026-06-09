from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .. import ai_service
from ..models import Course, CourseCategory, SavedCourse, SearchHistory, UserProfile
from ..serializers import (
    CourseCategoryDetailSerializer,
    CourseCatalogSerializer,
    CourseSerializer,
    SavedCourseCreateSerializer,
    SavedCourseSerializer,
    SearchHistorySerializer,
)
from ..ml_recommender import rank_courses_for_profile
from ..services import build_profile_query, rank_courses_by_text

from .base import _parse_top_k, _ranked_course_payload, _save_search_history


def _parse_catalog_pagination(request):
    raw_limit = request.query_params.get("limit")
    if raw_limit in (None, ""):
        return None, 0

    try:
        limit = int(raw_limit)
        offset = int(request.query_params.get("offset") or 0)
    except (TypeError, ValueError) as exc:
        raise ValidationError({"pagination": ["limit va offset phai la so nguyen."]}) from exc

    if limit < 1 or limit > 500:
        raise ValidationError({"limit": ["limit phai nam trong khoang tu 1 den 500."]})
    if offset < 0:
        raise ValidationError({"offset": ["offset phai lon hon hoac bang 0."]})

    return limit, offset


class CourseListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = Course.objects.filter(is_active=True).select_related("category").order_by("title")
        provider = request.query_params.get("provider")
        if provider:
            queryset = queryset.filter(provider__iexact=provider)

        compact = str(request.query_params.get("compact", "")).lower() in {"1", "true", "yes"}
        if not compact:
            queryset = queryset.prefetch_related("tags")
        else:
            queryset = queryset.defer("normalized_title", "search_document", "tokenized_text")

        serializer_class = CourseCatalogSerializer if compact else CourseSerializer
        limit, offset = _parse_catalog_pagination(request)
        if limit is not None:
            total_count = queryset.count()
            page_queryset = queryset[offset : offset + limit]
            payload = serializer_class(page_queryset, many=True).data
            next_offset = offset + len(payload)
            return Response(
                {
                    "count": total_count,
                    "next_offset": next_offset if next_offset < total_count else None,
                    "results": payload,
                }
            )

        return Response(serializer_class(queryset, many=True).data)


class CourseDetailAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, course_id: int):
        course = Course.objects.filter(is_active=True, id=course_id).select_related("category").prefetch_related("tags").first()
        if course is None:
            return Response({"detail": "Không tìm thấy khóa học."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CourseSerializer(course).data)


class CompareCoursesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        course_ids = request.data.get("course_ids")
        if not isinstance(course_ids, list) or not course_ids:
            return Response(
                {"detail": "course_ids phai la danh sach ID khoa hoc."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parsed_ids = [int(course_id) for course_id in course_ids]
        except (TypeError, ValueError):
            return Response(
                {"detail": "Moi course_id phai la so nguyen hop le."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unique_ids = list(dict.fromkeys(parsed_ids))
        if len(unique_ids) > 4:
            return Response(
                {"detail": "Chi co the so sanh toi da 4 khoa hoc moi lan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        courses_by_id = {
            course.id: course
            for course in Course.objects.filter(id__in=unique_ids, is_active=True)
            .select_related("category")
            .prefetch_related("tags")
        }
        courses = [courses_by_id[course_id] for course_id in unique_ids if course_id in courses_by_id]
        if not courses:
            return Response(
                {"detail": "Khong tim thay khoa hoc hop le de so sanh."},
                status=status.HTTP_404_NOT_FOUND,
            )

        summary_lines = [
            f"- {course.title} | Provider: {course.provider} | "
            f"Level: {course.difficulty_level or 'N/A'} | "
            f"Hours: {course.estimated_hours or 'N/A'} | "
            f"Certificate: {course.certificate_type or 'N/A'}"
            for course in courses
        ]
        system_instruction = (
            "Ban la tro ly tu van hoc tap. Hay so sanh ngan gon cac khoa hoc "
            "dua tren du lieu duoc cung cap, khong bia them khoa hoc moi."
        )
        user_prompt = "So sanh cac khoa hoc sau va dua ra goi y chon:\n" + "\n".join(summary_lines)

        try:
            provider = ai_service.get_ai_provider()
            ai_summary = provider.generate_text(system_instruction, user_prompt)
        except Exception:
            ai_summary = "He thong da tai du lieu khoa hoc de so sanh, nhung chua tao duoc tom tat AI."

        return Response(
            {
                "count": len(courses),
                "courses": CourseSerializer(courses, many=True).data,
                "ai_summary": ai_summary,
            }
        )


class SearchAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        if not query:
            return Response(
                {"detail": "Thiếu tham số q.", "results": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        top_k = _parse_top_k(request.query_params.get("top_k"))
        if getattr(request.user, "is_authenticated", False):
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            ranked = rank_courses_for_profile(profile, query, top_k=top_k)
        else:
            ranked = rank_courses_by_text(query, top_k=top_k)

        _save_search_history(request.user, query)
        payload = [_ranked_course_payload(item) for item in ranked]
        return Response(
            {
                "query_text": query,
                "count": len(payload),
                "results": payload,
            }
        )


class SearchHistoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = SearchHistory.objects.filter(user=request.user).order_by("-created_at")
        return Response(
            {
                "count": queryset.count(),
                "results": SearchHistorySerializer(queryset, many=True).data,
            }
        )

    def delete(self, request):
        deleted_count, _ = SearchHistory.objects.filter(user=request.user).delete()
        return Response(
            {
                "message": "Đã xóa toàn bộ lịch sử tìm kiếm.",
                "deleted_count": deleted_count,
            }
        )


class SearchHistoryDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, history_id: int):
        history = SearchHistory.objects.filter(id=history_id, user=request.user).first()
        if history is None:
            return Response({"detail": "Không tìm thấy lịch sử tìm kiếm."}, status=status.HTTP_404_NOT_FOUND)

        history.delete()
        return Response({"message": "Đã xóa lịch sử tìm kiếm."}, status=status.HTTP_200_OK)


class SavedCourseAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = (
            SavedCourse.objects.filter(user=request.user)
            .select_related("course", "course__category")
            .prefetch_related("course__tags")
            .order_by("-saved_at")
        )
        return Response(
            {
                "count": queryset.count(),
                "results": SavedCourseSerializer(queryset, many=True).data,
            }
        )

    def post(self, request):
        serializer = SavedCourseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = Course.objects.filter(
            id=serializer.validated_data["course_id"],
            is_active=True,
        ).first()
        if course is None:
            return Response({"detail": "Không tìm thấy khóa học."}, status=status.HTTP_404_NOT_FOUND)

        saved_course, created = SavedCourse.objects.get_or_create(user=request.user, course=course)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        message = "Đã lưu khóa học thành công." if created else "Khóa học này đã được lưu trước đó."

        return Response(
            {
                "message": message,
                "saved_course": SavedCourseSerializer(saved_course).data,
            },
            status=response_status,
        )


class SavedCourseDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, course_id: int):
        saved_course = SavedCourse.objects.filter(user=request.user, course_id=course_id).first()
        if saved_course is None:
            return Response({"detail": "Khóa học này chưa được lưu."}, status=status.HTTP_404_NOT_FOUND)

        saved_course.delete()
        return Response({"message": "Đã xóa khóa học khỏi danh sách đã lưu."}, status=status.HTTP_200_OK)

class CategoryListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Lấy danh mục gốc (không có parent)
        queryset = CourseCategory.objects.filter(parent__isnull=True).prefetch_related("children")
        return Response(CourseCategoryDetailSerializer(queryset, many=True).data)
