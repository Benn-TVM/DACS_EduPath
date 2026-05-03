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

class ReviewListCreateAPIView(APIView):
    """GET /api/reviews/ — Danh sách đánh giá (feed cộng đồng).
    POST /api/reviews/ — Tạo đánh giá mới."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        queryset = CourseReview.objects.filter(is_active=True).select_related(
            "user", "course"
        ).prefetch_related("votes")

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        sort = request.query_params.get("sort", "recent")
        if sort == "top":
            from django.db.models import Count, Q

            queryset = queryset.annotate(
                score=Count("votes", filter=Q(votes__vote_type=ReviewVote.UPVOTE))
                - Count("votes", filter=Q(votes__vote_type=ReviewVote.DOWNVOTE))
            ).order_by("-score", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        reviews = queryset[:50]
        serializer = CourseReviewSerializer(
            reviews, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        ser = CreateReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        course_id = ser.validated_data["course_id"]
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {"detail": "Khóa học không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = CourseReview.objects.filter(
            user=request.user, course=course
        ).first()
        if existing:
            existing.rating = ser.validated_data["rating"]
            existing.comment = ser.validated_data.get("comment", "")
            existing.is_active = True
            existing.save()
            review = existing
        else:
            review = CourseReview.objects.create(
                user=request.user,
                course=course,
                rating=ser.validated_data["rating"],
                comment=ser.validated_data.get("comment", ""),
            )

        out = CourseReviewSerializer(review, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class ReviewVoteAPIView(APIView):
    """POST /api/reviews/<review_id>/vote/ — Toggle upvote/downvote."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, review_id):
        vote_type = request.data.get("vote_type")
        if vote_type not in ("up", "down"):
            return Response(
                {"detail": "vote_type phải là 'up' hoặc 'down'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            review = CourseReview.objects.get(id=review_id, is_active=True)
        except CourseReview.DoesNotExist:
            return Response(
                {"detail": "Đánh giá không tồn tại."},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing_vote = ReviewVote.objects.filter(
            user=request.user, review=review
        ).first()

        if existing_vote:
            if existing_vote.vote_type == vote_type:
                existing_vote.delete()
                return Response({"action": "removed", "vote_type": None})
            else:
                existing_vote.vote_type = vote_type
                existing_vote.save()
                return Response({"action": "switched", "vote_type": vote_type})
        else:
            ReviewVote.objects.create(
                user=request.user, review=review, vote_type=vote_type
            )
            return Response({"action": "added", "vote_type": vote_type})


