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

class HelloWorldAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"message": "Kết nối API Django thành công."})


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Đăng ký thành công.",
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class EduPathTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EduPathTokenObtainPairSerializer


class RefreshTokenAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EduPathTokenRefreshSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response(
                {"detail": "Mã làm mới phiên không hợp lệ hoặc đã hết hạn."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class OnboardingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(UserProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()

        has_profile_data = any(
            [
                profile.skill_level,
                profile.learning_goal,
                profile.interests,
                profile.learning_needs,
            ]
        )
        if has_profile_data and not profile.onboarding_completed:
            profile.onboarding_completed = True
            profile.save(update_fields=["onboarding_completed", "updated_at"])

        return Response(UserProfileSerializer(profile).data)


