import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.models import Course, CourseCategory

def seed_courses():
    # Danh sách khóa học theo chuyên ngành
    data = {
        "Công nghệ phần mềm": [
            ("Lập trình Java căn bản", "JV101", "Coursera", "https://coursera.org/java-basics"),
            ("Design Patterns trong phát triển phần mềm", "DP202", "Udemy", "https://udemy.com/design-patterns"),
            ("Kiểm thử phần mềm nâng cao", "ST303", "edX", "https://edx.org/software-testing"),
        ],
        "An ninh mạng": [
            ("Nhập môn An toàn thông tin", "SEC101", "Cisco Networking Academy", "https://netacad.com/intro-security"),
            ("Ethical Hacking: Từ cơ bản đến nâng cao", "EH202", "Cybrary", "https://cybrary.it/ethical-hacking"),
            ("Bảo mật mạng không dây", "WSEC303", "Offensive Security", "https://offsec.com/wireless"),
        ],
        "Máy học và ứng dụng": [
            ("Python cho Khoa học dữ liệu", "DS101", "IBM", "https://ibm.com/python-ds"),
            ("Machine Learning căn bản", "ML202", "Stanford Online", "https://stanford.edu/ml-intro"),
            ("Xây dựng Chatbot với AI", "AI303", "Google Cloud", "https://cloud.google.com/training/ai"),
        ],
        "Mạng máy tính": [
            ("Quản trị mạng Cisco CCNA", "CCNA200", "Cisco", "https://netacad.com/ccna"),
            ("Giao thức TCP/IP chuyên sâu", "TCP404", "LinkedIn Learning", "https://linkedin.com/learning/tcp-ip"),
            ("Triển khai hạ tầng Cloud AWS", "AWS505", "Amazon Web Services", "https://aws.amazon.com/training"),
        ],
        "Hệ thống thông tin ứng dụng": [
            ("Phân tích và thiết kế hệ thống", "SA101", "MIT OpenCourseWare", "https://ocw.mit.edu/sys-analysis"),
            ("Quản trị cơ sở dữ liệu SQL Server", "SQL202", "Microsoft Learn", "https://learn.microsoft.com/sql-admin"),
            ("Hệ thống thông tin doanh nghiệp (ERP)", "ERP303", "SAP Training", "https://training.sap.com/erp"),
        ]
    }

    for major_name, courses in data.items():
        try:
            major = CourseCategory.objects.get(name=major_name)
            for title, code, provider, url in courses:
                course, created = Course.objects.get_or_create(
                    course_url=url,
                    defaults={
                        'title': title,
                        'course_code': code,
                        'provider': provider,
                        'category': major,
                        'difficulty_level': 'Beginner',
                        'price_type': 'free',
                        'is_active': True
                    }
                )
                if created:
                    pass
                else:
                    # Cập nhật category nếu khóa học đã tồn tại
                    course.category = major
                    course.save()
        except CourseCategory.DoesNotExist:
            pass

if __name__ == '__main__':
    seed_courses()
