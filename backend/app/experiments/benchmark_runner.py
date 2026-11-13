
from time import perf_counter
from statistics import mean, stdev

from app.algorithms.n_queens import NQueensSolver
from app.algorithms.graph_coloring import GraphColoringSolver
from app.algorithms.subset_sum import SubsetSumSolver
from app.algorithms.hamiltonian_cycle import HamiltonianCycleSolver


class BenchmarkRunner:
    """
    Executes deterministic benchmark instances for
    the four supported backtracking algorithms.
    """

    @staticmethod
    def generate_cycle_graph(size, extra_edges=False):
        """
        Generate a deterministic undirected cycle graph.
        Optionally add distance-two edges.
        """

        adjacency = {
            f"V{i}": set()
            for i in range(size)
        }

        for i in range(size):
            first = f"V{i}"
            second = f"V{(i + 1) % size}"

            adjacency[first].add(second)
            adjacency[second].add(first)

        if extra_edges:
            for i in range(size):
                first = f"V{i}"
                second = f"V{(i + 2) % size}"

                if first != second:
                    adjacency[first].add(second)
                    adjacency[second].add(first)

        return {
            vertex: sorted(neighbors)
            for vertex, neighbors in adjacency.items()
        }

    @classmethod
    def create_solver(cls, problem_id, size, request):
        """
        Generate the solver and deterministic input
        for the selected algorithm.
        """

        max_solutions = request.max_solutions
        max_events = request.max_events

        if problem_id == "n_queens":

            solver = NQueensSolver(
                n=size,
                max_solutions=max_solutions,
                max_events=max_events
            )

            input_data = {"n": size}

        elif problem_id == "graph_coloring":

            adjacency = cls.generate_cycle_graph(
                size,
                extra_edges=False
            )

            solver = GraphColoringSolver(
                adjacency=adjacency,
                num_colors=request.num_colors,
                max_solutions=max_solutions,
                max_events=max_events
            )

            input_data = {
                "adjacency": adjacency,
                "num_colors": request.num_colors
            }

        elif problem_id == "subset_sum":

            numbers = list(range(1, size + 1))
            target = sum(numbers) // 2

            solver = SubsetSumSolver(
                numbers=numbers,
                target=target,
                max_solutions=max_solutions,
                max_events=max_events
            )

            input_data = {
                "numbers": numbers,
                "target": target
            }

        elif problem_id == "hamiltonian_cycle":

            adjacency = cls.generate_cycle_graph(
                size,
                extra_edges=True
            )

            solver = HamiltonianCycleSolver(
                adjacency=adjacency,
                max_solutions=max_solutions,
                max_events=max_events
            )

            input_data = {
                "adjacency": adjacency
            }

        else:
            raise ValueError(
                f"Unsupported benchmark problem: {problem_id}"
            )

        return solver, input_data

    @classmethod
    def run(cls, request):
        """
        Run benchmarks for every requested input size.
        """

        benchmark_results = []

        for size in request.sizes:

            execution_times = []
            metric_runs = []
            input_data = None
            last_result = None

            for _ in range(request.repeats):

                solver, input_data = cls.create_solver(
                    request.problem_id,
                    size,
                    request
                )

                start_time = perf_counter()

                result = solver.solve()

                wall_time_ms = (
                    perf_counter() - start_time
                ) * 1000

                execution_times.append(wall_time_ms)

                metrics = result.get("metrics", {})

                metric_runs.append({
                    "recursive_calls": metrics.get(
                        "recursive_calls", 0
                    ),
                    "decisions": metrics.get(
                        "decisions", 0
                    ),
                    "valid_moves": metrics.get(
                        "valid_moves", 0
                    ),
                    "pruned_moves": metrics.get(
                        "pruned_moves", 0
                    ),
                    "backtracks": metrics.get(
                        "backtracks", 0
                    ),
                    "solutions_found": result.get(
                        "solutions_found", 0
                    ),
                    "search_complete": result.get(
                        "search_complete", False
                    )
                })

                last_result = result

            average_time = mean(execution_times)

            time_deviation = (
                stdev(execution_times)
                if len(execution_times) > 1
                else 0.0
            )

            benchmark_results.append({

                "input_size": size,

                "input": input_data,

                "execution_time": {
                    "runs_ms": [
                        round(value, 6)
                        for value in execution_times
                    ],
                    "average_ms": round(
                        average_time, 6
                    ),
                    "minimum_ms": round(
                        min(execution_times), 6
                    ),
                    "maximum_ms": round(
                        max(execution_times), 6
                    ),
                    "standard_deviation_ms": round(
                        time_deviation, 6
                    )
                },

                "metrics": {
                    key: round(
                        mean(run[key] for run in metric_runs), 2
                    )
                    for key in (
                        "recursive_calls",
                        "decisions",
                        "valid_moves",
                        "pruned_moves",
                        "backtracks",
                        "solutions_found"
                    )
                },

                "search_complete": all(
                    run["search_complete"]
                    for run in metric_runs
                ),

                "events_truncated": (
                    last_result.get(
                        "visualization", {}
                    ).get("events_truncated", False)
                )
            })

        return {

            "problem_id": request.problem_id,

            "repeats": request.repeats,

            "measurement": (
                "Instrumented solver wall-clock execution time"
            ),

            "benchmark_count": len(benchmark_results),

            "results": benchmark_results
        }
