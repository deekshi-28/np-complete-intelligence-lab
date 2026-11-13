
from time import perf_counter

from app.engines.execution_recorder import ExecutionRecorder


class NQueensSolver:

    def __init__(
        self,
        n: int,
        max_solutions: int = 100,
        max_events: int = 5000
    ):

        self.n = n
        self.max_solutions = max_solutions

        self.board = [-1] * n

        self.columns = set()
        self.diagonal1 = set()
        self.diagonal2 = set()

        self.solutions = []

        self.recursive_calls = 0
        self.decisions = 0
        self.valid_moves = 0
        self.pruned_moves = 0
        self.backtracks = 0

        self.limit_reached = False

        self.recorder = ExecutionRecorder(
            max_events=max_events
        )

    def is_safe(self, row, col):

        return (
            col not in self.columns
            and (row - col) not in self.diagonal1
            and (row + col) not in self.diagonal2
        )

    def solve(self):

        start_time = perf_counter()

        root_id = self.recorder.create_state_id()

        self.recorder.record(
            state_id=root_id,
            parent_id=None,
            depth=0,
            event_type="START",
            decision="initialize_board",
            status="started",
            state=[]
        )

        self._backtrack(
            row=0,
            parent_id=root_id
        )

        elapsed_ms = (
            perf_counter() - start_time
        ) * 1000

        stop_reason = (
            "solution_limit_reached"
            if self.limit_reached
            else "search_exhausted"
        )

        complete = not self.limit_reached

        self.recorder.record(
            state_id=root_id,
            parent_id=None,
            depth=0,
            event_type="COMPLETE",
            decision="finish_search",
            status="completed",
            reason=stop_reason,
            state=self.board.copy()
        )

        return {
            "problem": "N-Queens",
            "input_size": self.n,

            "result": (
                "SOLUTION_FOUND"
                if self.solutions
                else "NO_SOLUTION"
            ),

            "solutions_found": len(self.solutions),
            "solutions": self.solutions,

            "search_complete": complete,
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

    def _backtrack(self, row, parent_id):

        self.recursive_calls += 1

        # All queens have been placed.
        if row == self.n:

            solution = self.board.copy()

            self.solutions.append(solution)

            solution_id = (
                self.recorder.create_state_id()
            )

            self.recorder.record(
                state_id=solution_id,
                parent_id=parent_id,
                depth=row,
                event_type="SOLUTION",
                decision="complete_board",
                status="accepted",
                reason="all_constraints_satisfied",
                state=solution
            )

            if len(self.solutions) >= self.max_solutions:
                self.limit_reached = True

            return

        # Try placing a queen in each column.
        for col in range(self.n):

            if self.limit_reached:
                return

            self.decisions += 1

            state_id = (
                self.recorder.create_state_id()
            )

            self.recorder.record(
                state_id=state_id,
                parent_id=parent_id,
                depth=row + 1,
                event_type="DECISION",
                decision=f"place_queen_at_{row}_{col}",
                status="considered",
                state=self.board[:row] + [col]
            )

            # Check whether placement is valid.
            if self.is_safe(row, col):

                self.valid_moves += 1

                self.board[row] = col

                self.columns.add(col)
                self.diagonal1.add(row - col)
                self.diagonal2.add(row + col)

                self.recorder.record(
                    state_id=state_id,
                    parent_id=parent_id,
                    depth=row + 1,
                    event_type="VALID",
                    decision=f"place_queen_at_{row}_{col}",
                    status="accepted",
                    reason="no_constraint_conflict",
                    state=self.board[:row + 1]
                )

                self._backtrack(
                    row + 1,
                    state_id
                )

                # Undo placement when continuing search.
                self.board[row] = -1

                self.columns.remove(col)
                self.diagonal1.remove(row - col)
                self.diagonal2.remove(row + col)

                if not self.limit_reached:

                    self.backtracks += 1

                    self.recorder.record(
                        state_id=state_id,
                        parent_id=parent_id,
                        depth=row + 1,
                        event_type="BACKTRACK",
                        decision=f"remove_queen_from_{row}_{col}",
                        status="reversed",
                        reason="exploring_alternative",
                        state=self.board[:row]
                    )

            else:

                self.pruned_moves += 1

                reason = self._conflict_reason(
                    row,
                    col
                )

                self.recorder.record(
                    state_id=state_id,
                    parent_id=parent_id,
                    depth=row + 1,
                    event_type="PRUNE",
                    decision=f"place_queen_at_{row}_{col}",
                    status="rejected",
                    reason=reason,
                    state=self.board[:row] + [col]
                )

    def _conflict_reason(self, row, col):

        if col in self.columns:
            return "column_conflict"

        if row - col in self.diagonal1:
            return "main_diagonal_conflict"

        if row + col in self.diagonal2:
            return "anti_diagonal_conflict"

        return "constraint_violation"
