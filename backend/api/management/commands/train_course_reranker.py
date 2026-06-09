from pathlib import Path

from django.core.management.base import BaseCommand

from api.ml_recommender import build_training_dataset, train_course_reranker


class Command(BaseCommand):
    help = "Train and save the Logistic Regression course reranker."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Optional output path for the joblib model payload.",
        )
        parser.add_argument(
            "--negative-per-positive",
            type=int,
            default=3,
            help="Number of negative candidate courses sampled per positive interaction.",
        )
        parser.add_argument(
            "--candidate-pool-size",
            type=int,
            default=50,
            help="Hybrid baseline candidate pool size per user profile.",
        )
        parser.add_argument(
            "--min-positives",
            type=int,
            default=2,
            help="Minimum positive training examples required to train.",
        )
        parser.add_argument(
            "--min-negatives",
            type=int,
            default=2,
            help="Minimum negative training examples required to train.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Build and summarize the training dataset without fitting a model.",
        )

    def handle(self, *args, **options):
        output_path = Path(options["output"]) if options["output"] else None
        if options["dry_run"]:
            dataset = build_training_dataset(
                negative_per_positive=options["negative_per_positive"],
                candidate_pool_size=options["candidate_pool_size"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    "Training dataset ready. "
                    f"Positive: {dataset.positive_count}, "
                    f"negative: {dataset.negative_count}, "
                    f"total: {len(dataset.examples)}."
                )
            )
            return

        result = train_course_reranker(
            output_path=output_path,
            negative_per_positive=options["negative_per_positive"],
            candidate_pool_size=options["candidate_pool_size"],
            min_positive_examples=options["min_positives"],
            min_negative_examples=options["min_negatives"],
        )
        if not result["trained"]:
            self.stdout.write(
                self.style.WARNING(
                    "Reranker training skipped. "
                    f"Reason: {result.get('reason')}. "
                    f"Positive: {result['positive_count']}, "
                    f"negative: {result['negative_count']}, "
                    f"total: {result['total_count']}."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                "Reranker trained successfully. "
                f"Model: {result['model_path']}. "
                f"Positive: {result['positive_count']}, "
                f"negative: {result['negative_count']}, "
                f"total: {result['total_count']}."
            )
        )
