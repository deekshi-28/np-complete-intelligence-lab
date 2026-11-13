from time import perf_counter

from app.engines.execution_recorder import ExecutionRecorder


class SubsetSumSolver:

    def __init__(
        self,
        numbers,
        target,
        max_solutions=100,
        max_events=5000
    ):
        self.numbers = list(numbers)
        self.target = target
        self.n = len(self.numbers)

        self.max_solutions = max_solutions

        self.solutions = []
        self.selected_indices = []

        self.recursive_calls = 0
        self.decisions = 0
        self.valid_moves = 0
        self.pruned_moves = 0
        self.backtracks = 0

        self.limit_reached = False

        self.recorder = ExecutionRecorder(
            max_events=max_events
        )

        # Precompute safe lower and upper bounds
        # for all remaining suffixes.
        self.suffix_min = [0] * (self.n + 1)
        self.suffix_max = [0] * (self.n + 1)

        for i in range(self.n - 1, -1, -1):
            value = self.numbers[i]

            self.suffix_min[i] = (
                self.suffix_min[i + 1] + min(value, 0)
            )

            self.suffix_max[i] = (
                self.suffix_max[i + 1] + max(value, 0)
            )

    def get_current_state(self, current_sum, index):
        return {
            "index": index,
            "current_sum": current_sum,
            "selected_indices": self.selected_indices.copy(),
            "selected_values": [
                self.numbers[i]
                for i in self.selected_indices
            ]
        }

    def can_reach_target(self, current_sum, index):
        minimum_possible = (
            current_sum + self.suffix_min[index]
        )

        maximum_possible = (
            current_sum + self.suffix_max[index]
        )

        return (
            minimum_possible
            <= self.target
            <= maximum_possible
        )

    def solve(self):

        start_time = perf_counter()

        root_id = self.recorder.create_state_id()

        self.recorder.record(
            state_id=root_id,
            parent_id=None,
            depth=0,
            event_type="START",
            decision="initialize_subset_sum",
            status="started",
            state=self.get_current_state(0, 0)
        )

        self._backtrack(
            index=0,
            current_sum=0,
            parent_id=root_id
        )

        elapsed_ms = (
            perf_counter() - start_time
        ) * 1000

        search_complete = not self.limit_reached

        stop_reason = (
            "solution_limit_reached"
            if self.limit_reached
            else "search_exhausted"
        )

        self.recorder.record(
            state_id=root_id,
            parent_id=None,
            depth=0,
            event_type="COMPLETE",
            decision="finish_subset_sum",
            status="completed",
            reason=stop_reason,
            state=self.get_current_state(
                sum(
                    self.numbers[i]
                    for i in self.selected_indices
                ),
                0
            )
        )

        return {
            "problem": "Subset Sum",

            "input": {
                "numbers": self.numbers,
                "target": self.target,
                "number_of_elements": self.n
            },

            "result": (
                "SOLUTION_FOUND"
                if self.solutions
                else "NO_SOLUTION"
            ),

            "is_satisfiable": len(self.solutions) > 0,

            "solutions_found": len(self.solutions),

            "solutions": self.solutions,

            "search_complete": search_complete,

            "stop_reason": stop_reason,

            "metrics": {
                "recursive_calls": self.recursive_calls,
                "decisions": self.decisions,
                "valid_moves": self.valid_moves,
                "pruned_moves": self.pruned_moves,
                "backtracks": self.backtracks,
                "elapsed_time_ms": round(elapsed_ms, 4)
            },

            "visualization": {
                "events": self.recorder.get_events(),
                "total_events_recorded": len(
                    self.recorder.get_events()
                ),
                "events_truncated": (
                    self.recorder.events_truncated
                )
            }
        }

    def _backtrack(
        self,
        index,
        current_sum,
        parent_id
    ):
        if self.limit_reached:
            return

        self.recursive_calls += 1

    # Base case: all elements have been processed.
    # Record the subset only at a leaf node.
        if index >= self.n:

            if current_sum == self.target:

                solution = {
                    "indices": self.selected_indices.copy(),
                    "values": [
                        self.numbers[i]
                        for i in self.selected_indices
                    ],
                    "sum": current_sum
                }

                self.solutions.append(solution)

                solution_id = self.recorder.create_state_id()

                self.recorder.record(
                    state_id=solution_id,
                    parent_id=parent_id,
                    depth=index,
                    event_type="SOLUTION",
                    decision="target_sum_reached",
                    status="accepted",
                    reason="subset_matches_target",
                    state=self.get_current_state(
                        current_sum,
                        index
                    )
                )

                if len(self.solutions) >= self.max_solutions:
                    self.limit_reached = True

            return

        value = self.numbers[index]

        # Two possible decisions:
        # 1. Include the current element.
        # 2. Exclude the current element.

        choices = [
            ("include", current_sum + value),
            ("exclude", current_sum)
        ]

        for choice, next_sum in choices:

            if self.limit_reached:
                return

            self.decisions += 1

            child_id = self.recorder.create_state_id()

            if choice == "include":
                self.selected_indices.append(index)

            decision_state = self.get_current_state(
                next_sum,
                index + 1
            )

            self.recorder.record(
                state_id=child_id,
                parent_id=parent_id,
                depth=index + 1,
                event_type="DECISION",
                decision=f"{choice}_{value}",
                status="considered",
                state=decision_state
            )

            # Check whether the target is still reachable.
            if self.can_reach_target(
                next_sum,
                index + 1
            ):

                self.valid_moves += 1

                self.recorder.record(
                    state_id=child_id,
                    parent_id=parent_id,
                    depth=index + 1,
                    event_type="VALID",
                    decision=f"{choice}_{value}",
                    status="accepted",
                    reason="target_remains_reachable",
                    state=decision_state
                )

                self._backtrack(
                    index=index + 1,
                    current_sum=next_sum,
                    parent_id=child_id
                )

                # Restore the previous state.
                if choice == "include":
                    self.selected_indices.pop()

                self.backtracks += 1

                self.recorder.record(
                    state_id=child_id,
                    parent_id=parent_id,
                    depth=index + 1,
                    event_type="BACKTRACK",
                    decision=f"undo_{choice}_{value}",
                    status="reversed",
                    reason="exploring_alternative",
                    state=self.get_current_state(
                        current_sum,
                        index
                    )
                )

            else:

                self.pruned_moves += 1

                self.recorder.record(
                    state_id=child_id,
                    parent_id=parent_id,
                    depth=index + 1,
                    event_type="PRUNE",
                    decision=f"{choice}_{value}",
                    status="rejected",
                    reason="target_outside_remaining_sum_bounds",
                    state=decision_state
                )

                if choice == "include":
                    self.selected_indices.pop()
