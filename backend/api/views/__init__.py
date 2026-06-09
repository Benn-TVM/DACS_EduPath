from .auth import (
    EduPathTokenObtainPairView,
    HelloWorldAPIView,
    MeAPIView,
    OnboardingAPIView,
    RefreshTokenAPIView,
    RegisterAPIView,
)
from .community import (
    PostCommentAPIView,
    PostCommentDetailAPIView,
    PostDetailAPIView,
    PostListCreateAPIView,
    PostVoteAPIView,
)
from .courses import (
    CategoryListAPIView,
    CompareCoursesAPIView,
    CourseDetailAPIView,
    CourseListAPIView,
    SavedCourseAPIView,
    SavedCourseDetailAPIView,
    SearchAPIView,
    SearchHistoryAPIView,
    SearchHistoryDetailAPIView,
)
from .reviews import ReviewListCreateAPIView, ReviewVoteAPIView
from .roadmap import (
    DashboardStatsAPIView,
    GenerateRoadmapAPIView,
    RecommendationAPIView,
    RoadmapDetailAPIView,
    RoadmapListAPIView,
)
