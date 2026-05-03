"""
JD Parser — Phân tích Job Description từ URL hoặc text.
"""

import logging
import re

logger = logging.getLogger(__name__)


def fetch_text_from_url(url: str) -> str:
    """Cào nội dung text từ URL tuyển dụng."""
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError as exc:
        raise ImportError(
            "Thiếu thư viện requests hoặc beautifulsoup4. "
            "Chạy: pip install requests beautifulsoup4"
        ) from exc

    try:
        response = requests.get(url, timeout=10, headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        })
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error("Không thể truy cập URL %s: %s", url, exc)
        return ""

    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "nav", "header", "footer"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text[:5000]


def is_url(text: str) -> bool:
    """Kiểm tra xem text có phải URL không."""
    return bool(re.match(r"https?://", text.strip()))


def parse_input(raw_input: str) -> dict:
    """
    Xử lý input từ user:
    - Nếu là URL → cào nội dung
    - Nếu là text → trả về trực tiếp

    Returns:
        {"input_type": "url"|"text", "content": str, "original_url": str|None}
    """
    cleaned = raw_input.strip()

    if is_url(cleaned):
        content = fetch_text_from_url(cleaned)
        if not content:
            return {
                "input_type": "url",
                "content": cleaned,
                "original_url": cleaned,
                "error": "Không thể trích xuất nội dung từ URL.",
            }
        return {
            "input_type": "url",
            "content": content,
            "original_url": cleaned,
        }

    return {
        "input_type": "text",
        "content": cleaned,
        "original_url": None,
    }
