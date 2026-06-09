from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0012_communitypost_image"),
    ]

    operations = [
        migrations.CreateModel(
            name="PostComment",
            fields=[
                ("id", models.BigAutoField(db_column="MaBinhLuanBaiViet", primary_key=True, serialize=False)),
                ("content", models.TextField(db_column="NoiDung", verbose_name="Noi dung")),
                ("is_active", models.BooleanField(db_column="TrangThai", default=True, verbose_name="Hien thi")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngay tao")),
                ("updated_at", models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngay cap nhat")),
                (
                    "post",
                    models.ForeignKey(
                        db_column="MaBaiViet",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="api.communitypost",
                        verbose_name="Bai viet",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        db_column="MaNguoiDung",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="post_comments",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Nguoi tra loi",
                    ),
                ),
            ],
            options={
                "verbose_name": "Tra loi bai viet",
                "verbose_name_plural": "Tra loi bai viet",
                "db_table": "BinhLuanBaiViet",
                "ordering": ["created_at"],
            },
        ),
    ]
