import pytest

from app.algorithms.subset_sum import SubsetSumSolver
from app.schemas.algorithm import SubsetSumRunRequest


def test_basic_subset_sum():

    solver = SubsetSumSolver(
        numbers=[3, 4, 5, 2],
        target=7
    )

    result = solver.solve()

    assert result["is_satisfiable"] is True
    assert result["solutions_found"] == 2

    found = [
        sorted(solution["values"])
        for solution in result["solutions"]
    ]

    assert [3, 4] in found
    assert [2, 5] in found


def test_no_solution():

    solver = SubsetSumSolver(
        numbers=[2, 4, 6],
        target=5
    )

    result = solver.solve()

    assert result["is_satisfiable"] is False
    assert result["solutions_found"] == 0
    assert result["search_complete"] is True


def test_negative_numbers():

    solver = SubsetSumSolver(
        numbers=[-2, 3, 5],
        target=1
    )

    result = solver.solve()

    assert result["is_satisfiable"] is True

    found = [
        sorted(solution["values"])
        for solution in result["solutions"]
    ]

    assert [-2, 3] in found


def test_duplicate_numbers():

    solver = SubsetSumSolver(
        numbers=[2, 2, 3],
        target=4
    )

    result = solver.solve()

    assert result["solutions_found"] == 1

    solution = result["solutions"][0]

    assert solution["values"] == [2, 2]
    assert solution["indices"] == [0, 1]


def test_zero_target():

    solver = SubsetSumSolver(
        numbers=[1, -1],
        target=0
    )

    result = solver.solve()

    assert result["is_satisfiable"] is True

    found = [
        solution["values"]
        for solution in result["solutions"]
    ]

    assert [] in found
    assert [1, -1] in found


def test_solution_limit():

    solver = SubsetSumSolver(
        numbers=[1, 2, 3],
        target=3,
        max_solutions=1
    )

    result = solver.solve()

    assert result["solutions_found"] == 1
    assert result["search_complete"] is False
    assert result["stop_reason"] == "solution_limit_reached"


def test_execution_events():

    solver = SubsetSumSolver(
        numbers=[3, 4, 5, 2],
        target=7
    )

    result = solver.solve()

    event_types = {
        event["event_type"]
        for event in result["visualization"]["events"]
    }

    assert "START" in event_types
    assert "DECISION" in event_types
    assert "VALID" in event_types
    assert "PRUNE" in event_types
    assert "SOLUTION" in event_types
    assert "BACKTRACK" in event_types
    assert "COMPLETE" in event_types


def test_every_solution_matches_target():

    solver = SubsetSumSolver(
        numbers=[2, 3, 5, 7],
        target=10
    )

    result = solver.solve()

    for solution in result["solutions"]:
        assert sum(solution["values"]) == 10


def test_solution_indices_are_valid():

    numbers = [4, 6, 2, 8]

    solver = SubsetSumSolver(
        numbers=numbers,
        target=10
    )

    result = solver.solve()

    for solution in result["solutions"]:

        reconstructed = [
            numbers[i]
            for i in solution["indices"]
        ]

        assert reconstructed == solution["values"]
        assert sum(reconstructed) == 10


def test_request_schema():

    request = SubsetSumRunRequest(
        numbers=[3, 4, 5, 2],
        target=7
    )

    assert request.numbers == [3, 4, 5, 2]
    assert request.target == 7
    assert request.max_solutions == 100


def test_invalid_empty_numbers():

    with pytest.raises(ValueError):

        SubsetSumRunRequest(
            numbers=[],
            target=7
        )