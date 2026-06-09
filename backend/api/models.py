from django.conf import settings
from django.db import models


class CourseCategory(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="MaDanhMuc")
    name = models.CharField(max_length=120, unique=True, db_column="TenDanhMuc", verbose_name="Tên danh mục")
    slug = models.SlugField(max_length=140, unique=True, db_column="Slug", verbose_name="Slug")
    description = models.TextField(blank=True, db_column="MoTa", verbose_name="Mô tả")
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        db_column="MaDanhMucCha",
        verbose_name="Danh mục cha",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        ordering = ["name"]
        verbose_name = "Danh mục khóa học"
        verbose_name_plural = "Danh mục khóa học"
        db_table = "DanhMucKhoaHoc"

    def __str__(self):
        return self.name


class CourseTag(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="MaTag")
    name = models.CharField(max_length=120, unique=True, db_column="TenTag", verbose_name="Tên tag")
    slug = models.SlugField(max_length=140, unique=True, db_column="Slug", verbose_name="Slug")
    description = models.TextField(blank=True, db_column="MoTa", verbose_name="Mô tả")
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        ordering = ["name"]
        verbose_name = "Tag khóa học"
        verbose_name_plural = "Tag khóa học"
        db_table = "TagKhoaHoc"

    def __str__(self):
        return self.name


class Course(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="MaKhoaHoc")
    title = models.CharField(max_length=255, db_column="TieuDe", verbose_name="Tên khóa học")
    course_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_column="MaMon",
        verbose_name="Mã môn",
    )
    provider = models.CharField(max_length=120, db_column="DonViToChuc", verbose_name="Tổ chức")
    course_url = models.URLField(unique=True, db_column="UrlKhoaHoc", verbose_name="Link khóa học")
    normalized_title = models.CharField(
        max_length=255,
        blank=True,
        db_column="TieuDeChuanHoa",
        verbose_name="Tên khóa học đã chuẩn hóa",
    )
    search_document = models.TextField(blank=True, db_column="VanBanTimKiem", verbose_name="Văn bản tìm kiếm")
    tokenized_text = models.TextField(blank=True, db_column="TokenDaXuLy", verbose_name="Tokens đã xử lý")
    source_row = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_column="DongNguon",
        verbose_name="Dòng nguồn",
    )
    difficulty_level = models.CharField(
        max_length=20,
        blank=True,
        db_column="DoKho",
        verbose_name="Độ khó",
    )
    estimated_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_column="SoGio",
        verbose_name="Số giờ ước tính",
    )
    price_type = models.CharField(
        max_length=20,
        default="free",
        db_column="LoaiGia",
        verbose_name="Loại giá",
    )
    certificate_type = models.CharField(
        max_length=50,
        blank=True,
        db_column="LoaiChungChi",
        verbose_name="Loại chứng chỉ",
    )
    category = models.ForeignKey(
        CourseCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="courses",
        db_column="MaDanhMuc",
        verbose_name="Danh mục",
    )
    tags = models.ManyToManyField(
        CourseTag,
        blank=True,
        related_name="courses",
        db_table="KhoaHoc_Tag",
        verbose_name="Tags",
    )
    is_active = models.BooleanField(default=True, db_column="TrangThai", verbose_name="Kích hoạt")
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        ordering = ["title"]
        verbose_name = "Khóa học"
        verbose_name_plural = "Khóa học"
        db_table = "KhoaHoc"

    def __str__(self):
        return f"{self.course_code or 'NO-CODE'} - {self.title}"


class UserProfile(models.Model):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

    SKILL_LEVEL_CHOICES = [
        (BEGINNER, "Beginner"),
        (INTERMEDIATE, "Intermediate"),
        (ADVANCED, "Advanced"),
    ]

    id = models.BigAutoField(primary_key=True, db_column="MaHoSo")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        db_column="MaNguoiDung",
        verbose_name="Người dùng",
    )
    skill_level = models.CharField(
        max_length=20,
        choices=SKILL_LEVEL_CHOICES,
        blank=True,
        db_column="TrinhDo",
        verbose_name="Trình độ",
    )
    learning_goal = models.TextField(blank=True, db_column="MucTieuHocTap", verbose_name="Mục tiêu học tập")
    interests = models.TextField(blank=True, db_column="LinhVucQuanTam", verbose_name="Lĩnh vực quan tâm")
    learning_needs = models.TextField(blank=True, db_column="NhuCauHocTap", verbose_name="Nhu cầu học tập")
    onboarding_completed = models.BooleanField(
        default=False,
        db_column="DaHoanThanhOnboarding",
        verbose_name="Đã hoàn thành onboarding",
    )
    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
        db_column="AnhDaiDien",
        verbose_name="Ảnh đại diện",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        verbose_name = "Hồ sơ người dùng"
        verbose_name_plural = "Hồ sơ người dùng"
        db_table = "HoSoNguoiHoc"

    def __str__(self):
        return f"Profile<{self.user.username}>"


class SearchHistory(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="MaLichSu")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="search_histories",
        db_column="MaNguoiDung",
        verbose_name="Người dùng",
    )
    query_text = models.CharField(max_length=500, db_column="TuKhoaTimKiem", verbose_name="Từ khóa tìm kiếm")
    created_at = models.DateTimeField(auto_now_add=True, db_column="ThoiDiemTimKiem", verbose_name="Thời điểm tìm kiếm")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Lịch sử tìm kiếm"
        verbose_name_plural = "Lịch sử tìm kiếm"
        db_table = "LichSuTimKiem"

    def __str__(self):
        return f"{self.user.username} - {self.query_text}"


class SavedCourse(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="MaLuu")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_courses",
        db_column="MaNguoiDung",
        verbose_name="Người dùng",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="saved_by_users",
        db_column="MaKhoaHoc",
        verbose_name="Khóa học",
    )
    saved_at = models.DateTimeField(auto_now_add=True, db_column="NgayLuu", verbose_name="Ngày lưu")

    class Meta:
        verbose_name = "Khóa học đã lưu"
        verbose_name_plural = "Khóa học đã lưu"
        db_table = "KhoaHocDaLuu"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "course"],
                name="UQ_KhoaHocDaLuu_MaNguoiDung_MaKhoaHoc",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"


class Roadmap(models.Model):
    """Lưu trữ lộ trình AI đã tạo cho từng user."""

    id = models.BigAutoField(primary_key=True, db_column="MaLoTrinh")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="roadmaps",
        db_column="MaNguoiDung",
        verbose_name="Người dùng",
    )
    title = models.CharField(max_length=255, db_column="TieuDe", verbose_name="Tiêu đề lộ trình")
    input_text = models.TextField(db_column="VanBanDauVao", verbose_name="Văn bản đầu vào")
    target_role = models.CharField(
        max_length=255,
        blank=True,
        db_column="ViTriMucTieu",
        verbose_name="Vị trí mục tiêu",
    )
    extracted_skills = models.TextField(
        blank=True,
        db_column="KyNangTrichXuat",
        verbose_name="Kỹ năng trích xuất (JSON)",
    )
    roadmap_data = models.TextField(
        blank=True,
        db_column="DuLieuLoTrinh",
        verbose_name="Dữ liệu lộ trình (JSON)",
    )
    is_active = models.BooleanField(default=True, db_column="TrangThai", verbose_name="Kích hoạt")
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Lộ trình học tập"
        verbose_name_plural = "Lộ trình học tập"
        db_table = "LoTrinh"

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class RoadmapStep(models.Model):
    """Từng bước trong lộ trình."""

    id = models.BigAutoField(primary_key=True, db_column="MaBuoc")
    roadmap = models.ForeignKey(
        Roadmap,
        on_delete=models.CASCADE,
        related_name="steps",
        db_column="MaLoTrinh",
        verbose_name="Lộ trình",
    )
    order = models.PositiveIntegerField(db_column="ThuTu", verbose_name="Thứ tự")
    phase_name = models.CharField(max_length=255, db_column="TenGiaiDoan", verbose_name="Tên giai đoạn")
    description = models.TextField(blank=True, db_column="MoTa", verbose_name="Mô tả")
    skills = models.TextField(blank=True, db_column="KyNang", verbose_name="Kỹ năng (JSON)")
    is_completed = models.BooleanField(default=False, db_column="DaHoanThanh", verbose_name="Đã hoàn thành")
    course = models.ForeignKey(
        Course,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="roadmap_steps",
        db_column="MaKhoaHoc",
        verbose_name="Khóa học gợi ý",
    )

    class Meta:
        ordering = ["order"]
        verbose_name = "Bước lộ trình"
        verbose_name_plural = "Bước lộ trình"
        db_table = "BuocLoTrinh"

    def __str__(self):
        return f"Step {self.order}: {self.phase_name}"


class CourseReview(models.Model):
    """Đánh giá khóa học từ sinh viên."""

    id = models.BigAutoField(primary_key=True, db_column="MaDanhGia")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        db_column="MaNguoiDung",
        verbose_name="Người đánh giá",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="reviews",
        db_column="MaKhoaHoc",
        verbose_name="Khóa học",
    )
    rating = models.PositiveSmallIntegerField(
        db_column="DiemDanhGia",
        verbose_name="Điểm đánh giá (1-5)",
    )
    comment = models.TextField(
        blank=True,
        db_column="NhanXet",
        verbose_name="Nhận xét",
    )
    is_active = models.BooleanField(default=True, db_column="TrangThai", verbose_name="Hiển thị")
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Đánh giá khóa học"
        verbose_name_plural = "Đánh giá khóa học"
        db_table = "DanhGiaKhoaHoc"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "course"],
                name="UQ_DanhGia_MaNguoiDung_MaKhoaHoc",
            )
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.course.title} ({self.rating}*)"


class ReviewVote(models.Model):
    """Upvote/Downvote cho đánh giá."""

    UPVOTE = "up"
    DOWNVOTE = "down"
    VOTE_CHOICES = [(UPVOTE, "Upvote"), (DOWNVOTE, "Downvote")]

    id = models.BigAutoField(primary_key=True, db_column="MaVote")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="review_votes",
        db_column="MaNguoiDung",
        verbose_name="Người vote",
    )
    review = models.ForeignKey(
        CourseReview,
        on_delete=models.CASCADE,
        related_name="votes",
        db_column="MaDanhGia",
        verbose_name="Đánh giá",
    )
    vote_type = models.CharField(
        max_length=4,
        choices=VOTE_CHOICES,
        db_column="LoaiVote",
        verbose_name="Loại vote",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")

    class Meta:
        verbose_name = "Vote đánh giá"
        verbose_name_plural = "Vote đánh giá"
        db_table = "VoteDanhGia"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "review"],
                name="UQ_Vote_MaNguoiDung_MaDanhGia",
            )
        ]

    def __str__(self):
        return f"{self.user.username} {self.vote_type} review#{self.review_id}"


class CommunityPost(models.Model):
    """Bài viết cộng đồng từ sinh viên."""

    id = models.BigAutoField(primary_key=True, db_column="MaBaiViet")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_posts",
        db_column="MaNguoiDung",
        verbose_name="Người đăng",
    )
    course = models.ForeignKey(
        Course,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="community_posts",
        db_column="MaKhoaHoc",
        verbose_name="Khóa học (tùy chọn)",
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        db_column="TieuDe",
        verbose_name="Tiêu đề",
    )
    content = models.TextField(
        db_column="NoiDung",
        verbose_name="Nội dung",
    )
    image = models.ImageField(
        upload_to="posts/",
        null=True,
        blank=True,
        db_column="AnhBaiViet",
        verbose_name="Ảnh bài viết",
    )
    is_active = models.BooleanField(default=True, db_column="TrangThai", verbose_name="Hiển thị")
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngày cập nhật")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Bài viết cộng đồng"
        verbose_name_plural = "Bài viết cộng đồng"
        db_table = "BaiVietCongDong"

    def __str__(self):
        return f"Post#{self.id} by {self.user.username}"


class PostVote(models.Model):
    """Upvote/Downvote cho bài viết."""

    UPVOTE = "up"
    DOWNVOTE = "down"
    VOTE_CHOICES = [(UPVOTE, "Upvote"), (DOWNVOTE, "Downvote")]

    id = models.BigAutoField(primary_key=True, db_column="MaVoteBaiViet")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="post_votes",
        db_column="MaNguoiDung",
        verbose_name="Người vote",
    )
    post = models.ForeignKey(
        CommunityPost,
        on_delete=models.CASCADE,
        related_name="votes",
        db_column="MaBaiViet",
        verbose_name="Bài viết",
    )
    vote_type = models.CharField(
        max_length=4,
        choices=VOTE_CHOICES,
        db_column="LoaiVote",
        verbose_name="Loại vote",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngày tạo")

    class Meta:
        verbose_name = "Vote bài viết"
        verbose_name_plural = "Vote bài viết"
        db_table = "VoteBaiViet"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "post"],
                name="UQ_Vote_MaNguoiDung_MaBaiViet",
            )
        ]

    def __str__(self):
        return f"{self.user.username} {self.vote_type} post#{self.post_id}"


class PostComment(models.Model):
    """Binh luan/tra loi cho bai viet cong dong."""

    id = models.BigAutoField(primary_key=True, db_column="MaBinhLuanBaiViet")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="post_comments",
        db_column="MaNguoiDung",
        verbose_name="Nguoi tra loi",
    )
    post = models.ForeignKey(
        CommunityPost,
        on_delete=models.CASCADE,
        related_name="comments",
        db_column="MaBaiViet",
        verbose_name="Bai viet",
    )
    content = models.TextField(
        db_column="NoiDung",
        verbose_name="Noi dung",
    )
    is_active = models.BooleanField(default=True, db_column="TrangThai", verbose_name="Hien thi")
    created_at = models.DateTimeField(auto_now_add=True, db_column="NgayTao", verbose_name="Ngay tao")
    updated_at = models.DateTimeField(auto_now=True, db_column="NgayCapNhat", verbose_name="Ngay cap nhat")

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Tra loi bai viet"
        verbose_name_plural = "Tra loi bai viet"
        db_table = "BinhLuanBaiViet"

    def __str__(self):
        return f"Comment#{self.id} on post#{self.post_id} by {self.user.username}"


class RecommendationLog(models.Model):
    """Nhật ký gợi ý AI — Ghi lại mỗi lần hệ thống trả kết quả gợi ý cho user."""

    CONTEXT_DASHBOARD = "dashboard"
    CONTEXT_SEARCH = "search"
    CONTEXT_CHOICES = [
        (CONTEXT_DASHBOARD, "Dashboard"),
        (CONTEXT_SEARCH, "Tìm kiếm"),
    ]

    id = models.BigAutoField(primary_key=True, db_column="MaLog")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recommendation_logs",
        db_column="MaNguoiDung",
        verbose_name="Người dùng",
    )
    context = models.CharField(
        max_length=20,
        choices=CONTEXT_CHOICES,
        db_column="NguCanh",
        verbose_name="Ngữ cảnh",
    )
    query_text = models.TextField(
        blank=True,
        db_column="VanBanTruyVan",
        verbose_name="Văn bản truy vấn",
    )
    recommended_course_ids = models.TextField(
        db_column="DanhSachMaKhoaHoc",
        verbose_name="Danh sách ID khóa học gợi ý (JSON)",
        help_text="JSON array of course IDs",
    )
    score_avg = models.FloatField(
        null=True,
        blank=True,
        db_column="DiemTrungBinh",
        verbose_name="Điểm tin cậy trung bình",
    )
    result_count = models.IntegerField(
        default=0,
        db_column="SoKetQua",
        verbose_name="Số kết quả",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_column="NgayTao",
        verbose_name="Thời gian",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Log gợi ý AI"
        verbose_name_plural = "Log gợi ý AI"
        db_table = "LogGoiY"

    def __str__(self):
        return f"Log #{self.id} — {self.user.username} ({self.context}) @ {self.created_at}"
