from collections import Counter
from typing import Any
class ExecutionAnalyzer:

    @staticmethod
    def analyze(execution_result: dict[str, Any]) -> dict[str, Any]:

        metrics = execution_result.get("metrics", {})
        visualization = execution_result.get("visualization", {})

        events = visualization.get("events", [])
        events_truncated = visualization.get("events_truncated", False)

        # -----------------------------------------
        # 1. Event Analysis
        # -----------------------------------------

        event_counts = Counter(
            event.get("event_type", "UNKNOWN")
            for event in events
        )
        max_recorded_depth = max(
            (
                event.get("depth", 0)
                for event in events
            ),
            default=0
        )

        # -----------------------------------------
        # 2. Execution Metrics
        # -----------------------------------------

        recursive_calls = metrics.get("recursive_calls", 0)
        decisions = metrics.get("decisions", 0)
        valid_moves = metrics.get("valid_moves", 0)
        pruned_moves = metrics.get("pruned_moves", 0)
        backtracks = metrics.get("backtracks", 0)

        elapsed_time = metrics.get("elapsed_time_ms", 0)

        total_events = len(events)

        solutions_found = execution_result.get(
            "solutions_found", 0
        )

        search_complete = execution_result.get(
            "search_complete", False
        )

        # -----------------------------------------
        # 3. Performance Calculations
        # -----------------------------------------

        acceptance_rate = (
            (valid_moves / decisions) * 100
            if decisions > 0 else 0
        )

        pruning_rate = (
            (pruned_moves / decisions) * 100
            if decisions > 0 else 0
        )

        backtracking_rate = (
            (backtracks / valid_moves) * 100
            if valid_moves > 0 else 0
        )

        average_branching_factor = (
            decisions / recursive_calls
            if recursive_calls > 0 else 0
        )

        events_per_recursive_call = (
            total_events / recursive_calls
            if recursive_calls > 0 else 0
        )

        average_time_per_recursive_call = (
            elapsed_time / recursive_calls
            if recursive_calls > 0 else 0
        )

        # -----------------------------------------
        # 4. Performance Classification
        # -----------------------------------------

        if acceptance_rate >= 70:
            search_efficiency = "High"
        elif acceptance_rate >= 40:
            search_efficiency = "Moderate"
        else:
            search_efficiency = "Low"

        # -----------------------------------------
        # 5. Final Analysis Response
        # -----------------------------------------

        return {

            "problem": execution_result.get("problem"),

            "result": execution_result.get("result"),

            # -------------------------------------
            # Execution Status
            # -------------------------------------

            "execution_status": {

                "search_complete": search_complete,

                "stop_reason": execution_result.get(
                    "stop_reason"
                ),

                "solutions_found": solutions_found
            },

            # -------------------------------------
            # Original Execution Metrics
            # -------------------------------------

            "execution_metrics": {

                "recursive_calls": recursive_calls,

                "decisions": decisions,

                "valid_moves": valid_moves,

                "pruned_moves": pruned_moves,

                "backtracks": backtracks,

                "elapsed_time_ms": elapsed_time
            },

            # -------------------------------------
            # NEW: Performance Analysis
            # -------------------------------------

            "performance_analysis": {

                "acceptance_rate_percent": round(
                    acceptance_rate, 2
                ),

                "pruning_rate_percent": round(
                    pruning_rate, 2
                ),

                "backtracking_rate_percent": round(
                    backtracking_rate, 2
                ),

                "average_branching_factor": round(
                    average_branching_factor, 4
                ),

                "average_time_per_recursive_call_ms": round(
                    average_time_per_recursive_call, 6
                ),

                "events_per_recursive_call": round(
                    events_per_recursive_call, 4
                ),

                "search_efficiency": search_efficiency
            },

            # -------------------------------------
            # State Space Analysis
            # -------------------------------------

            "state_space_analysis": {

                "total_events_recorded": total_events,

                "maximum_recorded_depth": max_recorded_depth,

                "event_distribution": dict(event_counts),

                "events_truncated": events_truncated,

                "event_statistics_complete": (
                    not events_truncated
                )
            }
        }