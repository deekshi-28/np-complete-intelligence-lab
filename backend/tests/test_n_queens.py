
import pytest

from app.algorithms.n_queens import NQueensSolver


@pytest.mark.parametrize(
    "n, expected",
    [
        (1, 1),
        (2, 0),
        (3, 0),
        (4, 2),
        (5, 10),
        (6, 4),
        (7, 40),
        (8, 92)
    ]
)
def test_n_queens_solution_count(n, expected):

    solver = NQueensSolver(
        n=n,
        max_solutions=100,
        max_events=20000
    )

    result = solver.solve()

    assert result["solutions_found"] == expected
    assert result["search_complete"] is True


def test_all_solutions_are_valid():

    solver = NQueensSolver(
        n=8,
        max_solutions=100
    )

    result = solver.solve()

    for solution in result["solutions"]:

        assert len(set(solution)) == 8

        for row1 in range(8):
            for row2 in range(row1 + 1, 8):

                assert abs(
                    solution[row1] - solution[row2]
                ) != abs(row1 - row2)


def test_solution_limit():

    solver = NQueensSolver(
        n=8,
        max_solutions=5
    )

    result = solver.solve()

    assert result["solutions_found"] == 5
    assert result["search_complete"] is False


def test_execution_events():

    solver = NQueensSolver(
        n=4,
        max_solutions=100
    )

    result = solver.solve()

    events = result["visualization"]["events"]

    event_types = {
        event["event_type"] for event in events
    }

    assert "START" in event_types
    assert "DECISION" in event_types
    assert "VALID" in event_types
    assert "PRUNE" in event_types
    assert "SOLUTION" in event_types
    assert "COMPLETE" in event_types
