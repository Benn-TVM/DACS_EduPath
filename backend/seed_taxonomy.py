"""
Seed script: Tạo danh mục và tag mẫu, gán vào các khóa học hiện có.
Chạy: .\venv\Scripts\python.exe seed_taxonomy.py
"""

import os
import sys
import django

sys.stdout.reconfigure(encoding="utf-8")
os.environ["DJANGO_SETTINGS_MODULE"] = "server.settings"
django.setup()

from django.utils.text import slugify
from api.models import Course, CourseCategory, CourseTag


# ── Danh mục ────────────────────────────────────────────────
CATEGORIES = [
    {
        "name": "Khoa học Máy tính & Thuật toán",
        "description": "Bao gồm cấu trúc dữ liệu, thuật toán, toán rời rạc và các nền tảng lý thuyết của khoa học máy tính.",
        "keywords": [
            "thuật toán", "cấu trúc dữ liệu", "toán rời rạc", "discrete",
            "data structures", "algorithm", "optimization", "tối ưu",
            "tính toán", "scientific computing", "mathematical",
        ],
    },
    {
        "name": "Trí tuệ Nhân tạo & Học máy",
        "description": "Các khóa học về AI, machine learning, deep learning, NLP, thị giác máy tính và mô hình ngôn ngữ lớn.",
        "keywords": [
            "trí tuệ nhân tạo", "artificial intelligence", "machine learning",
            "học máy", "deep learning", "học sâu", "nlp", "ngôn ngữ tự nhiên",
            "thị giác máy tính", "computer vision", "llm", "mô hình ngôn ngữ",
            "tạo sinh", "generative", "prompt", "hệ gợi ý", "recommendation",
            "tính toán tiến hóa",
        ],
    },
    {
        "name": "Khoa học Dữ liệu & Big Data",
        "description": "Phân tích dữ liệu, khai phá dữ liệu, trực quan hóa, business analytics và xử lý dữ liệu lớn.",
        "keywords": [
            "data science", "khoa học dữ liệu", "big data", "dữ liệu lớn",
            "khai phá", "mining", "trực quan", "visualization",
            "business analytics", "kinh doanh thông minh", "tích hợp dữ liệu",
            "quản trị dữ liệu", "truy vấn", "tin sinh",
        ],
    },
    {
        "name": "Phát triển Phần mềm",
        "description": "Kỹ thuật phần mềm, lập trình hướng đối tượng, quy trình phát triển và quản trị dự án.",
        "keywords": [
            "phần mềm", "software", "lập trình hướng đối tượng", "oop",
            "quản trị dự án", "quản trị phát triển", "nghiệp vụ",
            "kỹ thuật lập trình", "compiler", "chương trình dịch",
        ],
    },
    {
        "name": "Phát triển Web & Di động",
        "description": "Công nghệ web, thiết kế giao diện, framework frontend/backend và lập trình ứng dụng di động.",
        "keywords": [
            "web", "next.js", "php", "laravel", "ruby", "rails",
            "mobile", "di động", "đa nền tảng", "giao diện",
            "e-services", "UI", "UX",
        ],
    },
    {
        "name": "An toàn Thông tin & Mạng",
        "description": "An ninh mạng, bảo mật, mã hóa, phân tích mã độc và phòng chống tấn công.",
        "keywords": [
            "an toàn", "an ninh", "security", "mã hóa", "mật mã",
            "mã độc", "forensic", "tấn công", "nhận thức",
        ],
    },
    {
        "name": "Mạng & Hệ phân tán",
        "description": "Mạng máy tính, thiết kế mạng, hệ phân tán, truyền thông và IoT.",
        "keywords": [
            "mạng", "network", "phân tán", "distributed", "truyền thông",
            "iot", "internet", "ip network",
        ],
    },
    {
        "name": "Hệ thống & Phần cứng",
        "description": "Kiến trúc máy tính, hệ nhúng, xử lý tín hiệu, Linux và cơ sở hạ tầng.",
        "keywords": [
            "kiến trúc máy tính", "computer architecture", "nhúng", "embedded",
            "tín hiệu", "signal", "linux", "điện tử", "multimedia",
            "đồ họa", "đa phương tiện",
        ],
    },
    {
        "name": "Cơ sở Dữ liệu",
        "description": "Thiết kế, quản trị và tối ưu hóa cơ sở dữ liệu quan hệ và phi quan hệ.",
        "keywords": [
            "cơ sở dữ liệu", "database", "sql",
        ],
    },
    {
        "name": "Nhập môn & Đại cương",
        "description": "Các khóa học nhập môn lập trình, tin học đại cương, kỹ năng số dành cho sinh viên mới.",
        "keywords": [
            "nhập môn lập trình", "tin học đại cương", "introduction to programming",
            "kỹ năng số", "phổ cập", "python cơ bản",
            "tập huấn", "cố vấn",
        ],
    },
]


# ── Tag ─────────────────────────────────────────────────────
TAGS = [
    {"name": "Python", "description": "Ngôn ngữ lập trình Python."},
    {"name": "Machine Learning", "description": "Học máy và các thuật toán dự đoán."},
    {"name": "Deep Learning", "description": "Mạng nơ-ron sâu và ứng dụng."},
    {"name": "AI tạo sinh", "description": "Generative AI, LLM, diffusion models."},
    {"name": "Web Development", "description": "Phát triển ứng dụng web fullstack."},
    {"name": "Bảo mật", "description": "An toàn thông tin và an ninh mạng."},
    {"name": "Cơ sở dữ liệu", "description": "Database, SQL và quản trị CSDL."},
    {"name": "IoT", "description": "Internet of Things và hệ thống nhúng."},
    {"name": "Data Science", "description": "Phân tích dữ liệu và khoa học dữ liệu."},
    {"name": "Big Data", "description": "Lưu trữ và xử lý dữ liệu lớn."},
    {"name": "Thuật toán", "description": "Thiết kế và phân tích thuật toán."},
    {"name": "Mobile", "description": "Lập trình ứng dụng di động."},
    {"name": "DevOps / MLOps", "description": "Vận hành, triển khai hệ thống và ML pipeline."},
    {"name": "NLP", "description": "Xử lý ngôn ngữ tự nhiên."},
    {"name": "Computer Vision", "description": "Thị giác máy tính và xử lý ảnh."},
    {"name": "Mạng máy tính", "description": "Network, routing và thiết kế mạng."},
    {"name": "Toán ứng dụng", "description": "Toán rời rạc, xác suất, tối ưu hóa."},
    {"name": "Nhập môn", "description": "Khóa học cơ bản dành cho người mới bắt đầu."},
    {"name": "Hệ phân tán", "description": "Distributed systems và microservices."},
    {"name": "Phần mềm", "description": "Kỹ thuật và công nghệ phần mềm."},
]

# ── Tag mapping: gán tag cho khóa học dựa vào keyword ───────
TAG_KEYWORDS = {
    "Python": ["python"],
    "Machine Learning": ["machine learning", "học máy", "statistical machine"],
    "Deep Learning": ["deep learning", "học sâu"],
    "AI tạo sinh": ["tạo sinh", "generative", "llm", "mô hình ngôn ngữ", "prompt"],
    "Web Development": ["web", "next.js", "php", "laravel", "ruby", "rails", "e-services"],
    "Bảo mật": ["an toàn", "an ninh", "security", "mã hóa", "mật mã", "mã độc", "forensic", "tấn công"],
    "Cơ sở dữ liệu": ["cơ sở dữ liệu", "database", "sql", "truy vấn"],
    "IoT": ["iot"],
    "Data Science": ["data science", "khoa học dữ liệu", "khai phá", "mining", "business analytics", "kinh doanh thông minh", "tin sinh"],
    "Big Data": ["big data", "dữ liệu lớn"],
    "Thuật toán": ["thuật toán", "algorithm", "cấu trúc dữ liệu", "data structures"],
    "Mobile": ["mobile", "di động", "đa nền tảng"],
    "DevOps / MLOps": ["vận hành", "mlops"],
    "NLP": ["ngôn ngữ tự nhiên", "nlp"],
    "Computer Vision": ["thị giác máy tính", "computer vision", "xử lý ảnh"],
    "Mạng máy tính": ["mạng", "network", "ip network", "truyền thông"],
    "Toán ứng dụng": ["toán rời rạc", "discrete", "optimization", "tối ưu", "mathematical", "scientific computing"],
    "Nhập môn": ["nhập môn lập trình", "tin học đại cương", "introduction to programming", "kỹ năng số", "phổ cập", "python cơ bản"],
    "Hệ phân tán": ["phân tán", "distributed"],
    "Phần mềm": ["phần mềm", "software", "compiler", "chương trình dịch", "lập trình hướng đối tượng"],
}


def match_keywords(text: str, keywords: list[str]) -> bool:
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def run():
    # ── 1. Tạo danh mục ──
    cat_objects: dict[str, CourseCategory] = {}
    for cat_data in CATEGORIES:
        obj, created = CourseCategory.objects.get_or_create(
            name=cat_data["name"],
            defaults={
                "slug": slugify(cat_data["name"]) or "category",
                "description": cat_data["description"],
            },
        )
        cat_objects[cat_data["name"]] = obj
        status = "✅ Tạo mới" if created else "⏩ Đã có"
        print(f"  {status} danh mục: {obj.name}")

    # ── 2. Tạo tag ──
    tag_objects: dict[str, CourseTag] = {}
    for tag_data in TAGS:
        obj, created = CourseTag.objects.get_or_create(
            name=tag_data["name"],
            defaults={
                "slug": slugify(tag_data["name"]) or "tag",
                "description": tag_data["description"],
            },
        )
        tag_objects[tag_data["name"]] = obj
        status = "✅ Tạo mới" if created else "⏩ Đã có"
        print(f"  {status} tag: {obj.name}")

    # ── 3. Gán danh mục cho khóa học ──
    courses = Course.objects.all()
    cat_assigned = 0
    tag_assigned = 0

    for course in courses:
        title = course.title

        # Gán category (chỉ gán nếu chưa có)
        if course.category_id is None:
            for cat_data in CATEGORIES:
                if match_keywords(title, cat_data["keywords"]):
                    course.category = cat_objects[cat_data["name"]]
                    course.save(update_fields=["category"])
                    cat_assigned += 1
                    break

        # Gán tag
        current_tag_ids = set(course.tags.values_list("id", flat=True))
        new_tags = []
        for tag_name, keywords in TAG_KEYWORDS.items():
            if match_keywords(title, keywords):
                tag_obj = tag_objects[tag_name]
                if tag_obj.id not in current_tag_ids:
                    new_tags.append(tag_obj)

        if new_tags:
            course.tags.add(*new_tags)
            tag_assigned += len(new_tags)

    print(f"\n📊 Kết quả:")
    print(f"   Danh mục: {CourseCategory.objects.count()} mục")
    print(f"   Tag: {CourseTag.objects.count()} tag")
    print(f"   Đã gán {cat_assigned} khóa học vào danh mục")
    print(f"   Đã gán {tag_assigned} liên kết khóa-học ↔ tag")


if __name__ == "__main__":
    print("🌱 Bắt đầu tạo dữ liệu taxonomy...\n")
    run()
    print("\n🎉 Hoàn tất!")
