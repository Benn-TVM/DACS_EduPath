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

class AdminStatsAPIView(APIView):
    """GET /api/admin/stats/ — Admin-only system-wide statistics."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        total_courses = Course.objects.filter(is_active=True).count()
        total_users = User.objects.count()
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
    """GET /api/admin/users/ — Admin-only: list all users."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        users = User.objects.all().order_by("-date_joined")
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
    """Admin-only: Create, Update, Delete courses."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        """Create a new course."""
        data = request.data
        title = data.get("title", "").strip()
        if not title:
            return Response(
                {"detail": "Tên khóa học là bắt buộc."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course_url = data.get("course_url", "").strip()
        if not course_url:
            course_url = f"https://edupath.local/courses/{title.lower().replace(' ', '-')}"

        course = Course.objects.create(
            title=title,
            course_code=data.get("course_code", ""),
            provider=data.get("provider", ""),
            course_url=course_url,
            normalized_title=data.get("normalized_title", title.lower()),
            search_document=data.get("search_document", ""),
            tokenized_text=data.get("tokenized_text", ""),
            difficulty_level=data.get("difficulty_level", ""),
            estimated_hours=data.get("estimated_hours") or None,
            price_type=data.get("price_type", "free"),
            is_active=True,
        )
        return Response(
            {"id": course.id, "title": course.title, "detail": "Tạo khóa học thành công."},
            status=status.HTTP_201_CREATED,
        )

    def put(self, request):
        """Update an existing course."""
        course_id = request.data.get("id")
        if not course_id:
            return Response(
                {"detail": "Thiếu ID khóa học."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"detail": "Không tìm thấy khóa học."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data
        if "title" in data:
            course.title = data["title"]
        if "course_code" in data:
            course.course_code = data["course_code"]
        if "provider" in data:
            course.provider = data["provider"]
        if "course_url" in data:
            course.course_url = data["course_url"]
        if "search_document" in data:
            course.search_document = data["search_document"]
        if "difficulty_level" in data:
            course.difficulty_level = data["difficulty_level"]
        if "estimated_hours" in data:
            course.estimated_hours = data["estimated_hours"] or None
        if "price_type" in data:
            course.price_type = data["price_type"]
        if "is_active" in data:
            course.is_active = data["is_active"]

        course.save()
        return Response({"id": course.id, "title": course.title, "detail": "Cập nhật thành công."})

    def delete(self, request):
        """Delete a course."""
        course_id = request.query_params.get("id") or request.data.get("id")
        if not course_id:
            return Response(
                {"detail": "Thiếu ID khóa học."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"detail": "Không tìm thấy khóa học."},
                status=status.HTTP_404_NOT_FOUND,
            )
        course.delete()
        return Response({"detail": "Đã xóa khóa học."}, status=status.HTTP_200_OK)
