
from time import perf_counter

from app.engines.execution_recorder import ExecutionRecorder
class GraphColoringSolver:

    def __init__(
        self,
        adjacency,
        num_colors,
        max_solutions=100,
        max_events=5000
    ):

        self.adjacency = {
            vertex: list(neighbors)
            for vertex, neighbors in adjacency.items()
        }

        self.num_colors = num_colors
        self.max_solutions = max_solutions

        # Highest-degree-first vertex ordering.
        self.vertices = sorted(
            self.adjacency.keys(),
            key=lambda vertex: (
                -len(self.adjacency[vertex]),
                vertex
            )
        )

        self.coloring = {}

        self.solutions = []

        self.recursive_calls = 0
        self.decisions = 0
        self.valid_moves = 0
        self.conflicts = 0
        self.pruned_moves = 0
        self.backtracks = 0

        self.limit_reached = False

        self.recorder = ExecutionRecorder(
            max_events=max_events
        )

    def is_safe(self, vertex, color):

        for neighbor in self.adjacency[vertex]:

            if self.coloring.get(neighbor) == color:
                return False

        return True

    def solve(self):

        start_time = perf_counter()

        root_id = self.recorder.create_state_id()

        self.recorder.record(
            state_id=root_id,
            parent_id=None,
            depth=0,
            event_type="START",
            decision="initialize_graph_coloring",
            status="started",
            state={}
        )

        self._backtrack(
            index=0,
            parent_id=root_id
        )

        elapsed_ms = (
            perf_counter() - start_time
        ) * 1000

        complete = not self.limit_reached

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
            decision="finish_graph_coloring",
            status="completed",
            reason=stop_reason,
            state=self.coloring.copy()
        )

        return {
            "problem": "Graph Coloring",

            "input": {
                "vertices": len(self.vertices),
                "num_colors": self.num_colors,
                "vertex_order": self.vertices
            },

            "result": (
                "SOLUTION_FOUND"
                if self.solutions
                else "NO_SOLUTION"
            ),

            "is_colorable": len(self.solutions) > 0,

            "solutions_found": len(self.solutions),

            "solutions": self.solutions,

            "search_complete": complete,
            "stop_reason": stop_reason,

            "metrics": {
                "recursive_calls": self.recursive_calls,
                "decisions": self.decisions,
                "valid_moves": self.valid_moves,
                "conflicts": self.conflicts,
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

    def _backtrack(self, index, parent_id):

        self.recursive_calls += 1

        # All vertices have been successfully colored.
        if index == len(self.vertices):

            solution = self.coloring.copy()

            self.solutions.append(solution)

            solution_id = (
                self.recorder.create_state_id()
            )

            self.recorder.record(
                state_id=solution_id,
                parent_id=parent_id,
                depth=index,
                event_type="SOLUTION",
                decision="complete_graph_coloring",
                status="accepted",
                reason="all_constraints_satisfied",
                state=solution
            )

            if len(self.solutions) >= self.max_solutions:
                self.limit_reached = True

            return

        vertex = self.vertices[index]

        # Try every available color.
        for color in range(1, self.num_colors + 1):

            if self.limit_reached:
                return

            self.decisions += 1

            state_id = (
                self.recorder.create_state_id()
            )

            candidate = self.coloring.copy()
            candidate[vertex] = color

            self.recorder.record(
                state_id=state_id,
                parent_id=parent_id,
                depth=index + 1,
                event_type="DECISION",
                decision=f"color_{vertex}_with_{color}",
                status="considered",
                state=candidate
            )

            # Check adjacent vertex constraints.
            if self.is_safe(vertex, color):

                self.valid_moves += 1

                self.coloring[vertex] = color

                self.recorder.record(
                    state_id=state_id,
                    parent_id=parent_id,
                    depth=index + 1,
                    event_type="VALID",
                    decision=f"color_{vertex}_with_{color}",
                    status="accepted",
                    reason="no_adjacent_color_conflict",
                    state=self.coloring.copy()
                )

                self._backtrack(
                    index + 1,
                    state_id
                )

                # Stop when requested solution limit is reached.
                if self.limit_reached:
                    return

                # Undo the assignment.
                del self.coloring[vertex]

                self.backtracks += 1

                self.recorder.record(
                    state_id=state_id,
                    parent_id=parent_id,
                    depth=index + 1,
                    event_type="BACKTRACK",
                    decision=f"remove_color_from_{vertex}",
                    status="reversed",
                    reason="exploring_alternative",
                    state=self.coloring.copy()
                )

            else:

                self.conflicts += 1
                self.pruned_moves += 1

                conflicting_neighbors = [
                    neighbor
                    for neighbor in self.adjacency[vertex]
                    if self.coloring.get(neighbor) == color
                ]

                self.recorder.record(
                    state_id=state_id,
                    parent_id=parent_id,
                    depth=index + 1,
                    event_type="PRUNE",
                    decision=f"color_{vertex}_with_{color}",
                    status="rejected",
                    reason="adjacent_color_conflict",
                    state={
                        "coloring": self.coloring.copy(),
                        "attempted_vertex": vertex,
                        "attempted_color": color,
                        "conflicting_neighbors": (
                            conflicting_neighbors
                        )
                    }
                )
