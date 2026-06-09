import os
import django
import re
from django.utils.text import slugify

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CourseCategory

def seed():
    industries = [
        ('Kinh tế', ['Quản trị kinh doanh', 'Tài chính ngân hàng', 'Marketing', 'Kế toán']),
        ('Ngoại ngữ', ['Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung']),
        ('Thiết kế', ['Thiết kế đồ họa', 'Thiết kế nội thất', 'UI/UX Design']),
    ]

    for ind_name, majors in industries:
        ind_slug = slugify(ind_name) or re.sub(r'\W+', '-', ind_name.lower())
        ind, created = CourseCategory.objects.get_or_create(
            name=ind_name, 
            defaults={'slug': ind_slug}
        )
        if created:
            print(f"Created industry: {ind_name}")
        for major_name in majors:
            major_slug = slugify(major_name) or re.sub(r'\W+', '-', major_name.lower())
            major, m_created = CourseCategory.objects.get_or_create(
                name=major_name, 
                parent=ind,
                defaults={'slug': f"{ind_slug}-{major_slug}"}
            )
            if m_created:
                print(f"  Created major: {major_name}")

if __name__ == '__main__':
    seed()
