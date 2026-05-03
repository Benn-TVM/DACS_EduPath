from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api.models import Course
from api.preprocessing import DEFAULT_SOURCE, clean_course_rows


class Command(BaseCommand):
    help = "Import và làm sạch dữ liệu khóa học SOICT từ file xlsx."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            default=str(DEFAULT_SOURCE),
            help="Đường dẫn tới file soict_courses.xlsx",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Xóa toàn bộ khóa học cũ trước khi import.",
        )

    def handle(self, *args, **options):
        source = Path(options["source"])
        if not source.exists():
            raise CommandError(f"Không tìm thấy file dữ liệu: {source}")

        cleaned_courses = clean_course_rows(source)
        if options["clear"]:
            deleted_count, _ = Course.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Đã xóa {deleted_count} bản ghi cũ."))

        created_count = 0
        updated_count = 0
        for course_data in cleaned_courses:
            course, created = Course.objects.update_or_create(
                course_url=course_data["course_url"],
                defaults=course_data,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Import thành công {len(cleaned_courses)} khóa học. "
                f"Tạo mới: {created_count}, cập nhật: {updated_count}."
            )
        )
