from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.schemas.problem import GraphColoringInput
from app.schemas.problem import SubsetSumInput
from app.schemas.problem import HamiltonianCycleInput


class NQueensRunRequest(BaseModel):

    model_config = ConfigDict(extra="forbid")

    n: int = Field(
        ge=1,
        le=14,
        description="Chessboard size"
    )

    max_solutions: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Maximum number of solutions to collect"
    )

    max_events: int = Field(
        default=5000,
        ge=100,
        le=20000,
        description="Maximum number of execution events to record"
    )


from app.schemas.problem import GraphColoringInput


class GraphColoringRunRequest(GraphColoringInput):

    max_solutions: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Maximum number of valid colorings to collect"
    )

    max_events: int = Field(
        default=5000,
        ge=100,
        le=20000,
        description="Maximum execution events to record"
    )

    @model_validator(mode="after")
    def validate_execution_size(self):

        if len(self.adjacency) > 20:
            raise ValueError(
                "Graph Coloring currently supports "
                "a maximum of 20 vertices per execution."
            )

        return self

class SubsetSumRunRequest(SubsetSumInput):
    max_solutions: int = Field(default=100, ge=1, le=1000)
    max_events: int = Field(default=5000, ge=100, le=20000)

class HamiltonianCycleRunRequest(HamiltonianCycleInput):
    max_solutions: int = Field(
        default=100,
        ge=1,
        le=1000
    )

    max_events: int = Field(
        default=5000,
        ge=100,
        le=20000
    )

    @model_validator(mode="after")
    def validate_execution_size(self):
        if len(self.adjacency) > 15:
            raise ValueError(
                "Hamiltonian Cycle currently supports "
                "a maximum of 15 vertices per execution."
            )

        return self