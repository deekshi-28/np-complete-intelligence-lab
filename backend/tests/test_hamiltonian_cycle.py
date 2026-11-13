
import pytest

from app.algorithms.hamiltonian_cycle import HamiltonianCycleSolver
from app.schemas.algorithm import HamiltonianCycleRunRequest


def test_triangle_has_one_hamiltonian_cycle():
    adjacency = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    assert result["is_hamiltonian"] is True
    assert result["solutions_found"] == 1


def test_square_has_one_undirected_cycle():
    adjacency = {
        "A": ["B", "D"],
        "B": ["A", "C"],
        "C": ["B", "D"],
        "D": ["A", "C"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    assert result["is_hamiltonian"] is True
    assert result["solutions_found"] == 1


def test_complete_graph_k4_has_three_unique_cycles():
    adjacency = {
        "A": ["B", "C", "D"],
        "B": ["A", "C", "D"],
        "C": ["A", "B", "D"],
        "D": ["A", "B", "C"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    assert result["is_hamiltonian"] is True
    assert result["solutions_found"] == 3


def test_graph_without_hamiltonian_cycle():
    adjacency = {
        "A": ["B", "C"],
        "B": ["A"],
        "C": ["A", "D"],
        "D": ["C"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    assert result["is_hamiltonian"] is False
    assert result["solutions_found"] == 0
    assert result["solutions"] == []


def test_every_solution_visits_all_vertices_once():
    adjacency = {
        "A": ["B", "C", "D"],
        "B": ["A", "C", "D"],
        "C": ["A", "B", "D"],
        "D": ["A", "B", "C"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    for cycle in result["solutions"]:
        assert len(cycle) == len(adjacency) + 1
        assert cycle[0] == cycle[-1]
        assert len(set(cycle[:-1])) == len(adjacency)


def test_every_cycle_edge_exists():
    adjacency = {
        "A": ["B", "C", "D"],
        "B": ["A", "C", "D"],
        "C": ["A", "B", "D"],
        "D": ["A", "B", "C"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    for cycle in result["solutions"]:
        for index in range(len(cycle) - 1):
            current = cycle[index]
            next_vertex = cycle[index + 1]

            assert next_vertex in adjacency[current]


def test_solution_limit():
    adjacency = {
        "A": ["B", "C", "D"],
        "B": ["A", "C", "D"],
        "C": ["A", "B", "D"],
        "D": ["A", "B", "C"]
    }

    solver = HamiltonianCycleSolver(
        adjacency,
        max_solutions=1
    )

    result = solver.solve()

    assert result["solutions_found"] == 1
    assert result["search_complete"] is False
    assert result["stop_reason"] == "solution_limit_reached"


def test_execution_events():
    adjacency = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    event_types = {
        event["event_type"]
        for event in result["visualization"]["events"]
    }

    assert "START" in event_types
    assert "DECISION" in event_types
    assert "VALID" in event_types
    assert "SOLUTION" in event_types
    assert "BACKTRACK" in event_types
    assert "COMPLETE" in event_types


def test_execution_metrics():
    adjacency = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = HamiltonianCycleSolver(adjacency)
    result = solver.solve()

    metrics = result["metrics"]

    assert metrics["recursive_calls"] > 0
    assert metrics["decisions"] > 0
    assert metrics["valid_moves"] > 0
    assert metrics["elapsed_time_ms"] >= 0


def test_request_schema():
    request = HamiltonianCycleRunRequest(
        adjacency={
            "A": ["B", "C"],
            "B": ["A", "C"],
            "C": ["A", "B"]
        },
        max_solutions=10,
        max_events=1000
    )

    assert request.max_solutions == 10
    assert request.max_events == 1000


def test_request_schema_rejects_too_many_vertices():
    adjacency = {
        f"V{i}": [
            f"V{(i + 1) % 16}",
            f"V{(i - 1) % 16}"
        ]
        for i in range(16)
    }

    with pytest.raises(ValueError):
        HamiltonianCycleRunRequest(
            adjacency=adjacency
        )
