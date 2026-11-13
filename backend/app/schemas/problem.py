from pydantic import BaseModel, Field, ConfigDict, model_validator


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


def validate_undirected_graph(adjacency: dict[str, list[str]]):
    """Validate graph structure and undirected edges."""

    if not adjacency:
        raise ValueError("Graph cannot be empty.")

    vertices = set(adjacency.keys())

    for vertex, neighbors in adjacency.items():

        if not vertex.strip():
            raise ValueError("Vertex names cannot be empty.")

        if len(neighbors) != len(set(neighbors)):
            raise ValueError(
                f"Duplicate neighbors found for vertex {vertex}."
            )

        for neighbor in neighbors:

            if neighbor not in vertices:
                raise ValueError(
                    f"Unknown vertex {neighbor}."
                )

            if neighbor == vertex:
                raise ValueError(
                    f"Self-loops are not allowed: {vertex}."
                )

            if vertex not in adjacency[neighbor]:
                raise ValueError(
                    f"Edge {vertex}-{neighbor} must be "
                    "present in both adjacency lists."
                )

    return adjacency


# -----------------------------------
# 1. N-Queens
# -----------------------------------

class NQueensInput(StrictInput):

    n: int = Field(
        ge=1,
        le=14,
        description="Size of the chessboard (N x N)."
    )


# -----------------------------------
# 2. Graph Coloring
# -----------------------------------

class GraphColoringInput(StrictInput):

    adjacency: dict[str, list[str]]

    num_colors: int = Field(
        ge=1,
        le=10
    )

    @model_validator(mode="after")
    def validate_graph(self):
        validate_undirected_graph(self.adjacency)
        return self


# -----------------------------------
# 3. Subset Sum
# -----------------------------------

class SubsetSumInput(StrictInput):

    numbers: list[int] = Field(
        min_length=1,
        max_length=30
    )

    target: int


# -----------------------------------
# 4. Hamiltonian Cycle
# -----------------------------------

class HamiltonianCycleInput(StrictInput):

    adjacency: dict[str, list[str]]

    @model_validator(mode="after")
    def validate_graph(self):
        validate_undirected_graph(self.adjacency)

        if len(self.adjacency) < 3:
            raise ValueError(
                "Hamiltonian Cycle requires at least 3 vertices."
            )

        return self
