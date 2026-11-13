from pydantic import BaseModel


class TimeComplexity(BaseModel):
    best: str
    average: str
    worst: str


class SpaceComplexity(BaseModel):
    auxiliary: str
    explanation: str


class ComplexityAnalysis(BaseModel):
    problem_id: str
    name: str
    time_complexity: TimeComplexity
    space_complexity: SpaceComplexity
    growth_function: str
    complexity_class: str
    description: str


class ComplexityResponse(BaseModel):
    success: bool
    problem_id: str
    problem_name: str
    analysis: ComplexityAnalysis