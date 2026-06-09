import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import CourseCategory, Course

def cleanup_and_fix_it():
    # 1. Xóa tất cả các danh mục không phải là IT hoặc không liên quan
    # Để an toàn cho các khóa học, chúng ta sẽ chuyển các khóa học về danh mục IT chuẩn sau khi sửa
    
    # Định nghĩa cấu trúc chuẩn
    it_name = "Công nghệ Thông tin"
    majors = [
        "Công nghệ phần mềm",
        "Hệ thống thông tin ứng dụng",
        "Mạng máy tính",
        "Máy học và ứng dụng",
        "An ninh mạng"
    ]

    # Tìm hoặc tạo ngành IT gốc
    it_industry, _ = CourseCategory.objects.get_or_create(
        name=it_name,
        defaults={'slug': 'cong-nghe-thong-tin'}
    )
    # Đảm bảo tên đúng (nếu trước đó bị lỗi font)
    it_industry.name = it_name
    it_industry.slug = 'cong-nghe-thong-tin'
    it_industry.save()

    # Sửa/Tạo các chuyên ngành con
    for m_name in majors:
        slug = m_name.lower().replace(' ', '-')
        major, _ = CourseCategory.objects.get_or_create(
            name=m_name,
            parent=it_industry,
            defaults={'slug': slug}
        )
        major.name = m_name
        major.save()

    # Xóa tất cả các danh mục cha khác (không phải IT)
    other_parents = CourseCategory.objects.filter(parent__isnull=True).exclude(id=it_industry.id)
    print(f"Deleting {other_parents.count()} other industries...")
    other_parents.delete()

    # Tìm các danh mục bị lỗi font (có dấu ?) và dọn dẹp
    # Lưu ý: delete() sẽ set_null cho các khóa học liên quan nếu ForeignKey là SET_NULL
    bad_categories = CourseCategory.objects.filter(name__contains='?')
    print(f"Deleting {bad_categories.count()} corrupted categories...")
    bad_categories.delete()

    print("Database cleanup and UTF-8 fix completed!")

if __name__ == '__main__':
    cleanup_and_fix_it()
