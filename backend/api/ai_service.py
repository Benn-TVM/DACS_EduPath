"""
AI Service Layer — Pluggable provider design.

Hiện tại dùng Google Gemini (miễn phí 15 req/phút).
Có thể đổi sang OpenAI / Ollama bằng cách thêm class kế thừa AIProvider.
"""

import json
import logging
from abc import ABC, abstractmethod

from django.conf import settings

from .models import Course
from .serializers import CourseSerializer

logger = logging.getLogger(__name__)

ROADMAP_SYSTEM_PROMPT = """Bạn là một chuyên gia tư vấn giáo dục CNTT (Information Technology Education Advisor).

Nhiệm vụ: Dựa trên mục tiêu của người dùng và danh sách khóa học có sẵn, tạo ra một LỘ TRÌNH HỌC TẬP có cấu trúc rõ ràng.

Quy tắc:
1. Lộ trình gồm 4-6 giai đoạn, từ cơ bản đến nâng cao.
2. Mỗi giai đoạn phải gắn với ít nhất 1 khóa học cụ thể từ danh sách được cung cấp (dùng ID).
3. Ưu tiên khóa học MIỄN PHÍ.
4. Mỗi giai đoạn có tên rõ ràng, mô tả ngắn gọn (1-2 câu), và liệt kê kỹ năng sẽ đạt được.
5. Tạo tiêu đề lộ trình và xác định vị trí nghề nghiệp mục tiêu.

BẮT BUỘC trả về đúng JSON format sau (không kèm markdown, không kèm giải thích):
{
  "title": "Tên lộ trình (VD: Lộ trình Frontend Developer)",
  "target_role": "Vị trí nghề nghiệp mục tiêu (VD: Frontend Developer)",
  "extracted_skills": ["skill1", "skill2", ...],
  "steps": [
    {
      "order": 1,
      "phase_name": "Tên giai đoạn (VD: Nền tảng lập trình)",
      "description": "Mô tả ngắn giai đoạn này",
      "skills": ["HTML", "CSS"],
      "course_id": 123
    }
  ]
}
"""


ROADMAP_SYSTEM_PROMPT += (
    "\nQUY TAC KIEM CHUNG BAT BUOC: Chi duoc dung course_id xuat hien trong "
    "DANH SACH KHOA HOC CO SAN / ALLOWED_COURSE_IDS. Khong tu tao ID, "
    "khong dung ma mon thay cho course_id, va khong de trong course_id."
)


class AIProvider(ABC):
    """Abstract base cho các AI provider."""

    @abstractmethod
    def generate_roadmap_json(self, user_input: str, courses_context: str) -> dict:
        """Tạo roadmap JSON từ input user và context khóa học."""

    @abstractmethod
    def extract_skills_from_text(self, text: str) -> list[str]:
        """Trích xuất danh sách kỹ năng từ đoạn text (VD: JD)."""

    @abstractmethod
    def generate_text(self, system_instruction: str, user_prompt: str) -> str:
        """Tạo text thuần tự do."""


class GeminiProvider(AIProvider):
    """Google Gemini AI Provider."""

    def __init__(self):
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY chưa được cấu hình trong settings. "
                "Thêm GEMINI_API_KEY vào file .env."
            )
        try:
            from google import genai

            self.client = genai.Client(api_key=api_key)
            self.model_name = "gemini-2.0-flash"
        except ImportError as exc:
            raise ImportError(
                "Thiếu thư viện google-genai. Chạy: pip install google-genai"
            ) from exc

    def _call_gemini(self, system_instruction: str, user_prompt: str) -> str:
        import time

        max_retries = 1
        retry_delays = [3, 5]

        for attempt in range(max_retries + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=user_prompt,
                    config={
                        "system_instruction": system_instruction,
                        "temperature": 0.7,
                        "max_output_tokens": 4096,
                    },
                )
                return response.text.strip()
            except Exception as exc:
                error_str = str(exc)
                if ("429" in error_str or "RESOURCE_EXHAUSTED" in error_str) and "limit: 0" not in error_str:
                    if attempt < max_retries:
                        delay = retry_delays[attempt]
                        logger.warning(
                            "Gemini rate limit (429). Thử lại sau %ds (lần %d/%d)...",
                            delay, attempt + 1, max_retries,
                        )
                        time.sleep(delay)
                        continue
                raise

    def _parse_json_response(self, raw_text: str) -> dict:
        cleaned = raw_text
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            cleaned = "\n".join(lines)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error("AI trả về JSON không hợp lệ: %s", raw_text[:500])
            return {}

    def generate_roadmap_json(self, user_input: str, courses_context: str) -> dict:
        prompt = (
            f"MỤC TIÊU CỦA NGƯỜI DÙNG:\n{user_input}\n\n"
            f"DANH SÁCH KHÓA HỌC CÓ SẴN:\n{courses_context}"
        )
        raw = self._call_gemini(ROADMAP_SYSTEM_PROMPT, prompt)
        return self._parse_json_response(raw)

    def extract_skills_from_text(self, text: str) -> list[str]:
        system = (
            "Bạn là chuyên gia phân tích JD (Job Description). "
            "Trích xuất danh sách kỹ năng kỹ thuật từ đoạn text. "
            "BẮT BUỘC trả về JSON array: [\"skill1\", \"skill2\", ...]"
        )
        raw = self._call_gemini(system, text)
        parsed = self._parse_json_response(raw)
        if isinstance(parsed, list):
            return parsed
    def generate_text(self, system_instruction: str, user_prompt: str) -> str:
        return self._call_gemini(system_instruction, user_prompt)


class GroqProvider(AIProvider):
    """Groq AI Provider."""

    def __init__(self):
        api_key = getattr(settings, "GROQ_API_KEY", "")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY chưa được cấu hình trong settings. "
                "Thêm GROQ_API_KEY vào file .env."
            )
        try:
            import groq

            self.client = groq.Groq(api_key=api_key)
            self.model_name = "llama-3.3-70b-versatile"
        except ImportError as exc:
            raise ImportError(
                "Thiếu thư viện groq. Chạy: pip install groq"
            ) from exc

    def _call_groq(self, system_instruction: str, user_prompt: str) -> str:
        import time

        max_retries = 1
        retry_delays = [3, 5]

        for attempt in range(max_retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4096,
                )
                return response.choices[0].message.content.strip()
            except Exception as exc:
                error_str = str(exc)
                if "429" in error_str or "rate limit" in error_str.lower():
                    if attempt < max_retries:
                        delay = retry_delays[attempt]
                        logger.warning(
                            "Groq rate limit (429). Thử lại sau %ds (lần %d/%d)...",
                            delay, attempt + 1, max_retries,
                        )
                        time.sleep(delay)
                        continue
                raise

    def _parse_json_response(self, raw_text: str) -> dict:
        import re
        match = re.search(r'(\{.*\}|\[.*\])', raw_text, re.DOTALL)
        if match:
            cleaned = match.group(1)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass
        
        logger.error("AI trả về JSON không hợp lệ: %s", raw_text[:500])
        return {}

    def generate_roadmap_json(self, user_input: str, courses_context: str) -> dict:
        prompt = (
            f"MỤC TIÊU CỦA NGƯỜI DÙNG:\n{user_input}\n\n"
            f"DANH SÁCH KHÓA HỌC CÓ SẴN:\n{courses_context}"
        )
        raw = self._call_groq(ROADMAP_SYSTEM_PROMPT, prompt)
        return self._parse_json_response(raw)

    def extract_skills_from_text(self, text: str) -> list[str]:
        system = (
            "Bạn là chuyên gia phân tích JD (Job Description). "
            "Trích xuất danh sách kỹ năng kỹ thuật từ đoạn text. "
            "BẮT BUỘC trả về JSON array: [\"skill1\", \"skill2\", ...]"
        )
        raw = self._call_groq(system, text)
        parsed = self._parse_json_response(raw)
        if isinstance(parsed, list):
            return parsed
        return parsed.get("skills", [])

    def generate_text(self, system_instruction: str, user_prompt: str) -> str:
        return self._call_groq(system_instruction, user_prompt)


class FallbackProvider(AIProvider):
    """Fallback khi không có AI API key — dùng TF-IDF hiện tại."""

    def generate_roadmap_json(self, user_input: str, courses_context: str) -> dict:
        from .services import rank_courses_by_text

        ranked = rank_courses_by_text(user_input, top_k=6)
        steps = []
        phase_names = [
            "Khởi đầu — Nền tảng cơ bản",
            "Xây dựng — Kỹ năng cốt lõi",
            "Thực hành — Áp dụng thực tế",
            "Nâng cao — Chuyên sâu hóa",
            "Dự án — Xây dựng portfolio",
            "Hoàn thiện — Sẵn sàng ứng tuyển",
        ]
        for idx, item in enumerate(ranked):
            course = item["course"]
            steps.append(
                {
                    "order": idx + 1,
                    "phase_name": phase_names[idx] if idx < len(phase_names) else f"Giai đoạn {idx + 1}",
                    "description": f"Học khóa: {course.title}",
                    "skills": item.get("matched_terms", []),
                    "course_id": course.id,
                }
            )

        return {
            "title": f"Lộ trình học tập — {user_input[:60]}",
            "target_role": user_input[:100],
            "extracted_skills": list(
                {term for item in ranked for term in item.get("matched_terms", [])}
            ),
            "steps": steps,
        }

    def extract_skills_from_text(self, text: str) -> list[str]:
        from .preprocessing import tokenize_text

        return tokenize_text(text)[:20]

    def generate_text(self, system_instruction: str, user_prompt: str) -> str:
        return "Tính năng so sánh tóm tắt đang tạm bảo trì do thiếu API key."


def get_ai_provider() -> AIProvider:
    """Factory — trả về provider phù hợp dựa trên settings."""
    groq_api_key = getattr(settings, "GROQ_API_KEY", "")
    if groq_api_key:
        try:
            return GroqProvider()
        except (ImportError, ValueError) as exc:
            logger.warning("Không thể khởi tạo GroqProvider: %s", exc)

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if api_key:
        try:
            return GeminiProvider()
        except (ImportError, ValueError) as exc:
            logger.warning("Không thể khởi tạo GeminiProvider: %s. Dùng fallback.", exc)

    logger.info("Sử dụng FallbackProvider (TF-IDF, không có AI API key).")
    return FallbackProvider()


def build_courses_context(max_courses: int = 50) -> str:
    """Tạo chuỗi context từ danh sách khóa học để gửi cho AI."""
    courses = Course.objects.filter(is_active=True).order_by("title")[:max_courses]
    items = []
    for course in courses:
        items.append(
            f"ID={course.id} | {course.title} | {course.provider} | "
            f"Code={course.course_code or 'N/A'}"
        )
    return "\n".join(items)


def build_courses_context_from_ranked(ranked_courses: list[dict], max_courses: int = 12) -> str:
    """Tao context chi tu candidate list da duoc ML/hybrid chon truoc."""
    selected_items = ranked_courses[:max_courses]
    allowed_ids = ", ".join(str(item["course"].id) for item in selected_items)
    items = [
        f"ALLOWED_COURSE_IDS: [{allowed_ids}]",
        "Moi step bat buoc phai dung course_id nam trong ALLOWED_COURSE_IDS.",
    ]

    for item in selected_items:
        course = item["course"]
        tags = list(course.tags.all()[:5])
        tag_names = ", ".join(tag.name for tag in tags)
        items.append(
            f"ID={course.id} | {course.title} | {course.provider} | "
            f"Code={course.course_code or 'N/A'} | "
            f"Difficulty={course.difficulty_level or 'N/A'} | "
            f"Price={course.price_type or 'N/A'} | "
            f"Certificate={course.certificate_type or 'N/A'} | "
            f"Ranker={item.get('ranker', 'hybrid')} | "
            f"Score={item.get('score', 0)} | "
            f"Tags={tag_names or 'N/A'}"
        )

    return "\n".join(items)
