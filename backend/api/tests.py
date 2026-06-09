import io
import json
import tempfile
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from .ml_features import (
    FEATURE_NAMES,
    build_recommender_features,
    feature_dict_to_vector,
    load_course_interaction_stats,
)
from .ml_recommender import build_training_dataset, train_course_reranker
from .models import (
    Course,
    CourseCategory,
    CourseReview,
    CourseTag,
    ReviewVote,
    Roadmap,
    RoadmapStep,
    SavedCourse,
    UserProfile,
)
from .preprocessing import build_search_document, normalize_text, tokenize_text
from .services import rank_courses_by_text

User = get_user_model()


class FixedProbabilityModel:
    def predict_proba(self, feature_matrix):
        return [[0.2, 0.8] for _vector in feature_matrix]


def fixed_model_payload():
    return {
        "model": FixedProbabilityModel(),
        "feature_names": FEATURE_NAMES,
    }


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


class CourseraImportCommandTests(TestCase):
    def test_import_coursera_courses_maps_rows_and_tags(self):
        csv_content = (
            "Course Name,University,Difficulty Level,Course URL,Course Description,Skills\n"
            "Python for Everybody,University of Michigan,Beginner Level,https://coursera.org/python,"
            "\"Learn Python programming\",\"Python, Data Analysis\"\n"
            "Python for Everybody,University of Michigan,Beginner Level,https://coursera.org/python-duplicate,"
            "\"Duplicate title\",Python\n"
            "Missing URL Course,Coursera,Beginner Level,,\"No URL\",Testing\n"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            source = f"{tmpdir}/coursera.csv"
            with open(source, "w", encoding="utf-8", newline="") as csv_file:
                csv_file.write(csv_content)

            output = io.StringIO()
            call_command("import_coursera_courses", "--source", source, stdout=output)

        self.assertEqual(Course.objects.count(), 1)
        course = Course.objects.get()
        self.assertEqual(course.title, "Python for Everybody")
        self.assertEqual(course.provider, "University of Michigan")
        self.assertEqual(course.difficulty_level, "beginner")
        self.assertEqual(course.normalized_title, "python for everybody")
        self.assertIn("Learn Python programming", course.search_document)
        self.assertIn("python", course.tokenized_text)
        self.assertEqual(set(course.tags.values_list("name", flat=True)), {"Python", "Data Analysis"})
        self.assertEqual(CourseTag.objects.count(), 2)
        self.assertIn("tao moi: 1", output.getvalue())
        self.assertIn("bo qua: 2", output.getvalue())


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

    def test_rank_courses_by_text_prioritizes_exact_course_code(self):
        results = rank_courses_by_text("IT4015", top_k=5)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["course"].course_code, "IT4015")

    def test_rank_courses_by_text_prioritizes_exact_title_phrase(self):
        results = rank_courses_by_text("an ninh mang", top_k=5)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["course"].course_code, "IT4015")

    def test_rank_courses_by_text_returns_baseline_metadata(self):
        results = rank_courses_by_text("hoc lap trinh co ban", top_k=5)
        self.assertGreaterEqual(len(results), 1)

        top_result = results[0]
        self.assertEqual(top_result["ranker"], "hybrid")
        self.assertEqual(top_result["score"], top_result["baseline_score"])
        self.assertIn("lap", top_result["matched_terms"])
        self.assertIn("trinh", top_result["matched_terms"])
        self.assertIsInstance(top_result["explanation"], str)
        self.assertTrue(top_result["explanation"])
        self.assertEqual(
            set(top_result["score_breakdown"]),
            {"cosine", "query_coverage", "title_match", "code_match", "metadata_match"},
        )


class MlFeatureExtractorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ml_feature_user",
            email="ml_feature_user@example.com",
            password="Review123!",
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            skill_level=UserProfile.BEGINNER,
            learning_goal="hoc python data",
            interests="lap trinh du lieu",
            learning_needs="can khoa co chung chi",
        )
        self.category = CourseCategory.objects.create(
            name="Data Science",
            slug="data-science",
        )
        self.tag = CourseTag.objects.create(name="Python", slug="python")
        self.course = Course.objects.create(
            title="Python Data Analysis",
            course_code="PY101",
            provider="Coursera",
            course_url="https://example.com/python-data-analysis",
            normalized_title="python data analysis",
            search_document="Python Data Analysis beginner certificate data science",
            tokenized_text="python data analysis beginner certificate data science",
            difficulty_level="beginner",
            price_type="free",
            certificate_type="certificate",
            category=self.category,
        )
        self.course.tags.add(self.tag)
        SavedCourse.objects.create(user=self.user, course=self.course)
        CourseReview.objects.create(user=self.user, course=self.course, rating=5, comment="Great")

    def test_build_recommender_features_returns_ordered_ml_features(self):
        baseline_item = rank_courses_by_text("hoc python data", top_k=1)[0]
        stats = load_course_interaction_stats([self.course.id])

        features = build_recommender_features(
            self.profile,
            self.course,
            baseline_item=baseline_item,
            query_text="hoc python data",
            interaction_stats=stats[self.course.id],
        )
        vector = feature_dict_to_vector(features)

        self.assertEqual(set(features), set(FEATURE_NAMES))
        self.assertEqual(len(vector), len(FEATURE_NAMES))
        self.assertEqual(features["baseline_score"], baseline_item["baseline_score"])
        self.assertGreater(features["keyword_overlap"], 0)
        self.assertGreater(features["tag_overlap"], 0)
        self.assertGreater(features["category_overlap"], 0)
        self.assertEqual(features["difficulty_match"], 1.0)
        self.assertGreater(features["saved_count_log"], 0)
        self.assertGreater(features["review_count_log"], 0)
        self.assertEqual(features["average_rating"], 1.0)
        self.assertEqual(features["is_free"], 1.0)
        self.assertEqual(features["has_certificate"], 1.0)


class MlRerankerTrainingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ml_reranker_user",
            email="ml_reranker_user@example.com",
            password="Review123!",
        )
        UserProfile.objects.create(
            user=self.user,
            skill_level=UserProfile.BEGINNER,
            learning_goal="hoc python data science",
            interests="lap trinh du lieu",
            learning_needs="can chung chi",
        )
        self.category = CourseCategory.objects.create(
            name="Data Science",
            slug="ml-reranker-data-science",
        )
        self.positive_course = Course.objects.create(
            title="Python Data Science",
            course_code="PY-DS",
            provider="Coursera",
            course_url="https://example.com/python-data-science",
            normalized_title="python data science",
            search_document="Python Data Science beginner certificate",
            tokenized_text="python data science beginner certificate",
            difficulty_level="beginner",
            price_type="free",
            certificate_type="certificate",
            category=self.category,
        )
        self.negative_course = Course.objects.create(
            title="Python Web Basics",
            course_code="PY-WEB",
            provider="Coursera",
            course_url="https://example.com/python-web-basics",
            normalized_title="python web basics",
            search_document="Python Web Basics beginner programming",
            tokenized_text="python web basics beginner programming",
            difficulty_level="beginner",
            price_type="free",
            certificate_type="certificate",
            category=self.category,
        )
        SavedCourse.objects.create(user=self.user, course=self.positive_course)

    def test_build_training_dataset_creates_positive_and_negative_examples(self):
        dataset = build_training_dataset(negative_per_positive=1, candidate_pool_size=5)

        self.assertEqual(dataset.positive_count, 1)
        self.assertEqual(dataset.negative_count, 1)
        self.assertEqual(dataset.labels, [1, 0])
        self.assertEqual(len(dataset.feature_matrix), 2)
        self.assertEqual(len(dataset.feature_matrix[0]), len(FEATURE_NAMES))
        self.assertEqual(set(dataset.examples[0].features), set(FEATURE_NAMES))
        self.assertEqual(dataset.examples[0].course_id, self.positive_course.id)
        self.assertEqual(dataset.examples[1].course_id, self.negative_course.id)


class MlRerankerFallbackTests(TestCase):
    def test_train_course_reranker_skips_when_interactions_are_insufficient(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = f"{tmpdir}/course_reranker.joblib"
            result = train_course_reranker(
                output_path=model_path,
                min_positive_examples=1,
                min_negative_examples=1,
            )

        self.assertFalse(result["trained"])
        self.assertEqual(result["reason"], "not_enough_positive_examples")
        self.assertEqual(result["positive_count"], 0)
        self.assertEqual(result["negative_count"], 0)


class RecommenderEvaluationCommandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="eval_user",
            email="eval_user@example.com",
            password="Review123!",
        )
        UserProfile.objects.create(
            user=self.user,
            skill_level=UserProfile.BEGINNER,
            learning_goal="hoc python data",
            interests="lap trinh du lieu",
            learning_needs="can chung chi",
        )
        self.relevant_course = Course.objects.create(
            title="Python Data Science",
            course_code="PY-DS-EVAL",
            provider="Coursera",
            course_url="https://example.com/eval-python-data-science",
            normalized_title="python data science",
            search_document="Python Data Science beginner certificate",
            tokenized_text="python data science beginner certificate",
            difficulty_level="beginner",
            price_type="free",
            certificate_type="certificate",
        )
        Course.objects.create(
            title="Python Web Basics",
            course_code="PY-WEB-EVAL",
            provider="Coursera",
            course_url="https://example.com/eval-python-web-basics",
            normalized_title="python web basics",
            search_document="Python Web Basics beginner programming",
            tokenized_text="python web basics beginner programming",
            difficulty_level="beginner",
            price_type="free",
            certificate_type="certificate",
        )
        SavedCourse.objects.create(user=self.user, course=self.relevant_course)

    @patch("api.ml_recommender.load_course_reranker", return_value=None)
    @patch("api.management.commands.evaluate_recommenders.load_course_reranker", return_value=None)
    def test_evaluate_recommenders_outputs_metric_table(self, _mock_command_model, _mock_runtime_model):
        output = io.StringIO()
        call_command("evaluate_recommenders", "--k", "1", stdout=output)

        value = output.getvalue()
        self.assertIn("Evaluation cases: 1", value)
        self.assertIn("CountVectorizer cosine", value)
        self.assertIn("TF-IDF/hybrid", value)
        self.assertIn("ML reranking", value)
        self.assertIn("Precision@1", value)


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

    @patch("api.ml_recommender.load_course_reranker", return_value=None)
    def test_search_creates_history_for_authenticated_user(self, _mock_load_reranker):
        response = self.client.get(
            "/api/search/?q=python",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )
        self.assertEqual(response.status_code, 200)
        first_result = response.json()["results"][0]
        self.assertEqual(first_result["ranker"], "hybrid")
        self.assertEqual(first_result["score"], first_result["baseline_score"])
        self.assertIsNone(first_result["ml_score"])
        self.assertIn("matched_terms", first_result)
        self.assertIn("explanation", first_result)
        self.assertIn("score_breakdown", first_result)

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

    @patch("api.ml_recommender.load_course_reranker", return_value=None)
    def test_recommendations_include_baseline_explanation_fields(self, _mock_load_reranker):
        user = User.objects.get(username=self.user_payload["username"])
        profile = user.profile
        profile.learning_goal = "hoc python"
        profile.interests = "lap trinh"
        profile.save(update_fields=["learning_goal", "interests", "updated_at"])

        response = self.client.get(
            "/api/recommendations/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )

        self.assertEqual(response.status_code, 200)
        first_result = response.json()["results"][0]
        self.assertEqual(first_result["ranker"], "hybrid")
        self.assertEqual(first_result["score"], first_result["baseline_score"])
        self.assertIsNone(first_result["ml_score"])
        self.assertIn("python", first_result["matched_terms"])
        self.assertTrue(first_result["explanation"])
        self.assertIn("cosine", first_result["score_breakdown"])

    @patch("api.ml_recommender.load_course_reranker", return_value=fixed_model_payload())
    def test_authenticated_search_uses_ml_reranking_when_model_is_available(self, _mock_load_reranker):
        response = self.client.get(
            "/api/search/?q=python",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )

        self.assertEqual(response.status_code, 200)
        first_result = response.json()["results"][0]
        self.assertEqual(first_result["ranker"], "ml_reranking")
        self.assertEqual(first_result["score"], first_result["ml_score"])
        self.assertEqual(first_result["ml_score"], 0.8)
        self.assertGreaterEqual(first_result["baseline_score"], 0)
        self.assertIn("ml_score", first_result["score_breakdown"])

    @patch("api.ml_recommender.load_course_reranker", return_value=fixed_model_payload())
    def test_recommendations_use_ml_reranking_when_model_is_available(self, _mock_load_reranker):
        user = User.objects.get(username=self.user_payload["username"])
        profile = user.profile
        profile.learning_goal = "hoc python"
        profile.interests = "lap trinh"
        profile.save(update_fields=["learning_goal", "interests", "updated_at"])

        response = self.client.get(
            "/api/recommendations/",
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )

        self.assertEqual(response.status_code, 200)
        first_result = response.json()["results"][0]
        self.assertEqual(first_result["ranker"], "ml_reranking")
        self.assertEqual(first_result["score"], first_result["ml_score"])
        self.assertEqual(first_result["ml_score"], 0.8)
        self.assertIn("ML reranking", first_result["explanation"])
        self.assertIn("ml_score", first_result["score_breakdown"])


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

    @patch("api.ml_recommender.load_course_reranker", return_value=None)
    @patch("api.jd_parser.parse_input", return_value={"content": "backend developer roadmap"})
    @patch("api.ai_service.get_ai_provider")
    def test_generate_roadmap_uses_verified_candidate_fallback_when_ai_fails(
        self,
        mock_get_ai_provider,
        _mock_parse_input,
        _mock_load_reranker,
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
        self.assertEqual(payload["target_role"], "backend developer roadmap")
        self.assertEqual(len(payload["steps"]), 1)
        self.assertEqual(payload["steps"][0]["course"]["id"], self.course.id)
        self.assertEqual(Roadmap.objects.count(), 1)
        self.assertEqual(RoadmapStep.objects.filter(roadmap_id=payload["id"]).count(), 1)
        roadmap_data = json.loads(Roadmap.objects.get(id=payload["id"]).roadmap_data)
        self.assertEqual(roadmap_data["generation_source"], "deterministic_fallback")
        self.assertEqual(roadmap_data["candidate_course_ids"], [self.course.id])

    @patch("api.ml_recommender.load_course_reranker", return_value=None)
    @patch("api.jd_parser.parse_input", return_value={"content": "backend developer roadmap"})
    @patch("api.ai_service.get_ai_provider")
    def test_generate_roadmap_accepts_llm_only_when_course_ids_are_candidates(
        self,
        mock_get_ai_provider,
        _mock_parse_input,
        _mock_load_reranker,
    ):
        provider = Mock()
        provider.generate_roadmap_json.return_value = {
            "title": "AI Backend Roadmap",
            "target_role": "Backend Developer",
            "extracted_skills": ["Django"],
            "steps": [
                {
                    "order": 1,
                    "phase_name": "Backend foundations",
                    "description": "Learn backend basics.",
                    "skills": ["Django"],
                    "course_id": self.course.id,
                }
            ],
        }
        mock_get_ai_provider.return_value = provider

        response = self.client.post(
            "/api/roadmap/generate/",
            {"input_text": "Backend developer roadmap"},
            format="json",
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()["roadmap"]
        self.assertEqual(payload["title"], "AI Backend Roadmap")
        self.assertEqual(payload["steps"][0]["course"]["id"], self.course.id)
        call_context = provider.generate_roadmap_json.call_args.args[1]
        self.assertIn("ALLOWED_COURSE_IDS", call_context)
        self.assertIn(str(self.course.id), call_context)
        roadmap_data = json.loads(Roadmap.objects.get(id=payload["id"]).roadmap_data)
        self.assertEqual(roadmap_data["generation_source"], "llm_verified")

    @patch("api.ml_recommender.load_course_reranker", return_value=None)
    @patch("api.jd_parser.parse_input", return_value={"content": "backend developer roadmap"})
    @patch("api.ai_service.get_ai_provider")
    def test_generate_roadmap_rejects_llm_course_id_outside_candidate_list(
        self,
        mock_get_ai_provider,
        _mock_parse_input,
        _mock_load_reranker,
    ):
        provider = Mock()
        provider.generate_roadmap_json.return_value = {
            "title": "Unsafe AI Roadmap",
            "target_role": "Backend Developer",
            "extracted_skills": ["Django"],
            "steps": [
                {
                    "order": 1,
                    "phase_name": "Fake course",
                    "description": "This course is not from candidates.",
                    "skills": ["Django"],
                    "course_id": 999999,
                }
            ],
        }
        mock_get_ai_provider.return_value = provider

        response = self.client.post(
            "/api/roadmap/generate/",
            {"input_text": "Backend developer roadmap"},
            format="json",
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()["roadmap"]
        self.assertNotEqual(payload["title"], "Unsafe AI Roadmap")
        self.assertEqual(payload["steps"][0]["course"]["id"], self.course.id)
        roadmap_data = json.loads(Roadmap.objects.get(id=payload["id"]).roadmap_data)
        self.assertEqual(roadmap_data["generation_source"], "deterministic_fallback")
        self.assertNotIn(999999, roadmap_data["candidate_course_ids"])

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
