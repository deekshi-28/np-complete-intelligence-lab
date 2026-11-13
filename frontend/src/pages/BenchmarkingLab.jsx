import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Play,
  RefreshCw,
  Timer,
  TrendingUp,
} from "lucide-react";
import { runBenchmark } from "../services/api";
import "./BenchmarkingLab.css";

const PROBLEMS = {
  n_queens: { label: "N-Queens", defaultSizes: "4, 5, 6", max: 14, unit: "N" },
  graph_coloring: {
    label: "Graph Coloring",
    defaultSizes: "4, 5, 6",
    max: 20,
    unit: "Vertices",
  },
  subset_sum: {
    label: "Subset Sum",
    defaultSizes: "5, 8, 10",
    max: 30,
    unit: "Elements",
  },
  hamiltonian_cycle: {
    label: "Hamiltonian Cycle",
    defaultSizes: "4, 5, 6",
    max: 15,
    min: 3,
    unit: "Vertices",
  },
};

const number = (value, digits = 3) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "—";
const integer = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—";

function MetricChart({
  title,
  subtitle,
  rows,
  valueKey,
  color = "blue",
  formatter = number,
}) {
  const maxValue = Math.max(
    0,
    ...rows.map((row) => Number(row[valueKey]) || 0),
  );
  return (
    <section className="bench-panel">
      <div className="bench-panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <BarChart3 size={19} />
      </div>
      {rows.length === 0 ? (
        <div className="bench-empty-chart">
          Run a benchmark to display measurements.
        </div>
      ) : (
        <div className="bench-bars">
          {rows.map((row) => {
            const value = Number(row[valueKey]) || 0;
            const width =
              maxValue > 0
                ? Math.max(value > 0 ? 2 : 0, (value / maxValue) * 100)
                : 0;
            return (
              <div className="bench-bar-row" key={row.input_size}>
                <span className="bench-bar-label">{row.input_size}</span>
                <div className="bench-bar-track">
                  <div
                    className={`bench-bar-fill ${color}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <strong>{formatter(value)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function BenchmarkingLab() {
  const [problemId, setProblemId] = useState("n_queens");
  const [sizesText, setSizesText] = useState(PROBLEMS.n_queens.defaultSizes);
  const [repeats, setRepeats] = useState(3);
  const [maxSolutions, setMaxSolutions] = useState(1);
  const [maxEvents, setMaxEvents] = useState(500);
  const [numColors, setNumColors] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const benchmark = payload?.benchmark;
  const analysis = payload?.analysis;
  const rows = analysis?.results || [];
  const rawResults = benchmark?.results || [];
  const selectedProblem = PROBLEMS[problemId];

  const summary = useMemo(() => {
    if (!rows.length) return null;
    return {
      avgTime:
        rows.reduce((sum, row) => sum + (Number(row.average_time_ms) || 0), 0) /
        rows.length,
      maxCalls: Math.max(
        ...rows.map((row) => Number(row.recursive_calls) || 0),
      ),
      maxSize: Math.max(...rows.map((row) => Number(row.input_size) || 0)),
    };
  }, [rows]);

  function handleProblemChange(nextProblem) {
    setProblemId(nextProblem);
    setSizesText(PROBLEMS[nextProblem].defaultSizes);
    setPayload(null);
    setError("");
  }

  async function handleRun(event) {
    event.preventDefault();
    setError("");
    const sizes = sizesText
      .split(/[ ,;]+/)
      .filter(Boolean)
      .map(Number);
    if (sizes.length < 2 || sizes.some((size) => !Number.isInteger(size))) {
      setError(
        "Enter at least two valid integer input sizes, separated by commas.",
      );
      return;
    }
    if (new Set(sizes).size !== sizes.length) {
      setError("Input sizes must be unique.");
      return;
    }
    if (
      sizes.some(
        (size) =>
          size < (selectedProblem.min || 1) || size > selectedProblem.max,
      )
    ) {
      setError(
        `${selectedProblem.label} sizes must be between ${selectedProblem.min || 1} and ${selectedProblem.max}.`,
      );
      return;
    }
    setLoading(true);
    try {
      const result = await runBenchmark({
        problem_id: problemId,
        sizes,
        repeats: Number(repeats),
        max_solutions: Number(maxSolutions),
        max_events: Number(maxEvents),
        num_colors: Number(numColors),
      });
      setPayload(result);
    } catch (requestError) {
      setError(requestError.message || "Benchmark execution failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="benchmark-page">
      <div className="benchmark-header">
        <div>
          <div className="bench-eyebrow">
            <Activity size={14} /> PERFORMANCE EXPERIMENTS
          </div>
          <h1>Benchmarking Lab</h1>
          <p>
            Measure execution time and search activity across multiple input
            sizes.
          </p>
        </div>
        <div className="bench-header-icon">
          <TrendingUp size={30} />
        </div>
      </div>

      <form className="bench-config bench-panel" onSubmit={handleRun}>
        <div className="bench-panel-heading">
          <div>
            <h2>Experiment Configuration</h2>
            <p>Choose an algorithm and configure its benchmark workload.</p>
          </div>
          <SettingsIcon />
        </div>
        <div className="bench-form-grid">
          <label>
            Algorithm
            <select
              value={problemId}
              onChange={(event) => handleProblemChange(event.target.value)}
            >
              {Object.entries(PROBLEMS).map(([id, item]) => (
                <option value={id} key={id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Input sizes ({selectedProblem.unit})
            <input
              value={sizesText}
              onChange={(event) => setSizesText(event.target.value)}
              placeholder="4, 5, 6"
            />
            <small>
              Enter 2–10 unique sizes; supported range:{" "}
              {selectedProblem.min || 1}–{selectedProblem.max}.
            </small>
          </label>
          <label>
            Repeats per size
            <input
              type="number"
              min="1"
              max="10"
              value={repeats}
              onChange={(event) => setRepeats(event.target.value)}
            />
          </label>
          <label>
            Maximum solutions
            <input
              type="number"
              min="1"
              max="1000"
              value={maxSolutions}
              onChange={(event) => setMaxSolutions(event.target.value)}
            />
            <small>1 measures search up to the first solution.</small>
          </label>
          <label>
            Maximum recorded events
            <input
              type="number"
              min="100"
              max="20000"
              step="100"
              value={maxEvents}
              onChange={(event) => setMaxEvents(event.target.value)}
            />
          </label>
          {problemId === "graph_coloring" && (
            <label>
              Number of colors
              <input
                type="number"
                min="1"
                max="10"
                value={numColors}
                onChange={(event) => setNumColors(event.target.value)}
              />
            </label>
          )}
        </div>
        {error && (
          <div className="bench-error">
            <AlertCircle size={17} />
            {error}
          </div>
        )}
        <div className="bench-form-actions">
          <span>Each input size is executed {repeats || 0} time(s).</span>
          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="bench-spin" size={17} /> Running
                benchmark…
              </>
            ) : (
              <>
                <Play size={17} /> Run Benchmark
              </>
            )}
          </button>
        </div>
      </form>

      {!payload && !loading && (
        <div className="bench-intro-note">
          <Timer size={20} />
          <div>
            <strong>Ready to measure</strong>
            <p>
              Configure the experiment and run it to generate timing,
              recursive-call, and growth-analysis results.
            </p>
          </div>
        </div>
      )}
      {loading && (
        <div className="bench-loading">
          <RefreshCw className="bench-spin" size={20} /> Executing benchmark
          runs and analyzing measurements…
        </div>
      )}

      {payload && (
        <>
          <div className="bench-results-title">
            <div>
              <h2>Benchmark Results</h2>
              <p>
                {PROBLEMS[benchmark.problem_id]?.label || benchmark.problem_id}{" "}
                · {benchmark.repeats} repetitions per input size
              </p>
            </div>
            <span className="bench-success">Completed</span>
          </div>
          <div className="bench-stat-grid">
            <div className="bench-stat">
              <span>Input sizes tested</span>
              <strong>{benchmark.benchmark_count}</strong>
              <small>Distinct configurations</small>
            </div>
            <div className="bench-stat">
              <span>Mean across size averages</span>
              <strong>
                {number(summary?.avgTime, 4)} <i>ms</i>
              </strong>
              <small>Average execution time</small>
            </div>
            <div className="bench-stat">
              <span>Highest recursive calls</span>
              <strong>{integer(summary?.maxCalls)}</strong>
              <small>Across tested sizes</small>
            </div>
            <div className="bench-stat">
              <span>Largest input</span>
              <strong>{summary?.maxSize}</strong>
              <small>{selectedProblem.unit}</small>
            </div>
          </div>

          <div className="bench-chart-grid">
            <MetricChart
              title="Execution Time"
              subtitle="Average instrumented solver time (ms)"
              rows={rows}
              valueKey="average_time_ms"
              color="blue"
              formatter={(value) => `${number(value, 4)} ms`}
            />
            <MetricChart
              title="Recursive Calls"
              subtitle="Mean recursive calls per run"
              rows={rows}
              valueKey="recursive_calls"
              color="purple"
              formatter={integer}
            />
            <MetricChart
              title="Search Decisions"
              subtitle="Mean decisions made per run"
              rows={rows}
              valueKey="decisions"
              color="cyan"
              formatter={integer}
            />
            <MetricChart
              title="Backtracking Activity"
              subtitle="Mean backtracks per run"
              rows={rows}
              valueKey="backtracks"
              color="orange"
              formatter={integer}
            />
          </div>

          <section className="bench-panel bench-table-panel">
            <div className="bench-panel-heading">
              <div>
                <h3>Detailed Measurements</h3>
                <p>Aggregated metrics for each tested input size.</p>
              </div>
            </div>
            <div className="bench-table-wrap">
              <table className="bench-table">
                <thead>
                  <tr>
                    <th>Input size</th>
                    <th>Avg. time (ms)</th>
                    <th>Min (ms)</th>
                    <th>Max (ms)</th>
                    <th>Std. dev.</th>
                    <th>CV (%)</th>
                    <th>Recursive calls</th>
                    <th>Decisions</th>
                    <th>Backtracks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.input_size}>
                      <td>{row.input_size}</td>
                      <td>{number(row.average_time_ms, 4)}</td>
                      <td>{number(row.minimum_time_ms, 4)}</td>
                      <td>{number(row.maximum_time_ms, 4)}</td>
                      <td>{number(row.standard_deviation_ms, 4)}</td>
                      <td>
                        {number(row.coefficient_of_variation_percent, 2)}%
                      </td>
                      <td>{integer(row.recursive_calls)}</td>
                      <td>{integer(row.decisions)}</td>
                      <td>{integer(row.backtracks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bench-panel growth-panel">
            <div className="bench-panel-heading">
              <div>
                <h3>Empirical Growth Analysis</h3>
                <p>Pairwise comparison between consecutive input sizes.</p>
              </div>
              <TrendingUp size={19} />
            </div>
            {analysis.growth_analysis?.length ? (
              <div className="bench-table-wrap">
                <table className="bench-table">
                  <thead>
                    <tr>
                      <th>Size transition</th>
                      <th>Input-size ratio</th>
                      <th>Execution-time ratio</th>
                      <th>Empirical scaling exponent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.growth_analysis.map((item, index) => (
                      <tr
                        key={`${item.from_input_size}-${item.to_input_size}-${index}`}
                      >
                        <td>
                          {item.from_input_size} → {item.to_input_size}
                        </td>
                        <td>{number(item.input_size_ratio, 4)}</td>
                        <td>
                          {item.execution_time_ratio == null
                            ? "—"
                            : number(item.execution_time_ratio, 4)}
                        </td>
                        <td>
                          {item.empirical_scaling_exponent == null
                            ? "—"
                            : number(item.empirical_scaling_exponent, 4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="bench-muted">
                At least two analyzed sizes are required for pairwise growth
                estimates.
              </p>
            )}
            <p className="bench-interpretation">{analysis.interpretation}</p>
          </section>

          <section className="bench-caveats">
            <strong>How to interpret these measurements</strong>
            <ul>
              <li>
                Execution time is instrumented solver wall-clock time; it
                includes event-recording overhead.
              </li>
              <li>
                When the solution limit is reached, <code>search_complete</code>{" "}
                is false because the search stopped early. This is expected for
                a first-solution benchmark.
              </li>
              <li>
                Empirical scaling describes only these generated instances. It
                does not establish theoretical worst-case complexity.
              </li>
            </ul>
            <div className="bench-run-status">
              {rawResults.filter((item) => item.search_complete).length} of{" "}
              {rawResults.length} size configurations completed exhaustive
              search ·{" "}
              {rawResults.filter((item) => item.events_truncated).length}{" "}
              reported event truncation
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SettingsIcon() {
  return <span className="bench-settings-mark">CONFIG</span>;
}
