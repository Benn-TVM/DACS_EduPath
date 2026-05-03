from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer

from .models import Course, CourseCategory, CourseReview, CourseTag, ReviewVote, Roadmap, RoadmapStep, SavedCourse, SearchHistory, UserProfile

User = get_user_model()


class CourseCategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)
    tag_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CourseCategory
        fields = ["id", "name", "slug", "description", "course_count", "tag_count"]


class CourseTagSerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CourseTag
        fields = ["id", "name", "slug", "description", "course_count"]


class CourseSerializer(serializers.ModelSerializer):
    category = CourseCategorySerializer(read_only=True)
    tags = CourseTagSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "course_code",
            "provider",
            "course_url",
            "normalized_title",
            "search_document",
            "tokenized_text",
            "difficulty_level",
            "estimated_hours",
            "price_type",
            "certificate_type",
            "category",
            "tags",
            "is_active",
            "created_at",
            "updated_at",
        ]


class RankedCourseSerializer(CourseSerializer):
    score = serializers.FloatField()
    matched_terms = serializers.ListField(child=serializers.CharField())

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ["score", "matched_terms"]


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ["id", "query_text", "created_at"]


class SavedCourseSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)

    class Meta:
        model = SavedCourse
        fields = ["id", "course", "saved_at"]


class SavedCourseCreateSerializer(serializers.Serializer):
    course_id = serializers.IntegerField(
        error_messages={
            "required": "Mã khóa học là bắt buộc.",
            "invalid": "Mã khóa học phải là số nguyên.",
        }
    )


class UserProfileSerializer(serializers.ModelSerializer):
    skill_level = serializers.ChoiceField(
        choices=UserProfile.SKILL_LEVEL_CHOICES,
        required=False,
        allow_blank=True,
        error_messages={
            "invalid_choice": "Trình độ không hợp lệ. Vui lòng chọn beginner, intermediate hoặc advanced.",
        },
    )

    class Meta:
        model = UserProfile
        fields = [
            "skill_level",
            "learning_goal",
            "interests",
            "learning_needs",
            "onboarding_completed",
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "profile",
        ]

    def get_profile(self, obj):
        try:
            profile = obj.profile
        except UserProfile.DoesNotExist:
            return None
        return UserProfileSerializer(profile).data


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150,
        error_messages={
            "required": "Tên đăng nhập là bắt buộc.",
            "blank": "Tên đăng nhập không được để trống.",
            "max_length": "Tên đăng nhập không được vượt quá 150 ký tự.",
        },
    )
    email = serializers.EmailField(
        error_messages={
            "required": "Email là bắt buộc.",
            "blank": "Email không được để trống.",
            "invalid": "Email không đúng định dạng.",
        }
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "required": "Mật khẩu là bắt buộc.",
            "blank": "Mật khẩu không được để trống.",
            "min_length": "Mật khẩu phải có ít nhất 8 ký tự.",
        },
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "required": "Xác nhận mật khẩu là bắt buộc.",
            "blank": "Xác nhận mật khẩu không được để trống.",
            "min_length": "Xác nhận mật khẩu phải có ít nhất 8 ký tự.",
        },
    )
    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        error_messages={
            "max_length": "Họ không được vượt quá 150 ký tự.",
        },
    )
    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        error_messages={
            "max_length": "Tên không được vượt quá 150 ký tự.",
        },
    )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Tên đăng nhập đã tồn tại.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã tồn tại.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Mật khẩu xác nhận không khớp."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.create(user=user)
        return user


class EduPathTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD
    default_error_messages = {
        "no_active_account": "Tên đăng nhập hoặc mật khẩu không chính xác.",
    }

    username = serializers.CharField(
        error_messages={
            "required": "Tên đăng nhập là bắt buộc.",
            "blank": "Tên đăng nhập không được để trống.",
        }
    )
    password = serializers.CharField(
        write_only=True,
        error_messages={
            "required": "Mật khẩu là bắt buộc.",
            "blank": "Mật khẩu không được để trống.",
        },
    )

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class EduPathTokenRefreshSerializer(TokenRefreshSerializer):
    refresh = serializers.CharField(
        error_messages={
            "required": "Mã làm mới phiên là bắt buộc.",
            "blank": "Mã làm mới phiên không được để trống.",
        }
    )

    default_error_messages = {
        "no_active_account": "Không tìm thấy tài khoản hợp lệ.",
    }


class RoadmapStepSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    skills = serializers.SerializerMethodField()

    class Meta:
        model = RoadmapStep
        fields = [
            "id",
            "order",
            "phase_name",
            "description",
            "skills",
            "is_completed",
            "course",
        ]

    def get_skills(self, obj):
        import json

        if not obj.skills:
            return []
        try:
            return json.loads(obj.skills)
        except (json.JSONDecodeError, TypeError):
            return [s.strip() for s in obj.skills.split(",") if s.strip()]


class RoadmapSerializer(serializers.ModelSerializer):
    steps = RoadmapStepSerializer(many=True, read_only=True)
    extracted_skills = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = [
            "id",
            "title",
            "input_text",
            "target_role",
            "extracted_skills",
            "steps",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_extracted_skills(self, obj):
        import json

        if not obj.extracted_skills:
            return []
        try:
            return json.loads(obj.extracted_skills)
        except (json.JSONDecodeError, TypeError):
            return [s.strip() for s in obj.extracted_skills.split(",") if s.strip()]


class RoadmapListSerializer(serializers.ModelSerializer):
    step_count = serializers.IntegerField(source="steps.count", read_only=True)
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = [
            "id",
            "title",
            "target_role",
            "step_count",
            "completed_count",
            "is_active",
            "created_at",
        ]

    def get_completed_count(self, obj):
        return obj.steps.filter(is_completed=True).count()


class GenerateRoadmapInputSerializer(serializers.Serializer):
    input_text = serializers.CharField(
        max_length=5000,
        error_messages={
            "required": "Vui lòng nhập mục tiêu hoặc dán link JD.",
            "blank": "Nội dung không được để trống.",
            "max_length": "Nội dung không được vượt quá 5000 ký tự.",
        },
    )


class CourseReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()
    course_title = serializers.CharField(source="course.title", read_only=True)
    upvotes = serializers.SerializerMethodField()
    downvotes = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = CourseReview
        fields = [
            "id",
            "user",
            "username",
            "full_name",
            "course",
            "course_title",
            "rating",
            "comment",
            "upvotes",
            "downvotes",
            "user_vote",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_upvotes(self, obj):
        return obj.votes.filter(vote_type=ReviewVote.UPVOTE).count()

    def get_downvotes(self, obj):
        return obj.votes.filter(vote_type=ReviewVote.DOWNVOTE).count()

    def get_user_vote(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        vote = obj.votes.filter(user=request.user).first()
        return vote.vote_type if vote else None


class CreateReviewSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")
