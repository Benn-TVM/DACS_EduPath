# Generated manually for EduPath week 3-4 implementation.

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Course",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255, verbose_name="Tên khóa học")),
                ("course_code", models.CharField(blank=True, max_length=50, null=True, verbose_name="Mã môn")),
                ("provider", models.CharField(max_length=120, verbose_name="Tổ chức")),
                ("course_url", models.URLField(unique=True, verbose_name="Link khóa học")),
                (
                    "normalized_title",
                    models.CharField(blank=True, max_length=255, verbose_name="Tên khóa học đã chuẩn hóa"),
                ),
                ("search_document", models.TextField(blank=True, verbose_name="Văn bản tìm kiếm")),
                ("tokenized_text", models.TextField(blank=True, verbose_name="Tokens đã xử lý")),
                ("source_row", models.PositiveIntegerField(blank=True, null=True, verbose_name="Dòng nguồn")),
                ("is_active", models.BooleanField(default=True, verbose_name="Kích hoạt")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Ngày tạo")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Ngày cập nhật")),
            ],
            options={
                "verbose_name": "Khóa học",
                "verbose_name_plural": "Khóa học",
                "ordering": ["title"],
            },
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "skill_level",
                    models.CharField(
                        blank=True,
                        choices=[("beginner", "Beginner"), ("intermediate", "Intermediate"), ("advanced", "Advanced")],
                        max_length=20,
                        verbose_name="Trình độ",
                    ),
                ),
                ("learning_goal", models.TextField(blank=True, verbose_name="Mục tiêu học tập")),
                ("interests", models.TextField(blank=True, verbose_name="Lĩnh vực quan tâm")),
                ("learning_needs", models.TextField(blank=True, verbose_name="Nhu cầu học tập")),
                ("onboarding_completed", models.BooleanField(default=False, verbose_name="Đã hoàn thành onboarding")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Ngày tạo")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Ngày cập nhật")),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Người dùng",
                    ),
                ),
            ],
            options={
                "verbose_name": "Hồ sơ người dùng",
                "verbose_name_plural": "Hồ sơ người dùng",
            },
        ),
        migrations.DeleteModel(
            name="Product",
        ),
    ]
