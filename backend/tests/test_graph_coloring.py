
import pytest

from app.algorithms.graph_coloring import GraphColoringSolver


def test_triangle_with_three_colors():

    graph = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=3
    )

    result = solver.solve()

    assert result["is_colorable"] is True
    assert result["solutions_found"] > 0
    assert result["search_complete"] is True


def test_triangle_with_two_colors():

    graph = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=2
    )

    result = solver.solve()

    assert result["is_colorable"] is False
    assert result["solutions_found"] == 0
    assert result["search_complete"] is True


def test_square_with_two_colors():

    graph = {
        "A": ["B", "D"],
        "B": ["A", "C"],
        "C": ["B", "D"],
        "D": ["A", "C"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=2
    )

    result = solver.solve()

    assert result["is_colorable"] is True
    assert result["solutions_found"] > 0


def test_all_solutions_are_valid():

    graph = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=3
    )

    result = solver.solve()

    for solution in result["solutions"]:

        for vertex, neighbors in graph.items():

            for neighbor in neighbors:

                assert (
                    solution[vertex] != solution[neighbor]
                )


def test_solution_limit():

    graph = {
        "A": ["B"],
        "B": ["A", "C"],
        "C": ["B"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=3,
        max_solutions=2
    )

    result = solver.solve()

    assert result["solutions_found"] == 2
    assert result["search_complete"] is False
    assert result["stop_reason"] == "solution_limit_reached"


def test_execution_events():

    graph = {
        "A": ["B", "C"],
        "B": ["A", "C"],
        "C": ["A", "B"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=3
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


def test_single_vertex_graph():

    graph = {
        "A": []
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=1
    )

    result = solver.solve()

    assert result["is_colorable"] is True
    assert result["solutions_found"] == 1


def test_empty_solution_for_zero_colors_is_not_supported():
    # The API schema requires at least one color.
    from app.schemas.algorithm import GraphColoringRunRequest

    with pytest.raises(ValueError):
        GraphColoringRunRequest(
            adjacency={"A": []},
            num_colors=0
        )


def test_all_vertices_are_colored():

    graph = {
        "A": ["B"],
        "B": ["A", "C"],
        "C": ["B"]
    }

    solver = GraphColoringSolver(
        adjacency=graph,
        num_colors=3
    )

    result = solver.solve()

    for solution in result["solutions"]:
        assert set(solution.keys()) == set(graph.keys())
