import time

from app.engines.execution_recorder import ExecutionRecorder


class HamiltonianCycleSolver:
    """
    Backtracking solver with O(1)-average visited/edge lookups.
    """

    def __init__(
        self,
        adjacency,
        max_solutions=100,
        max_events=5000
    ):
        # Keep adjacency lists for deterministic traversal.
        self.adjacency = {
            vertex: list(neighbors)
            for vertex, neighbors in adjacency.items()
        }

        # Sets provide faster membership checks.
        self.adjacency_sets = {
            vertex: set(neighbors)
            for vertex, neighbors in self.adjacency.items()
        }

        self.vertices = list(self.adjacency.keys())
        self.n = len(self.vertices)

        self.max_solutions = max_solutions

        self.recorder = ExecutionRecorder(
            max_events=max_events
        )

        self.path = []
        self.visited = set()
        self.solutions = []

        self.recursive_calls = 0
        self.decisions = 0
        self.valid_moves = 0
        self.pruned_moves = 0
        self.backtracks = 0

        self.limit_reached = False
        self.start_time = 0

        # Preserve original vertex order for canonical
        # orientation of undirected cycles.
        self.vertex_order = {
            vertex: index
            for index, vertex in enumerate(self.vertices)
        }

    def get_current_state(self):

        current_vertex = (
            self.path[-1] if self.path else None
        )

        return {
            "path": self.path.copy(),
            "visited_vertices": self.path.copy(),
            "current_vertex": current_vertex,
            "visited_count": len(self.path),
            "total_vertices": self.n
        }

    def solve(self):

        self.start_time = time.perf_counter()

        root_id = self.recorder.create_state_id()

        self.recorder.record(
            state_id=root_id,
            parent_id=None,
            depth=0,
            event_type="START",
            decision="initialize_hamiltonian_cycle",
            status="started",
            state=self.get_current_state()
        )

        # Fix the first vertex to avoid rotational duplicates.
        start_vertex = self.vertices[0]

        self.path = [start_vertex]
        self.visited = {start_vertex}

        self._backtrack(
            parent_id=root_id
        )

        elapsed_time_ms = (
            time.perf_counter() - self.start_time
        ) * 1000

        complete_id = self.recorder.create_state_id()

        stop_reason = (
            "solution_limit_reached"
            if self.limit_reached
            else "search_exhausted"
        )

        self.recorder.record(
            state_id=complete_id,
            parent_id=None,
            depth=0,
            event_type="COMPLETE",
            decision="finish_hamiltonian_cycle",
            status="completed",
            reason=stop_reason,
            state=self.get_current_state()
        )

        return {
            "problem": "Hamiltonian Cycle",

            "input": {
                "vertices": self.n,
                "start_vertex": start_vertex,
                "vertex_order": self.vertices
            },

            "result": (
                "SOLUTION_FOUND"
                if self.solutions
                else "NO_SOLUTION"
            ),

            "is_hamiltonian": bool(self.solutions),

            "solutions_found": len(self.solutions),

            "solutions": self.solutions,

            "search_complete": not self.limit_reached,

            "stop_reason": stop_reason,

            "metrics": {
                "recursive_calls": self.recursive_calls,
                "decisions": self.decisions,
                "valid_moves": self.valid_moves,
                "pruned_moves": self.pruned_moves,
                "backtracks": self.backtracks,
                "elapsed_time_ms": round(
                    elapsed_time_ms, 4
                )
            },

            "visualization": {
                "events": self.recorder.events,

                "total_events_recorded": len(
                    self.recorder.events
                ),

                "events_truncated": (
                    self.recorder.events_truncated
                )
            }
        }

    def _backtrack(self, parent_id):

        if self.limit_reached:
            return

        self.recursive_calls += 1

        current_vertex = self.path[-1]
        start_vertex = self.vertices[0]

        # All vertices have been visited.
        if len(self.path) == self.n:

            # Check whether the last vertex connects
            # back to the starting vertex.
            if start_vertex in self.adjacency_sets[current_vertex]:

                # Avoid storing reverse duplicates.
                if (
                    self.vertex_order[self.path[1]]
                    <
                    self.vertex_order[self.path[-1]]
                ):

                    cycle = self.path.copy()
                    cycle.append(start_vertex)

                    self.solutions.append(cycle)

                    solution_id = (
                        self.recorder.create_state_id()
                    )

                    self.recorder.record(
                        state_id=solution_id,
                        parent_id=parent_id,
                        depth=self.n,
                        event_type="SOLUTION",
                        decision="hamiltonian_cycle_found",
                        status="accepted",
                        reason=(
                            "all_vertices_visited_and_cycle_closed"
                        ),
                        state={
                            "path": cycle,
                            "visited_count": self.n,
                            "cycle_closed": True
                        }
                    )

                    if (
                        len(self.solutions)
                        >= self.max_solutions
                    ):
                        self.limit_reached = True

            else:

                self.pruned_moves += 1

                prune_id = (
                    self.recorder.create_state_id()
                )

                self.recorder.record(
                    state_id=prune_id,
                    parent_id=parent_id,
                    depth=self.n,
                    event_type="PRUNE",
                    decision="close_cycle",
                    status="rejected",
                    reason=(
                        "last_vertex_not_connected_to_start"
                    ),
                    state=self.get_current_state()
                )

            return

        # Explore unvisited adjacent vertices.
        for next_vertex in self.adjacency[current_vertex]:

            if self.limit_reached:
                return

            # O(1) average membership check.
            if next_vertex in self.visited:
                continue

            self.decisions += 1

            child_id = (
                self.recorder.create_state_id()
            )

            self.path.append(next_vertex)
            self.visited.add(next_vertex)

            decision_state = self.get_current_state()

            self.recorder.record(
                state_id=child_id,
                parent_id=parent_id,
                depth=len(self.path) - 1,
                event_type="DECISION",
                decision=f"visit_{next_vertex}",
                status="considered",
                state=decision_state
            )

            self.valid_moves += 1

            self.recorder.record(
                state_id=child_id,
                parent_id=parent_id,
                depth=len(self.path) - 1,
                event_type="VALID",
                decision=f"visit_{next_vertex}",
                status="accepted",
                reason="adjacent_and_not_yet_visited",
                state=decision_state
            )

            self._backtrack(
                parent_id=child_id
            )

            # Restore the previous state.
            self.visited.remove(next_vertex)
            self.path.pop()

            self.backtracks += 1

            self.recorder.record(
                state_id=child_id,
                parent_id=parent_id,
                depth=len(self.path),
                event_type="BACKTRACK",
                decision=f"undo_visit_{next_vertex}",
                status="reversed",
                reason="exploring_alternative_path",
                state=self.get_current_state()
            )