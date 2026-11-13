from app.analyzers.execution_analyzer import ExecutionAnalyzer


def sample_execution():
    return {
        "problem": "Hamiltonian Cycle",
        "result": "SOLUTION_FOUND",
        "search_complete": True,
        "stop_reason": "search_exhausted",
        "solutions_found": 1,

        "metrics": {
            "recursive_calls": 5,
            "decisions": 4,
            "valid_moves": 4,
            "pruned_moves": 0,
            "backtracks": 4,
            "elapsed_time_ms": 0.5
        },

        "visualization": {
            "events": [
                {"event_type": "START", "depth": 0},
                {"event_type": "DECISION", "depth": 1},
                {"event_type": "VALID", "depth": 1},
                {"event_type": "SOLUTION", "depth": 3},
                {"event_type": "BACKTRACK", "depth": 1}
            ],
            "events_truncated": False
        }
    }


def test_performance_analysis_exists():
    result = ExecutionAnalyzer.analyze(sample_execution())

    assert "performance_analysis" in result


def test_acceptance_rate():
    result = ExecutionAnalyzer.analyze(sample_execution())

    assert (
        result["performance_analysis"]["acceptance_rate_percent"]
        == 100.0
    )


def test_pruning_rate():
    result = ExecutionAnalyzer.analyze(sample_execution())

    assert (
        result["performance_analysis"]["pruning_rate_percent"]
        == 0.0
    )


def test_branching_factor():
    result = ExecutionAnalyzer.analyze(sample_execution())

    assert (
        result["performance_analysis"]["average_branching_factor"]
        == 0.8
    )


def test_maximum_depth():
    result = ExecutionAnalyzer.analyze(sample_execution())

    assert result["state_space_analysis"]["maximum_recorded_depth"] == 3


def test_event_distribution():
    result = ExecutionAnalyzer.analyze(sample_execution())

    distribution = result["state_space_analysis"]["event_distribution"]

    assert distribution["START"] == 1
    assert distribution["DECISION"] == 1
    assert distribution["VALID"] == 1


def test_truncated_events():
    execution = sample_execution()
    execution["visualization"]["events_truncated"] = True

    result = ExecutionAnalyzer.analyze(execution)

    assert result["state_space_analysis"]["events_truncated"] is True
    assert result["state_space_analysis"]["event_statistics_complete"] is False


def test_zero_division_protection():
    execution = sample_execution()

    execution["metrics"] = {
        "recursive_calls": 0,
        "decisions": 0,
        "valid_moves": 0,
        "pruned_moves": 0,
        "backtracks": 0,
        "elapsed_time_ms": 0
    }

    result = ExecutionAnalyzer.analyze(execution)

    assert result["performance_analysis"]["acceptance_rate_percent"] == 0
    assert result["performance_analysis"]["pruning_rate_percent"] == 0
    assert result["performance_analysis"]["average_branching_factor"] == 0