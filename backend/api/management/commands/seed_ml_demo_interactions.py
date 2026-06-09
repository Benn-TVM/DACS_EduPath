from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import CourseReview, SavedCourse, UserProfile
from api.services import rank_courses_by_text


DEMO_PREFIX = "ml_demo_"

DEMO_PROFILES = [
    {
        "slug": "python_backend",
        "skill_level": "intermediate",
        "learning_goal": "Become a Python backend developer",
        "interests": "python django api database sql backend web",
        "learning_needs": "Build REST API, database design, deployment",
        "query": "python django backend api sql database web development",
    },
    {
        "slug": "data_science",
        "skill_level": "beginner",
        "learning_goal": "Start a data science career",
        "interests": "data science python statistics visualization machine learning",
        "learning_needs": "Learn pandas, statistics, machine learning, data visualization",
        "query": "data science python statistics machine learning visualization",
    },
    {
        "slug": "machine_learning",
        "skill_level": "intermediate",
        "learning_goal": "Build machine learning models",
        "interests": "machine learning deep learning neural networks ai",
        "learning_needs": "Train models, evaluate models, deploy AI systems",
        "query": "machine learning deep learning neural networks artificial intelligence",
    },
    {
        "slug": "cybersecurity",
        "skill_level": "beginner",
        "learning_goal": "Learn cybersecurity fundamentals",
        "interests": "security network ethical hacking cyber security",
        "learning_needs": "Understand network security, attacks, defense, risk",
        "query": "cybersecurity network security ethical hacking risk",
    },
    {
        "slug": "cloud_devops",
        "skill_level": "intermediate",
        "learning_goal": "Move into cloud and DevOps",
        "interests": "cloud devops docker kubernetes deployment aws",
        "learning_needs": "Learn cloud deployment, containers, CI CD, operations",
        "query": "cloud devops docker kubernetes deployment aws",
    },
    {
        "slug": "frontend",
        "skill_level": "beginner",
        "learning_goal": "Become a frontend web developer",
        "interests": "html css javascript react web user interface",
        "learning_needs": "Build responsive UI, JavaScript apps, React projects",
        "query": "frontend javascript react html css web user interface",
    },
    {
        "slug": "database_engineer",
        "skill_level": "intermediate",
        "learning_goal": "Improve database engineering skills",
        "interests": "database sql data modeling relational database postgres",
        "learning_needs": "Design schemas, write SQL, optimize queries",
        "query": "database sql data modeling relational database query optimization",
    },
    {
        "slug": "business_strategy",
        "skill_level": "beginner",
        "learning_goal": "Learn business strategy and product planning",
        "interests": "business strategy product management business model planning",
        "learning_needs": "Analyze business models, product strategy, market planning",
        "query": "business strategy product management business model planning",
    },
    {
        "slug": "project_management",
        "skill_level": "beginner",
        "learning_goal": "Manage software and product projects",
        "interests": "project management agile scrum planning leadership",
        "learning_needs": "Plan projects, manage teams, use agile methods",
        "query": "project management agile scrum planning leadership",
    },
    {
        "slug": "software_testing",
        "skill_level": "intermediate",
        "learning_goal": "Become a software testing engineer",
        "interests": "software testing automation quality assurance test cases",
        "learning_needs": "Write tests, automate testing, improve software quality",
        "query": "software testing automation quality assurance test cases",
    },
    {
        "slug": "finance_analytics",
        "skill_level": "beginner",
        "learning_goal": "Analyze financial and business data",
        "interests": "finance analytics excel accounting business data",
        "learning_needs": "Use analytics for finance, accounting, reporting",
        "query": "finance analytics accounting excel business data",
    },
    {
        "slug": "ux_design",
        "skill_level": "beginner",
        "learning_goal": "Learn UX and product design",
        "interests": "user experience design product design usability research",
        "learning_needs": "Design user interfaces, run research, improve usability",
        "query": "user experience design product design usability research",
    },
]


class Command(BaseCommand):
    help = "Seed reproducible demo interaction data for ML recommender training and evaluation."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing ml_demo_* users before seeding.",
        )
        parser.add_argument(
            "--positive-per-profile",
            type=int,
            default=6,
            help="Number of saved courses to create per demo profile.",
        )
        parser.add_argument(
            "--review-per-profile",
            type=int,
            default=3,
            help="Number of high-rating reviews to create per demo profile.",
        )
        parser.add_argument(
            "--query-top-k",
            type=int,
            default=30,
            help="Candidate pool size used to select demo positive courses.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show planned interaction counts without writing data.",
        )

    def handle(self, *args, **options):
        user_model = get_user_model()
        positive_per_profile = max(1, int(options["positive_per_profile"]))
        review_per_profile = max(0, min(positive_per_profile, int(options["review_per_profile"])))
        query_top_k = max(positive_per_profile, int(options["query_top_k"]))

        if options["reset"] and not options["dry_run"]:
            deleted_count, _ = user_model.objects.filter(username__startswith=DEMO_PREFIX).delete()
            self.stdout.write(f"Deleted demo users: {deleted_count}")

        planned_profiles = []
        for profile_data in DEMO_PROFILES:
            ranked = rank_courses_by_text(profile_data["query"], top_k=query_top_k)
            selected_courses = []
            seen_ids = set()
            for item in ranked:
                course = item["course"]
                if course.id in seen_ids:
                    continue
                seen_ids.add(course.id)
                selected_courses.append(course)
                if len(selected_courses) >= positive_per_profile:
                    break

            if selected_courses:
                planned_profiles.append((profile_data, selected_courses))

        if options["dry_run"]:
            total_saved = sum(len(courses) for _profile, courses in planned_profiles)
            total_reviews = sum(min(review_per_profile, len(courses)) for _profile, courses in planned_profiles)
            self.stdout.write(
                self.style.SUCCESS(
                    "Demo interaction plan ready. "
                    f"Profiles: {len(planned_profiles)}, saved: {total_saved}, reviews: {total_reviews}."
                )
            )
            return

        created_users = 0
        saved_created = 0
        reviews_created = 0

        with transaction.atomic():
            for profile_data, courses in planned_profiles:
                username = f"{DEMO_PREFIX}{profile_data['slug']}"
                user, user_created = user_model.objects.get_or_create(
                    username=username,
                    defaults={
                        "email": f"{username}@example.com",
                        "first_name": "ML",
                        "last_name": profile_data["slug"].replace("_", " ").title(),
                    },
                )
                if user_created:
                    user.set_password("DemoMl123!")
                    user.save(update_fields=["password"])
                    created_users += 1

                UserProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        "skill_level": profile_data["skill_level"],
                        "learning_goal": profile_data["learning_goal"],
                        "interests": profile_data["interests"],
                        "learning_needs": profile_data["learning_needs"],
                        "onboarding_completed": True,
                    },
                )

                for index, course in enumerate(courses):
                    _saved, created = SavedCourse.objects.get_or_create(user=user, course=course)
                    if created:
                        saved_created += 1

                    if index < review_per_profile:
                        _review, review_created = CourseReview.objects.update_or_create(
                            user=user,
                            course=course,
                            defaults={
                                "rating": 5,
                                "comment": "Demo positive interaction for ML evaluation.",
                                "is_active": True,
                            },
                        )
                        if review_created:
                            reviews_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded ML demo interactions. "
                f"Profiles: {len(planned_profiles)}, new users: {created_users}, "
                f"saved created: {saved_created}, reviews created: {reviews_created}."
            )
        )
