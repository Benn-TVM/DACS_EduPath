from django.db.models import Count
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Course, CourseCategory, CourseReview, CourseTag, ReviewVote, Roadmap, RoadmapStep, SavedCourse, SearchHistory, UserProfile
from .serializers import (
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
from .services import build_profile_query, rank_courses_by_text


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


class HelloWorldAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"message": "Kết nối API Django thành công."})


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
