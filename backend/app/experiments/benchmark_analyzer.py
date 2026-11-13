
import math


class BenchmarkAnalyzer:
    """
    Analyzes benchmark measurements and estimates
    empirical execution-time scaling.

    Empirical scaling is descriptive; it does not
    establish theoretical asymptotic complexity.
    """

    @staticmethod
    def analyze(benchmark_data: dict) -> dict:
        results = benchmark_data.get("results", [])

        if not results:
            raise ValueError(
                "No benchmark results are available for analysis."
            )

        analyzed_results = []

        for item in results:
            timing = item.get("execution_time", {})

            average = timing.get("average_ms", 0)
            deviation = timing.get(
                "standard_deviation_ms", 0
            )

            coefficient_of_variation = (
                (deviation / average) * 100
                if average > 0 else 0
            )

            analyzed_results.append({
                "input_size": item["input_size"],
                "average_time_ms": average,
                "minimum_time_ms": timing.get(
                    "minimum_ms", 0
                ),
                "maximum_time_ms": timing.get(
                    "maximum_ms", 0
                ),
                "standard_deviation_ms": deviation,
                "coefficient_of_variation_percent": round(
                    coefficient_of_variation, 2
                ),
                "recursive_calls": item["metrics"].get(
                    "recursive_calls", 0
                ),
                "decisions": item["metrics"].get(
                    "decisions", 0
                ),
                "backtracks": item["metrics"].get(
                    "backtracks", 0
                )
            })

        # Sort by input size for meaningful comparisons.
        analyzed_results.sort(
            key=lambda result: result["input_size"]
        )

        growth_analysis = []

        for previous, current in zip(
            analyzed_results,
            analyzed_results[1:]
        ):
            previous_size = previous["input_size"]
            current_size = current["input_size"]

            previous_time = previous["average_time_ms"]
            current_time = current["average_time_ms"]

            time_ratio = (
                current_time / previous_time
                if previous_time > 0 else None
            )

            size_ratio = current_size / previous_size

            # Empirical log-log scaling exponent.
            scaling_exponent = None

            if (
                previous_time > 0
                and current_time > 0
                and size_ratio > 1
            ):
                scaling_exponent = (
                    math.log(current_time / previous_time)
                    / math.log(size_ratio)
                )

            growth_analysis.append({
                "from_input_size": previous_size,
                "to_input_size": current_size,
                "input_size_ratio": round(size_ratio, 4),
                "execution_time_ratio": (
                    round(time_ratio, 4)
                    if time_ratio is not None
                    else None
                ),
                "empirical_scaling_exponent": (
                    round(scaling_exponent, 4)
                    if scaling_exponent is not None
                    else None
                )
            })

        return {
            "problem_id": benchmark_data["problem_id"],
            "benchmark_count": len(analyzed_results),
            "repeats": benchmark_data["repeats"],
            "results": analyzed_results,
            "growth_analysis": growth_analysis,
            "interpretation": (
                "Empirical scaling estimates describe the "
                "measured benchmark instances only. They do "
                "not prove the theoretical asymptotic "
                "complexity of the algorithm."
            )
        }
