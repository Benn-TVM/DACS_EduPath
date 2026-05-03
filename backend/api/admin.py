from django.contrib import admin

from .models import Course, SavedCourse, SearchHistory, UserProfile


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "course_code", "provider", "is_active", "updated_at")
    search_fields = ("title", "course_code", "provider", "search_document")
    list_filter = ("provider", "is_active")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "skill_level", "onboarding_completed", "updated_at")
    search_fields = ("user__username", "user__email", "learning_goal", "interests")
    list_filter = ("skill_level", "onboarding_completed")


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "query_text", "created_at")
    search_fields = ("user__username", "query_text")
    list_filter = ("created_at",)


@admin.register(SavedCourse)
class SavedCourseAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "saved_at")
    search_fields = ("user__username", "course__title", "course__course_code")
    list_filter = ("saved_at",)
