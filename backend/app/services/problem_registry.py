
PROBLEMS = {

    "n-queens": {
        "id": "n-queens",
        "name": "N-Queens Problem",
        "category": "Constraint Satisfaction",
        "type": "Search Problem",
        "description": (
            "Place N queens on an N x N chessboard "
            "so that no two queens attack each other."
        ),
        "input_parameters": {
            "n": {
                "type": "integer",
                "minimum": 1,
                "maximum": 14
            }
        },
        "constraints": [
            "One queen per row",
            "No two queens in the same column",
            "No two queens on the same diagonal"
        ],
        "technique": "Backtracking",
        "complexity_classification": (
            "Backtracking search; not classified as "
            "an NP-Complete problem in this formulation."
        )
    },

    "graph-coloring": {
        "id": "graph-coloring",
        "name": "Graph Coloring",
        "category": "Graph Theory",
        "type": "Decision Problem",
        "description": (
            "Determine whether the vertices of a graph "
            "can be colored using a given number of colors "
            "such that adjacent vertices have different colors."
        ),
        "input_parameters": {
            "adjacency": "Undirected adjacency list",
            "num_colors": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10
            }
        },
        "constraints": [
            "Every vertex receives one color",
            "Adjacent vertices cannot share a color"
        ],
        "technique": "Backtracking",
        "complexity_classification": (
            "NP-Complete for general k-colorability "
            "when k >= 3; 2-colorability is polynomial-time solvable."
        )
    },

    "subset-sum": {
        "id": "subset-sum",
        "name": "Subset Sum Problem",
        "category": "Combinatorial Optimization",
        "type": "Decision Problem",
        "description": (
            "Determine whether a subset of the given numbers "
            "has a sum equal to the target."
        ),
        "input_parameters": {
            "numbers": "Integer array",
            "target": "Target integer"
        },
        "constraints": [
            "Each input element can be selected at most once",
            "Selected elements must sum to the target"
        ],
        "technique": "Backtracking",
        "complexity_classification": (
            "NP-Complete in the standard binary-encoded "
            "decision formulation."
        )
    },

    "hamiltonian-cycle": {
        "id": "hamiltonian-cycle",
        "name": "Hamiltonian Cycle Problem",
        "category": "Graph Theory",
        "type": "Decision Problem",
        "description": (
            "Determine whether an undirected graph contains "
            "a cycle that visits every vertex exactly once."
        ),
        "input_parameters": {
            "adjacency": "Undirected adjacency list"
        },
        "constraints": [
            "Every vertex must be visited exactly once",
            "Consecutive vertices must have an edge",
            "Last vertex must connect to the starting vertex"
        ],
        "technique": "Backtracking",
        "complexity_classification": (
            "NP-Complete in its standard decision formulation."
        )
    }
}


def get_all_problems():
    return list(PROBLEMS.values())


def get_problem(problem_id: str):
    return PROBLEMS.get(problem_id)
