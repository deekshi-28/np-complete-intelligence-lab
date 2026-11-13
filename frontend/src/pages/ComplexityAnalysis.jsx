import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  Gauge,
  Info,
  BarChart3,
  Calculator,
  Network,
} from "lucide-react";
import "./ComplexityAnalysis.css";

const algorithms = [
  {
    id: "n-queens",
    name: "N-Queens",
    description: "Places N queens on an N × N chessboard without conflicts.",
    best: "O(N)",
    average: "Input-dependent",
    worst: "O(N!)",
    space: "O(N)",
    className: "factorial",
    growth: "Factorial",
    note: "The search can grow factorially as the board size increases.",
  },
  {
    id: "graph-coloring",
    name: "Graph Coloring",
    description:
      "Assigns colors to graph vertices so adjacent vertices differ.",
    best: "O(V)",
    average: "Input-dependent",
    worst: "O(K^V × V)",
    space: "O(V)",
    className: "exponential",
    growth: "Exponential",
    note: "The search may explore up to K choices for each of V vertices.",
  },
  {
    id: "subset-sum",
    name: "Subset Sum",
    description: "Finds subsets whose elements add up to a target value.",
    best: "O(N)",
    average: "Input-dependent",
    worst: "O(2^N)",
    space: "O(N)",
    className: "exponential",
    growth: "Exponential",
    note: "Each element can be included or excluded, creating up to 2^N subsets.",
  },
  {
    id: "hamiltonian-cycle",
    name: "Hamiltonian Cycle",
    description: "Finds a cycle that visits every graph vertex exactly once.",
    best: "O(V)",
    average: "Input-dependent",
    worst: "O(V!)",
    space: "O(V)",
    className: "factorial",
    growth: "Factorial",
    note: "The search explores possible vertex orderings, which can grow factorially.",
  },
];

const growthFunctions = [
  { key: "linear", label: "O(n)", color: "#38bdf8" },
  { key: "linearithmic", label: "O(n log n)", color: "#34d399" },
  { key: "quadratic", label: "O(n²)", color: "#fbbf24" },
  { key: "exponential", label: "O(2ⁿ)", color: "#fb923c" },
  { key: "factorial", label: "O(n!)", color: "#f87171" },
];

function calculateGrowth(type, n) {
  switch (type) {
    case "linear":
      return n;
    case "linearithmic":
      return n * Math.log2(Math.max(n, 1));
    case "quadratic":
      return n * n;
    case "exponential":
      return Math.pow(2, n);
    case "factorial": {
      let result = 1;
      for (let i = 2; i <= n; i++) result *= i;
      return result;
    }
    default:
      return 0;
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "Very large";
  if (value >= 1e12) return value.toExponential(2);
  return Math.round(value).toLocaleString("en-IN");
}

function ComplexityAnalysis({ onBack }) {
  const [inputSize, setInputSize] = useState(8);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("n-queens");

  const selected = algorithms.find(
    (algorithm) => algorithm.id === selectedAlgorithm,
  );

  const chartData = useMemo(() => {
    const sizes = Array.from({ length: 12 }, (_, index) => index + 1);

    const series = growthFunctions.map((growth) => ({
      ...growth,
      values: sizes.map((n) => calculateGrowth(growth.key, n)),
    }));

    const allValues = series.flatMap((item) => item.values);
    const maxLog = Math.max(...allValues.map((value) => Math.log10(value + 1)));

    const chartWidth = 760;
    const chartHeight = 260;
    const left = 48;
    const right = 12;
    const top = 16;
    const bottom = 32;

    const points = series.map((item) => ({
      ...item,
      path: item.values
        .map((value, index) => {
          const x =
            left + (index / (sizes.length - 1)) * (chartWidth - left - right);

          const logValue = Math.log10(value + 1);
          const y =
            chartHeight -
            bottom -
            (logValue / maxLog) * (chartHeight - top - bottom);

          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" "),
    }));

    return { sizes, points, chartWidth, chartHeight, left, right, top, bottom };
  }, []);

  const currentGrowth = growthFunctions.map((growth) => ({
    ...growth,
    value: calculateGrowth(growth.key, inputSize),
  }));

  return (
    <div className="complexity-page">
      <header className="complexity-header">
        <div className="complexity-heading">
          <button
            className="complexity-back-button"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <div className="complexity-title-row">
            <div className="complexity-title-icon">
              <BarChart3 size={25} />
            </div>
            <div>
              <h1>Complexity Analysis</h1>
              <p>
                Understand algorithmic growth, theoretical limits, and
                scalability.
              </p>
            </div>
          </div>
        </div>

        <div className="complexity-header-tag">
          <Activity size={15} />
          Theoretical Analysis
        </div>
      </header>

      <section className="complexity-info-banner">
        <Info size={19} />
        <p>
          This module presents theoretical time and space complexity. These
          growth functions are not measured execution times. Actual performance
          depends on the input and search behavior.
        </p>
      </section>

      <section className="complexity-section">
        <div className="complexity-section-heading">
          <div>
            <span className="complexity-eyebrow">01 / GROWTH COMPARISON</span>
            <h2>Complexity Growth Chart</h2>
            <p>Compare how common complexity classes grow with input size.</p>
          </div>
          <span className="complexity-section-icon">
            <TrendingUp size={20} />
          </span>
        </div>

        <div className="complexity-card">
          <div className="complexity-chart-legend">
            {growthFunctions.map((growth) => (
              <div className="complexity-legend-item" key={growth.key}>
                <span
                  className="complexity-legend-dot"
                  style={{ backgroundColor: growth.color }}
                />
                {growth.label}
              </div>
            ))}
          </div>

          <div className="complexity-chart-container">
            <svg
              viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
              className="complexity-chart"
              role="img"
              aria-label="Logarithmic comparison of algorithmic growth functions"
            >
              {[0, 1, 2, 3, 4].map((line) => {
                const y =
                  chartData.top +
                  (line / 4) *
                    (chartData.chartHeight - chartData.top - chartData.bottom);

                return (
                  <line
                    key={line}
                    x1={chartData.left}
                    x2={chartData.chartWidth - chartData.right}
                    y1={y}
                    y2={y}
                    className="complexity-grid-line"
                  />
                );
              })}

              {chartData.sizes.map((size, index) => {
                const x =
                  chartData.left +
                  (index / (chartData.sizes.length - 1)) *
                    (chartData.chartWidth - chartData.left - chartData.right);

                return (
                  <text
                    key={size}
                    x={x}
                    y={chartData.chartHeight - 8}
                    textAnchor="middle"
                    className="complexity-axis-label"
                  >
                    {size}
                  </text>
                );
              })}

              {chartData.points.map((series) => (
                <path
                  key={series.key}
                  d={series.path}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="complexity-chart-line"
                />
              ))}
            </svg>
          </div>

          <div className="complexity-chart-caption">
            <span>Input size (n)</span>
            <span>Logarithmic vertical scale</span>
          </div>
        </div>
      </section>

      <section className="complexity-section">
        <div className="complexity-section-heading">
          <div>
            <span className="complexity-eyebrow">
              02 / ALGORITHM COMPARISON
            </span>
            <h2>Implemented Algorithm Complexity</h2>
            <p>Compare the four backtracking problems in this project.</p>
          </div>
          <span className="complexity-section-icon">
            <Network size={20} />
          </span>
        </div>

        <div className="complexity-algorithm-grid">
          {algorithms.map((algorithm) => (
            <button
              type="button"
              key={algorithm.id}
              className={`complexity-algorithm-card ${
                selectedAlgorithm === algorithm.id ? "selected" : ""
              }`}
              onClick={() => setSelectedAlgorithm(algorithm.id)}
            >
              <div className="complexity-algorithm-card-top">
                <span className="complexity-algorithm-name">
                  {algorithm.name}
                </span>
                <span className={`complexity-class ${algorithm.className}`}>
                  {algorithm.growth}
                </span>
              </div>
              <p>{algorithm.description}</p>
              <div className="complexity-card-complexity">
                <span>Worst-case time</span>
                <strong>{algorithm.worst}</strong>
              </div>
              <span className="complexity-card-link">
                {selectedAlgorithm === algorithm.id
                  ? "Currently selected"
                  : "View detailed analysis"}
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="complexity-detail-card">
            <div className="complexity-detail-heading">
              <div>
                <span className="complexity-eyebrow">SELECTED ALGORITHM</span>
                <h3>{selected.name}</h3>
                <p>{selected.description}</p>
              </div>
              <Gauge size={25} />
            </div>

            <div className="complexity-detail-grid">
              <div>
                <span>Best-case time</span>
                <strong>{selected.best}</strong>
              </div>
              <div>
                <span>Average-case time</span>
                <strong>{selected.average}</strong>
              </div>
              <div>
                <span>Worst-case time</span>
                <strong>{selected.worst}</strong>
              </div>
              <div>
                <span>Auxiliary space</span>
                <strong>{selected.space}</strong>
              </div>
            </div>

            <div className="complexity-detail-note">
              <Info size={17} />
              <p>{selected.note}</p>
            </div>
          </div>
        )}
      </section>

      <section className="complexity-section">
        <div className="complexity-section-heading">
          <div>
            <span className="complexity-eyebrow">
              03 / INTERACTIVE SIMULATOR
            </span>
            <h2>Input-Size Growth Simulator</h2>
            <p>
              Change the input size to compare theoretical operation growth.
            </p>
          </div>
          <span className="complexity-section-icon">
            <Calculator size={20} />
          </span>
        </div>

        <div className="complexity-card complexity-simulator">
          <div className="complexity-slider-heading">
            <label htmlFor="complexity-input-size">Input size (n)</label>
            <strong>{inputSize}</strong>
          </div>

          <input
            id="complexity-input-size"
            className="complexity-slider"
            type="range"
            min="1"
            max="12"
            value={inputSize}
            onChange={(event) => setInputSize(Number(event.target.value))}
          />

          <div className="complexity-slider-labels">
            <span>1</span>
            <span>12</span>
          </div>

          <div className="complexity-growth-results">
            {currentGrowth.map((growth) => (
              <div className="complexity-growth-result" key={growth.key}>
                <div className="complexity-growth-result-top">
                  <span
                    className="complexity-legend-dot"
                    style={{ backgroundColor: growth.color }}
                  />
                  <span>{growth.label}</span>
                </div>
                <strong>{formatNumber(growth.value)}</strong>
                <small>Relative growth value</small>
              </div>
            ))}
          </div>

          <p className="complexity-simulator-footnote">
            Values are mathematical growth-function outputs, not actual
            instruction counts or execution-time measurements. The factorial and
            exponential values illustrate why large inputs become
            computationally expensive.
          </p>
        </div>
      </section>

      <section className="complexity-section">
        <div className="complexity-section-heading">
          <div>
            <span className="complexity-eyebrow">04 / SCALABILITY</span>
            <h2>Understanding Scalability</h2>
            <p>How the growth classes affect practical algorithm execution.</p>
          </div>
        </div>

        <div className="complexity-scalability-grid">
          <div className="complexity-scale-item scale-linear">
            <span>Polynomial growth</span>
            <h3>O(n), O(n²)</h3>
            <p>
              Growth is generally more manageable as input size increases,
              although higher polynomial powers can still become expensive.
            </p>
          </div>

          <div className="complexity-scale-item scale-exponential">
            <span>Exponential growth</span>
            <h3>O(2ⁿ)</h3>
            <p>
              The number of possible operations can approximately double
              whenever the input size increases by one.
            </p>
          </div>

          <div className="complexity-scale-item scale-factorial">
            <span>Factorial growth</span>
            <h3>O(n!)</h3>
            <p>
              The number of possible orderings increases rapidly, making larger
              search spaces especially difficult to explore.
            </p>
          </div>
        </div>
      </section>

      <footer className="complexity-footer">
        <span>NP-Complete Intelligence Lab</span>
        <span>Complexity Modeling & Scalability Analysis</span>
      </footer>
    </div>
  );
}

export default ComplexityAnalysis;
