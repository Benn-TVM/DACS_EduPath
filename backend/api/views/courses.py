from django.db.models import Count
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from ..models import Course, CourseCategory, CourseReview, CourseTag, ReviewVote, Roadmap, RoadmapStep, SavedCourse, SearchHistory, UserProfile
from ..serializers import (
    CourseCategorySerializer,
    CourseReviewSerializer,
    CourseSerializer,
    CourseTagSerializer,
    CreateReviewSerializer,
    EduPathTokenObtainPairSerializer,
    EduPathTokenRefreshSerializer,
    GenerateRoadmapInputSerializer,
    RankedCourseSerializer,
    RegisterSerializer,
    RoadmapListSerializer,
    RoadmapSerializer,
    RoadmapStepSerializer,
    SavedCourseCreateSerializer,
    SavedCourseSerializer,
    SearchHistorySerializer,
    UserProfileSerializer,
    UserSerializer,
)
from ..services import build_profile_query, rank_courses_by_text

from .base import *

class CourseListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = Course.objects.filter(is_active=True).select_related("category").prefetch_related("tags").order_by("title")
        provider = request.query_params.get("provider")
        if provider:
            queryset = queryset.filter(provider__iexact=provider)
        return Response(CourseSerializer(queryset, many=True).data)


class CourseDetailAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, course_id: int):
        course = Course.objects.filter(is_active=True, id=course_id).select_related("category").prefetch_related("tags").first()
        if course is None:
            return Response({"detail": "Không tìm thấy khóa học."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CourseSerializer(course).data)


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
        ranked = rank_courses_by_text(query, top_k=top_k)
        _save_search_history(request.user, query)
        payload = [
            {
                **CourseSerializer(item["course"]).data,
                "score": item["score"],
                "matched_terms": item["matched_terms"],
            }
            for item in ranked
        ]
        return Response(
            {
                "query_text": query,
                "count": len(payload),
                "results": RankedCourseSerializer(payload, many=True).data,
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
        queryset = SavedCourse.objects.filter(user=request.user).select_related("course").order_by("-saved_at")
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


class CompareCoursesAPIView(APIView):
    """POST /api/courses/compare/ — So sánh nhiều khóa học."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        course_ids = request.data.get("course_ids", [])

        if not isinstance(course_ids, list) or len(course_ids) < 2:
            return Response(
                {"detail": "Vui lòng chọn ít nhất 2 khóa học để so sánh."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(course_ids) > 4:
            return Response(
                {"detail": "Chỉ có thể so sánh tối đa 4 khóa học."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        courses = Course.objects.filter(id__in=course_ids, is_active=True)

        if courses.count() < 2:
            return Response(
                {"detail": "Không tìm đủ khóa học để so sánh."},
                status=status.HTTP_404_NOT_FOUND,
            )

        comparison_items = []
        for course in courses:
            comparison_items.append(
                {
                    "id": course.id,
                    "title": course.title,
                    "provider": course.provider,
                    "course_code": course.course_code or "",
                    "course_url": course.course_url,
                    "difficulty_level": course.difficulty_level or "Chưa xác định",
                    "estimated_hours": course.estimated_hours,
                    "price_type": course.price_type or "free",
                    "certificate_type": course.certificate_type or "Chưa rõ",
                }
            )

        # Generate AI insights if available
        ai_summary = ""
        try:
            from .ai_service import get_ai_provider

            provider = get_ai_provider()
            courses_text = "\n".join(
                f"- {item['title']} ({item['provider']}, {item['price_type']}, {item['difficulty_level']})"
                for item in comparison_items
            )
            prompt = (
                f"So sánh ngắn gọn (3-4 câu tiếng Việt) các khóa học sau, "
                f"gợi ý khóa nào phù hợp nhất cho người mới bắt đầu:\n{courses_text}"
            )
            raw = provider.generate_text(
                "Bạn là chuyên gia tư vấn giáo dục CNTT. Trả lời ngắn gọn bằng tiếng Việt.",
                prompt,
            )
            ai_summary = raw
        except Exception:
            ai_summary = ""

        return Response(
            {
                "courses": comparison_items,
                "ai_summary": ai_summary,
                "count": len(comparison_items),
            }
        )


