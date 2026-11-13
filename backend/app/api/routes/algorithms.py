from fastapi import APIRouter
from app.analyzers.execution_analyzer import ExecutionAnalyzer

from app.algorithms.n_queens import NQueensSolver
from app.schemas.algorithm import NQueensRunRequest

from app.algorithms.graph_coloring import GraphColoringSolver
from app.schemas.algorithm import GraphColoringRunRequest

from app.algorithms.subset_sum import SubsetSumSolver
from app.schemas.algorithm import SubsetSumRunRequest

from app.schemas.algorithm import HamiltonianCycleRunRequest
from app.algorithms.hamiltonian_cycle import HamiltonianCycleSolver


router = APIRouter(
    prefix="/algorithms",
    tags=["Algorithm Execution"]
)


@router.post("/n-queens/run")
def run_n_queens(request: NQueensRunRequest):

    solver = NQueensSolver(
        n=request.n,
        max_solutions=request.max_solutions,
        max_events=request.max_events
    )

    return execute_and_analyze(solver)


@router.post("/graph-coloring/run")
def run_graph_coloring(request: GraphColoringRunRequest):

    solver = GraphColoringSolver(
        adjacency=request.adjacency,
        num_colors=request.num_colors,
        max_solutions=request.max_solutions,
        max_events=request.max_events
    )

    return execute_and_analyze(solver)

@router.post("/subset-sum/run")
def run_subset_sum(request: SubsetSumRunRequest):

    solver = SubsetSumSolver(
        numbers=request.numbers,
        target=request.target,
        max_solutions=request.max_solutions,
        max_events=request.max_events
    )

    return execute_and_analyze(solver)

@router.post("/hamiltonian-cycle/run")
def run_hamiltonian_cycle(
    request: HamiltonianCycleRunRequest
):
    solver = HamiltonianCycleSolver(
        adjacency=request.adjacency,
        max_solutions=request.max_solutions,
        max_events=request.max_events
    )

    return execute_and_analyze(solver)

def execute_and_analyze(solver):

    # Execute the selected algorithm
    execution_result = solver.solve()

    # Analyze the execution results
    analysis = ExecutionAnalyzer.analyze(
        execution_result
    )

    # Attach analysis to original response
    execution_result["execution_analysis"] = analysis

    return execution_result