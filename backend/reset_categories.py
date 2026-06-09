import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CourseCategory

def force_fix():
    it_slug = 'cong-nghe-thong-tin'
    
    print("Deleting all...")
    CourseCategory.objects.all().delete()
    
    it_name = "Công nghệ Thông tin"
    it_industry = CourseCategory.objects.create(
        name=it_name,
        slug=it_slug
    )

    majors = [
        ("Công nghệ phần mềm", "cong-nghe-phan-mem"),
        ("Hệ thống thông tin ứng dụng", "he-thong-thong-tin"),
        ("Mạng máy tính", "mang-may-tinh"),
        ("Máy học và ứng dụng", "may-hoc-va-ung-dung"),
        ("An ninh mạng", "an-ninh-mang")
    ]

    for m_name, m_slug in majors:
        CourseCategory.objects.create(
            name=m_name,
            parent=it_industry,
            slug=m_slug
        )

    print("Done!")

if __name__ == '__main__':
    force_fix()
