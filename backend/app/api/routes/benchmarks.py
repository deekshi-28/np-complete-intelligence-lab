
from fastapi import APIRouter, HTTPException

from app.schemas.benchmark import BenchmarkRunRequest
from app.experiments.benchmark_runner import BenchmarkRunner
from app.experiments.benchmark_analyzer import BenchmarkAnalyzer


router = APIRouter(
    prefix="/benchmarks",
    tags=["Benchmarking"]
)


@router.post("/run")
def run_benchmark(request: BenchmarkRunRequest):
    """
    Execute benchmarks for a selected algorithm
    and analyze the resulting performance measurements.
    """

    try:
        benchmark_data = BenchmarkRunner.run(request)

        analysis = BenchmarkAnalyzer.analyze(
            benchmark_data
        )

        return {
            "status": "success",
            "benchmark": benchmark_data,
            "analysis": analysis
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error
