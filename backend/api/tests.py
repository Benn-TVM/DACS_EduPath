from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from .models import Course, CourseReview, ReviewVote, Roadmap, RoadmapStep
from .preprocessing import build_search_document, normalize_text, tokenize_text
from .services import rank_courses_by_text

User = get_user_model()


class PreprocessingTests(SimpleTestCase):
    def test_normalize_text_removes_diacritics_and_extra_spaces(self):
        normalized = normalize_text("  Nhập môn   An toàn thông tin  ")
        self.assertEqual(normalized, "nhap mon an toan thong tin")

    def test_tokenize_text_filters_stop_words(self):
        tokens = tokenize_text("Kỹ thuật lập trình cho người mới")
        self.assertIn("ky", tokens)
        self.assertIn("thuat", tokens)
        self.assertIn("lap", tokens)
        self.assertIn("trinh", tokens)
        self.assertIn("nguoi", tokens)
        self.assertIn("moi", tokens)
        self.assertNotIn("cho", tokens)

    def test_build_search_document_combines_main_fields(self):
        document = build_search_document("Kỹ thuật lập trình", "IT3040", "SOICT")
        self.assertEqual(document, "Kỹ thuật lập trình IT3040 SOICT")


class RecommendationServiceTests(TestCase):
    def setUp(self):
        Course.objects.create(
            title="Kỹ thuật lập trình",
            course_code="IT3040",
            provider="SOICT",
            course_url="https://example.com/it3040",
            normalized_title="ky thuat lap trinh",
            search_document="Kỹ thuật lập trình IT3040 SOICT",
            tokenized_text="ky thuat lap trinh it3040 soict",
        )
        Course.objects.create(
            title="An ninh mạng",
            course_code="IT4015",
            provider="SOICT",
            course_url="https://example.com/it4015",
            normalized_title="an ninh mang",
            search_document="An ninh mạng IT4015 SOICT",
            tokenized_text="an ninh mang it4015 soict",
        )

    def test_rank_courses_by_text_returns_best_match_first(self):
        results = rank_courses_by_text("hoc lap trinh co ban", top_k=5)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["course"].course_code, "IT3040")


class ApiValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_payload = {
            "username": "api_validation_user",
            "email": "api_validation_user@example.com",
            "password": "Review123!",
            "password_confirm": "Review123!",
        }
        self.client.post("/api/auth/register/", self.user_payload, format="json")

        Course.objects.create(
            title="Python cơ bản",
            course_code="IT1001",
            provider="SOICT",
            course_url="https://example.com/python",
            normalized_title="python co ban",
            search_document="Python cơ bản IT1001 SOICT",
            tokenized_text="python co ban it1001 soict",
        )

    def _access_token(self) -> str:
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_payload["username"],
                "password": self.user_payload["password"],
            },
            format="json",
        )
        return response.json()["access"]

    def test_search_returns_400_for_invalid_top_k(self):
        response = self.client.get("/api/search/?q=python&top_k=abc")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"top_k": ["top_k phải là số nguyên."]})

    def test_recommendations_returns_400_for_invalid_top_k(self):
        response = self.client.get(
            "/api/recommendations/?top_k=999",
            HTTP_AUTHORIZATION=f"Bearer {self._access_token()}",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"top_k": ["top_k phải nằm trong khoảng từ 1 đến 50."]},
        )

    def test_onboarding_returns_vietnamese_invalid_choice_message(self):
        response = self.client.put(
            "/api/auth/onboarding/",
            {"skill_level": "expert"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self._access_token()}",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "skill_level": [
                    "Trình độ không hợp lệ. Vui lòng chọn beginner, intermediate hoặc advanced."
                ]
            },
        )


class UserActivityApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_payload = {
            "username": "activity_user",
            "email": "activity_user@example.com",
            "password": "Review123!",
            "password_confirm": "Review123!",
        }
        self.client.post("/api/auth/register/", self.user_payload, format="json")
        self.course = Course.objects.create(
            title="Python nâng cao",
            course_code="IT2002",
            provider="SOICT",
            course_url="https://example.com/python-nang-cao",
            normalized_title="python nang cao",
            search_document="Python nâng cao IT2002 SOICT",
            tokenized_text="python nang cao it2002 soict",
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user_payload["username"],
                "password": self.user_payload["password"],
            },
            format="json",
        )
        self.access_token = login_response.json()["access"]

    def test_search_creates_history_for_authenticated_user(self):
        response = self.client.get(
            "/api/search/?q=python",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(response.status_code, 200)

        history_response = self.client.get(
            "/api/search/history/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(history_response.json()["count"], 1)
        self.assertEqual(history_response.json()["results"][0]["query_text"], "python")

    def test_saved_course_flow(self):
        create_response = self.client.post(
            "/api/saved-courses/",
            {"course_id": self.course.id},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(create_response.status_code, 201)

        list_response = self.client.get(
            "/api/saved-courses/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["count"], 1)
        self.assertEqual(list_response.json()["results"][0]["course"]["id"], self.course.id)

        delete_response = self.client.delete(
            f"/api/saved-courses/{self.course.id}/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.json()["message"], "Đã xóa khóa học khỏi danh sách đã lưu.")

    def test_delete_all_search_history(self):
        self.client.get("/api/search/?q=python", HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        self.client.get("/api/search/?q=du lieu", HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        response = self.client.delete(
            "/api/search/history/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Đã xóa toàn bộ lịch sử tìm kiếm.")

        history_response = self.client.get(
            "/api/search/history/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(history_response.json()["count"], 0)


class AuthenticatedApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="feature_user",
            email="feature_user@example.com",
            password="Review123!",
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "feature_user",
                "password": "Review123!",
            },
            format="json",
        )
        self.access_token = login_response.json()["access"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.access_token}"}

    def create_course(self, *, title: str, code: str, provider: str = "SOICT", **kwargs) -> Course:
        return Course.objects.create(
            title=title,
            course_code=code,
            provider=provider,
            course_url=f"https://example.com/{code.lower()}",
            normalized_title=kwargs.pop("normalized_title", title.lower()),
            search_document=kwargs.pop("search_document", f"{title} {code} {provider}"),
            tokenized_text=kwargs.pop("tokenized_text", f"{title.lower()} {code.lower()} {provider.lower()}"),
            difficulty_level=kwargs.pop("difficulty_level", ""),
            estimated_hours=kwargs.pop("estimated_hours", None),
            price_type=kwargs.pop("price_type", "free"),
            certificate_type=kwargs.pop("certificate_type", ""),
            **kwargs,
        )


class RoadmapApiTests(AuthenticatedApiTestCase):
    def setUp(self):
        super().setUp()
        self.course = self.create_course(
            title="Backend Django",
            code="IT3001",
            difficulty_level="intermediate",
            estimated_hours=30,
        )

    @patch("api.jd_parser.parse_input", return_value={"content": "backend developer roadmap"})
    @patch("api.ai_service.build_courses_context", return_value="course context")
    @patch("api.ai_service.get_ai_provider")
    def test_generate_roadmap_uses_static_fallback_when_ai_fails(
        self,
        mock_get_ai_provider,
        _mock_build_courses_context,
        _mock_parse_input,
    ):
        provider = Mock()
        provider.generate_roadmap_json.side_effect = RuntimeError("rate limited")
        mock_get_ai_provider.return_value = provider

        response = self.client.post(
            "/api/roadmap/generate/",
            {"input_text": "Backend developer roadmap"},
            format="json",
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()["roadmap"]
        self.assertEqual(payload["target_role"], "Lập trình viên Backend")
        self.assertEqual(len(payload["steps"]), 3)
        self.assertEqual(Roadmap.objects.count(), 1)
        self.assertEqual(RoadmapStep.objects.filter(roadmap_id=payload["id"]).count(), 3)

    def test_roadmap_list_detail_update_and_soft_delete_flow(self):
        roadmap = Roadmap.objects.create(
            user=self.user,
            title="Python Backend",
            input_text="python backend",
            target_role="Backend Developer",
            extracted_skills='["Python", "Django"]',
            roadmap_data="{}",
        )
        first_step = RoadmapStep.objects.create(
            roadmap=roadmap,
            order=1,
            phase_name="Basics",
            description="Learn Python basics",
            skills='["Python"]',
        )
        RoadmapStep.objects.create(
            roadmap=roadmap,
            order=2,
            phase_name="Web",
            description="Build APIs with Django",
            skills='["Django", "REST"]',
        )

        list_response = self.client.get("/api/roadmaps/", **self.auth_headers)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["count"], 1)
        self.assertEqual(list_response.json()["results"][0]["completed_count"], 0)

        detail_response = self.client.get(f"/api/roadmaps/{roadmap.id}/", **self.auth_headers)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(len(detail_response.json()["steps"]), 2)

        update_response = self.client.put(
            f"/api/roadmaps/{roadmap.id}/",
            {"step_id": first_step.id, "is_completed": True},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(update_response.status_code, 200)
        first_step.refresh_from_db()
        self.assertTrue(first_step.is_completed)
        self.assertEqual(update_response.json()["steps"][0]["is_completed"], True)

        delete_response = self.client.delete(f"/api/roadmaps/{roadmap.id}/", **self.auth_headers)
        self.assertEqual(delete_response.status_code, 200)
        roadmap.refresh_from_db()
        self.assertFalse(roadmap.is_active)

        after_delete_response = self.client.get("/api/roadmaps/", **self.auth_headers)
        self.assertEqual(after_delete_response.status_code, 200)
        self.assertEqual(after_delete_response.json()["count"], 0)


class CompareCoursesApiTests(AuthenticatedApiTestCase):
    def setUp(self):
        super().setUp()
        self.course_a = self.create_course(
            title="Python for Beginners",
            code="IT1001",
            difficulty_level="beginner",
            estimated_hours=12,
            certificate_type="certificate",
        )
        self.course_b = self.create_course(
            title="Django API Development",
            code="IT2002",
            difficulty_level="intermediate",
            estimated_hours=20,
            price_type="paid",
            certificate_type="verified",
        )
        self.course_c = self.create_course(
            title="Database Design",
            code="IT2003",
            estimated_hours=18,
        )
        self.course_d = self.create_course(
            title="System Design Foundations",
            code="IT3004",
            difficulty_level="advanced",
            estimated_hours=24,
        )
        self.course_e = self.create_course(
            title="Cloud Deployment",
            code="IT3005",
            estimated_hours=16,
        )

    @patch("api.ai_service.get_ai_provider")
    def test_compare_courses_returns_up_to_four_courses_and_ai_summary(self, mock_get_ai_provider):
        provider = Mock()
        provider.generate_text.return_value = "Summary"
        mock_get_ai_provider.return_value = provider

        response = self.client.post(
            "/api/courses/compare/",
            {"course_ids": [self.course_a.id, self.course_b.id, self.course_c.id, self.course_d.id]},
            format="json",
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 4)
        self.assertEqual(payload["ai_summary"], "Summary")
        returned_ids = {item["id"] for item in payload["courses"]}
        self.assertEqual(returned_ids, {self.course_a.id, self.course_b.id, self.course_c.id, self.course_d.id})

    def test_compare_courses_rejects_more_than_four_courses(self):
        response = self.client.post(
            "/api/courses/compare/",
            {"course_ids": [self.course_a.id, self.course_b.id, self.course_c.id, self.course_d.id, self.course_e.id]},
            format="json",
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())


class ReviewApiTests(AuthenticatedApiTestCase):
    def setUp(self):
        super().setUp()
        self.other_user = User.objects.create_user(
            username="reviewer_two",
            email="reviewer_two@example.com",
            password="Review123!",
        )
        self.course = self.create_course(title="React Basics", code="IT1100")

    def test_create_review_update_review_and_vote_flow(self):
        create_response = self.client.post(
            "/api/reviews/",
            {"course_id": self.course.id, "rating": 4, "comment": "Useful"},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(create_response.status_code, 201)
        review_id = create_response.json()["id"]
        self.assertEqual(CourseReview.objects.count(), 1)

        update_response = self.client.post(
            "/api/reviews/",
            {"course_id": self.course.id, "rating": 5, "comment": "Updated comment"},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(update_response.status_code, 201)
        self.assertEqual(CourseReview.objects.count(), 1)
        self.assertEqual(update_response.json()["rating"], 5)

        review = CourseReview.objects.get(id=review_id)
        self.assertEqual(review.comment, "Updated comment")

        other_review = CourseReview.objects.create(
            user=self.other_user,
            course=self.course,
            rating=3,
            comment="Decent",
        )

        add_vote_response = self.client.post(
            f"/api/reviews/{other_review.id}/vote/",
            {"vote_type": "up"},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(add_vote_response.status_code, 200)
        self.assertEqual(add_vote_response.json()["action"], "added")

        switch_vote_response = self.client.post(
            f"/api/reviews/{other_review.id}/vote/",
            {"vote_type": "down"},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(switch_vote_response.status_code, 200)
        self.assertEqual(switch_vote_response.json()["action"], "switched")

        remove_vote_response = self.client.post(
            f"/api/reviews/{other_review.id}/vote/",
            {"vote_type": "down"},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(remove_vote_response.status_code, 200)
        self.assertEqual(remove_vote_response.json()["action"], "removed")
        self.assertFalse(ReviewVote.objects.filter(user=self.user, review=other_review).exists())

    def test_review_feed_can_filter_by_course_and_include_user_vote(self):
        review = CourseReview.objects.create(
            user=self.other_user,
            course=self.course,
            rating=5,
            comment="Great course",
        )
        ReviewVote.objects.create(user=self.user, review=review, vote_type=ReviewVote.UPVOTE)

        response = self.client.get(
            f"/api/reviews/?course_id={self.course.id}&sort=top",
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], review.id)
        self.assertEqual(response.json()[0]["user_vote"], "up")
        self.assertEqual(response.json()[0]["upvotes"], 1)
