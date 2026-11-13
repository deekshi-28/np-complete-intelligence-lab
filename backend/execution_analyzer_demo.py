from app.algorithms.n_queens import NQueensSolver
from app.algorithms.graph_coloring import GraphColoringSolver
from app.algorithms.subset_sum import SubsetSumSolver
from app.algorithms.hamiltonian_cycle import HamiltonianCycleSolver

from app.analyzers.execution_analyzer import ExecutionAnalyzer


# 1. N-Queens
n_queens = NQueensSolver(
    n=4,
    max_solutions=100,
    max_events=5000
)


# 2. Graph Coloring
graph_coloring = GraphColoringSolver(
    adjacency={
        0: [1, 2],
        1: [0, 2],
        2: [0, 1]
    },
    num_colors=3,
    max_solutions=100,
    max_events=5000
)


# 3. Subset Sum
subset_sum = SubsetSumSolver(
    numbers=[3, 4, 5],
    target=7,
    max_solutions=100,
    max_events=5000
)


# 4. Hamiltonian Cycle
hamiltonian_cycle = HamiltonianCycleSolver(
    adjacency={
        0: [1, 2],
        1: [0, 2],
        2: [0, 1]
    },
    max_solutions=100,
    max_events=5000
)


solvers = {
    "N-Queens": n_queens,
    "Graph Coloring": graph_coloring,
    "Subset Sum": subset_sum,
    "Hamiltonian Cycle": hamiltonian_cycle
}


for name, solver in solvers.items():

    execution_result = solver.solve()

    analysis = ExecutionAnalyzer.analyze(
        execution_result
    )

    print("\n" + "=" * 60)

    print("PROBLEM:", name)

    print("EXECUTION STATUS:")
    print(analysis["execution_status"])

    print("\nEXECUTION METRICS:")
    print(analysis["execution_metrics"])

    print("\nSTATE SPACE ANALYSIS:")
    print(analysis["state_space_analysis"])

    print("=" * 60)