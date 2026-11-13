from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from app.analyzers.complexity_analyzer import ComplexityAnalyzer
from app.schemas.complexity import ComplexityResponse

from app.services.problem_registry import (
    get_all_problems,
    get_problem
)

from app.schemas.problem import (
    NQueensInput,
    GraphColoringInput,
    SubsetSumInput,
    HamiltonianCycleInput
)


router = APIRouter(
    prefix="/problems",
    tags=["Problem Management"]
)


# Input schema mapping
INPUT_SCHEMAS = {
    "n-queens": NQueensInput,
    "graph-coloring": GraphColoringInput,
    "subset-sum": SubsetSumInput,
    "hamiltonian-cycle": HamiltonianCycleInput
}


# GET: List all available problems
@router.get("/")
def list_problems():

    return {
        "total": len(get_all_problems()),
        "problems": get_all_problems()
    }


# GET: Retrieve one problem
@router.get("/{problem_id}")
def retrieve_problem(problem_id: str):

    problem = get_problem(problem_id)

    if problem is None:
        raise HTTPException(
            status_code=404,
            detail="Problem not found."
        )

    return problem


# POST: Validate problem input
@router.post("/{problem_id}/validate")
def validate_problem_input(
    problem_id: str,
    payload: dict
):

    if problem_id not in INPUT_SCHEMAS:
        raise HTTPException(
            status_code=404,
            detail="Unknown problem identifier."
        )

    schema = INPUT_SCHEMAS[problem_id]

    try:
        validated_input = schema.model_validate(payload)

        return {
            "valid": True,
            "problem_id": problem_id,
            "message": "Input validation successful.",
            "validated_input": validated_input.model_dump()
        }

    except ValidationError as error:
        raise HTTPException(
            status_code=422,
            detail=error.errors(include_url=False)
        )

# GET: Retrieve theoretical complexity analysis
@router.get(
    "/{problem_id}/complexity",
    response_model=ComplexityResponse
)
def analyze_problem_complexity(problem_id: str):

    # Check whether the problem exists
    problem = get_problem(problem_id)

    if problem is None:
        raise HTTPException(
            status_code=404,
            detail="Problem not found."
        )

    try:

        result = ComplexityAnalyzer.analyze(problem_id)

        return {
            "success": True,
            "problem_id": problem_id,
            "problem_name": problem["name"],
            "analysis": result
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )