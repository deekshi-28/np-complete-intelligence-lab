from typing import Any


class ComplexityAnalyzer:
    """
    Reports theoretical algorithmic bounds, not
    instrumented wall-clock cost.

    Visualization snapshot generation and event recording
    introduce additional implementation overhead.
    """

    COMPLEXITY_DATA = {

        # -----------------------------------
        # 1. N-Queens
        # -----------------------------------

        "n_queens": {

            "name": "N-Queens",

            "time_complexity": {
                "best": "O(N)",
                "average": "Input-dependent",
                "worst": "O(N!)"
            },

            "space_complexity": {

                "auxiliary": "O(N)",

                "explanation": (
                    "O(N) for recursion depth, board "
                    "representation, and column/diagonal "
                    "tracking; excludes stored solutions "
                    "and visualization events."
                )
            },

            "growth_function": "N!",

            "complexity_class": "Factorial",

            "description": (
                "Theoretical backtracking bound. Each row "
                "tries candidate columns and uses constant-"
                "average-time set lookups to prune column "
                "and diagonal conflicts. Visualization "
                "snapshot costs are measured separately."
            )
        },

        # -----------------------------------
        # 2. Graph Coloring
        # -----------------------------------

        "graph_coloring": {

            "name": "Graph Coloring",

            "time_complexity": {
                "best": "O(V)",
                "average": "Input-dependent",
                "worst": "O(K^V * V)"
            },

            "space_complexity": {

                "auxiliary": "O(V)",

                "explanation": (
                    "O(V) for color assignments and "
                    "recursion depth; excludes stored "
                    "solutions and visualization events."
                )
            },

            "growth_function": "K^V",

            "complexity_class": "Exponential",

            "description": (
                "Theoretical backtracking bound. Up to K "
                "colors are considered for each of V "
                "vertices; checking a candidate may scan "
                "up to O(V) adjacent vertices. Visualization "
                "snapshot costs are measured separately."
            )
        },

        # -----------------------------------
        # 3. Subset Sum
        # -----------------------------------

        "subset_sum": {

            "name": "Subset Sum",

            "time_complexity": {
                "best": "O(N)",
                "average": "Input-dependent",
                "worst": "O(2^N)"
            },

            "space_complexity": {

                "auxiliary": "O(N)",

                "explanation": (
                    "O(N) for recursion depth, suffix-bound "
                    "arrays, and the selected-index path; "
                    "excludes stored solutions and "
                    "visualization events."
                )
            },

            "growth_function": "2^N",

            "complexity_class": "Exponential",

            "description": (
                "Theoretical backtracking bound. Each "
                "element creates include and exclude "
                "branches, while precomputed suffix "
                "minimum and maximum sums prune branches "
                "that cannot reach the target. The O(N) "
                "suffix preprocessing is included in the "
                "best case. Visualization snapshot costs "
                "are measured separately."
            )
        },

        # -----------------------------------
        # 4. Hamiltonian Cycle
        # -----------------------------------

        "hamiltonian_cycle": {

            "name": "Hamiltonian Cycle",

            "time_complexity": {
                "best": "O(V)",
                "average": "Input-dependent",
                "worst": "O(V!)"
            },

            "space_complexity": {

                "auxiliary": "O(V)",

                "explanation": (
                    "O(V) for the path, visited set, and "
                    "recursion depth; excludes stored "
                    "solutions and visualization events."
                )
            },

            "growth_function": "V!",

            "complexity_class": "Factorial",

            "description": (
                "Theoretical backtracking bound with a "
                "fixed start vertex, visited-set membership, "
                "and adjacency-list traversal. Fixing the "
                "start avoids rotational duplicates; "
                "canonical orientation avoids storing "
                "reverse duplicates. Visualization snapshot "
                "costs are measured separately."
            )
        }
    }

    @classmethod
    def analyze(cls, problem_id: str) -> dict[str, Any]:

        normalized_id = (
            problem_id.strip()
            .lower()
            .replace("-", "_")
            .replace(" ", "_")
        )

        if normalized_id not in cls.COMPLEXITY_DATA:

            raise ValueError(
                f"Complexity analysis is not supported for: "
                f"{problem_id}"
            )

        result = cls.COMPLEXITY_DATA[normalized_id]

        return {
            "problem_id": normalized_id,
            **result
        }