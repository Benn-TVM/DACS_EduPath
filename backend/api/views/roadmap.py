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

class RecommendationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        top_k = _parse_top_k(request.query_params.get("top_k"))
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        query_text = build_profile_query(profile)
        if not query_text.strip():
            return Response(
                {
                    "detail": "Hồ sơ onboarding chưa có dữ liệu để tạo gợi ý.",
                    "results": [],
                },
                status=status.HTTP_200_OK,
            )

        ranked = rank_courses_by_text(query_text, top_k=top_k)
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
                "query_text": query_text,
                "count": len(payload),
                "results": RankedCourseSerializer(payload, many=True).data,
            }
        )


class GenerateRoadmapAPIView(APIView):
    """POST /api/roadmap/generate/ — Tạo lộ trình AI từ free text hoặc JD URL."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import json
        import logging

        from .ai_service import build_courses_context, get_ai_provider
        from .jd_parser import parse_input

        logger = logging.getLogger(__name__)

        serializer = GenerateRoadmapInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_input = serializer.validated_data["input_text"]
        parsed = parse_input(raw_input)

        if parsed.get("error"):
            return Response(
                {"detail": parsed["error"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_content = parsed["content"]

        try:
            provider = get_ai_provider()
            courses_context = build_courses_context()
            ai_result = provider.generate_roadmap_json(user_content, courses_context)
        except Exception as exc:
            logger.exception("Lỗi khi gọi AI (Quá giới hạn hoặc lỗi trả về), kích hoạt fallback: %s", exc)
            # FALLBACK LOGIC
            ai_result = {
                "title": "Lộ trình Backend Developer (Fallback)",
                "target_role": "Lập trình viên Backend",
                "extracted_skills": ["Python", "Django", "SQL", "API"],
                "steps": [
                    {
                        "phase_name": "Giai đoạn 1: Cơ sở lập trình",
                        "description": "Làm quen với tư duy lập trình và các cú pháp cơ bản.",
                        "skills": ["C/C++", "Cấu trúc dữ liệu"],
                        "matched_course_code": "CS101"
                    },
                    {
                        "phase_name": "Giai đoạn 2: Lập trình Python & Web",
                        "description": "Nắm vững Python, framework Django và thao tác với Database.",
                        "skills": ["Python", "Django", "PostgreSQL"],
                        "matched_course_code": "IT202"
                    },
                    {
                        "phase_name": "Giai đoạn 3: Phân tích hệ thống",
                        "description": "Hiểu cách phân tích và thiết kế hệ thống phần mềm lớn.",
                        "skills": ["UML", "Design Patterns"],
                        "matched_course_code": "SE301"
                    }
                ]
            }

        if not ai_result or not ai_result.get("steps"):
            return Response(
                {"detail": "AI không trả về kết quả hợp lệ và không thể dùng fallback. Vui lòng thử lại."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        roadmap = Roadmap.objects.create(
            user=request.user,
            title=ai_result.get("title", "Lộ trình học tập"),
            input_text=raw_input,
            target_role=ai_result.get("target_role", ""),
            extracted_skills=json.dumps(
                ai_result.get("extracted_skills", []), ensure_ascii=False
            ),
            roadmap_data=json.dumps(ai_result, ensure_ascii=False),
        )

        for step_data in ai_result.get("steps", []):
            course_id = step_data.get("course_id")
            course = None
            if course_id:
                course = Course.objects.filter(id=course_id, is_active=True).first()

            RoadmapStep.objects.create(
                roadmap=roadmap,
                order=step_data.get("order", 0),
                phase_name=step_data.get("phase_name", ""),
                description=step_data.get("description", ""),
                skills=json.dumps(step_data.get("skills", []), ensure_ascii=False),
                course=course,
            )

        return Response(
            {
                "message": "Đã tạo lộ trình thành công.",
                "roadmap": RoadmapSerializer(roadmap).data,
            },
            status=status.HTTP_201_CREATED,
        )


class RoadmapListAPIView(APIView):
    """GET /api/roadmaps/ — Danh sách lộ trình của user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        roadmaps = Roadmap.objects.filter(user=request.user, is_active=True)
        return Response(
            {
                "count": roadmaps.count(),
                "results": RoadmapListSerializer(roadmaps, many=True).data,
            }
        )


class RoadmapDetailAPIView(APIView):
    """GET/PUT/DELETE /api/roadmaps/<id>/ — Chi tiết, cập nhật tiến độ, xóa lộ trình."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, roadmap_id: int):
        roadmap = Roadmap.objects.filter(id=roadmap_id, user=request.user, is_active=True).first()
        if roadmap is None:
            return Response(
                {"detail": "Không tìm thấy lộ trình."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(RoadmapSerializer(roadmap).data)

    def put(self, request, roadmap_id: int):
        """Cập nhật tiến độ: toggle hoàn thành cho step."""
        roadmap = Roadmap.objects.filter(id=roadmap_id, user=request.user, is_active=True).first()
        if roadmap is None:
            return Response(
                {"detail": "Không tìm thấy lộ trình."},
                status=status.HTTP_404_NOT_FOUND,
            )

        step_id = request.data.get("step_id")
        is_completed = request.data.get("is_completed")

        if step_id is not None and is_completed is not None:
            step = RoadmapStep.objects.filter(id=step_id, roadmap=roadmap).first()
            if step is None:
                return Response(
                    {"detail": "Không tìm thấy bước lộ trình."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            step.is_completed = bool(is_completed)
            step.save(update_fields=["is_completed"])

        return Response(RoadmapSerializer(roadmap).data)

    def delete(self, request, roadmap_id: int):
        roadmap = Roadmap.objects.filter(id=roadmap_id, user=request.user, is_active=True).first()
        if roadmap is None:
            return Response(
                {"detail": "Không tìm thấy lộ trình."},
                status=status.HTTP_404_NOT_FOUND,
            )
        roadmap.is_active = False
        roadmap.save(update_fields=["is_active", "updated_at"])
        return Response({"message": "Đã xóa lộ trình."}, status=status.HTTP_200_OK)


class DashboardStatsAPIView(APIView):
    """GET /api/dashboard/stats/ — Thống kê cá nhân cho Dashboard widgets."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import json

        user = request.user

        # --- Roadmap Progress ---
        active_roadmap = (
            Roadmap.objects.filter(user=user, is_active=True)
            .order_by("-created_at")
            .first()
        )

        roadmap_progress = None
        if active_roadmap:
            total_steps = active_roadmap.steps.count()
            completed_steps = active_roadmap.steps.filter(is_completed=True).count()
            roadmap_progress = {
                "roadmap_id": active_roadmap.id,
                "title": active_roadmap.title,
                "target_role": active_roadmap.target_role,
                "total_steps": total_steps,
                "completed_steps": completed_steps,
                "progress_percent": (
                    round((completed_steps / total_steps) * 100) if total_steps > 0 else 0
                ),
            }

        # --- Achieved Skills ---
        achieved_skills = []
        if active_roadmap:
            completed_steps_qs = active_roadmap.steps.filter(is_completed=True)
            for step in completed_steps_qs:
                if step.skills:
                    try:
                        skills_list = json.loads(step.skills)
                        achieved_skills.extend(skills_list)
                    except (json.JSONDecodeError, TypeError):
                        skills_split = [s.strip() for s in step.skills.split(",") if s.strip()]
                        achieved_skills.extend(skills_split)
            achieved_skills = list(dict.fromkeys(achieved_skills))

        # --- All skills from all active roadmaps ---
        all_skills = []
        all_roadmaps = Roadmap.objects.filter(user=user, is_active=True)
        for rm in all_roadmaps:
            if rm.extracted_skills:
                try:
                    skills_list = json.loads(rm.extracted_skills)
                    all_skills.extend(skills_list)
                except (json.JSONDecodeError, TypeError):
                    pass
        all_skills = list(dict.fromkeys(all_skills))

        # --- Weekly Trending (top course categories) ---
        total_roadmaps = Roadmap.objects.filter(user=user, is_active=True).count()
        saved_count = SavedCourse.objects.filter(user=user).count()

        return Response(
            {
                "roadmap_progress": roadmap_progress,
                "achieved_skills": achieved_skills,
                "all_target_skills": all_skills,
                "stats_summary": {
                    "total_roadmaps": total_roadmaps,
                    "total_saved": saved_count,
                },
            }
        )


