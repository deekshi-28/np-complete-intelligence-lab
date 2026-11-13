
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BenchmarkRunRequest(BaseModel):
    """
    Configuration for running performance benchmarks
    across multiple input sizes.
    """

    model_config = ConfigDict(extra="forbid")

    problem_id: Literal[
        "n_queens",
        "graph_coloring",
        "subset_sum",
        "hamiltonian_cycle"
    ]

    sizes: list[int] = Field(
        min_length=2,
        max_length=10,
        description="Input sizes to benchmark."
    )

    repeats: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of repetitions per input size."
    )

    max_solutions: int = Field(
        default=1,
        ge=1,
        le=1000
    )

    max_events: int = Field(
        default=100,
        ge=100,
        le=20000
    )

    num_colors: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of colors for Graph Coloring."
    )

    @model_validator(mode="after")
    def validate_sizes(self):

        if any(size < 1 for size in self.sizes):
            raise ValueError(
                "All benchmark sizes must be positive integers."
            )

        if len(set(self.sizes)) != len(self.sizes):
            raise ValueError(
                "Benchmark sizes must be unique."
            )

        if self.problem_id == "n_queens":
            if any(size > 14 for size in self.sizes):
                raise ValueError(
                    "N-Queens supports a maximum size of 14."
                )

        elif self.problem_id == "graph_coloring":
            if any(size > 20 for size in self.sizes):
                raise ValueError(
                    "Graph Coloring supports a maximum of 20 vertices."
                )

        elif self.problem_id == "subset_sum":
            if any(size > 30 for size in self.sizes):
                raise ValueError(
                    "Subset Sum supports a maximum of 30 elements."
                )

        elif self.problem_id == "hamiltonian_cycle":
            if any(size < 3 or size > 15 for size in self.sizes):
                raise ValueError(
                    "Hamiltonian Cycle supports sizes from 3 to 15."
                )

        return self
