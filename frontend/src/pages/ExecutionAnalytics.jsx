import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  GitBranch,
  Gauge,
  RefreshCw,
  Trash2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Database,
  Eye,
} from "lucide-react";

import "./ExecutionAnalytics.css";

const STORAGE_KEY = "np_complete_execution_history";

const ALGORITHMS = [
  { id: "n-queens", name: "N-Queens", color: "#a78bfa" },
  { id: "graph-coloring", name: "Graph Coloring", color: "#60a5fa" },
  { id: "subset-sum", name: "Subset Sum", color: "#22d3ee" },
  { id: "hamiltonian-cycle", name: "Hamiltonian Cycle", color: "#fb923c" },
];

const EVENT_COLORS = {
  START: "#a78bfa",
  DECISION: "#60a5fa",
  VALID: "#34d399",
  PRUNE: "#f87171",
  BACKTRACK: "#fbbf24",
  SOLUTION: "#c084fc",
  COMPLETE: "#94a3b8",
};

function readHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read execution history:", error);
    return [];
  }
}

function getExecutionResult(record) {
  return (
    record?.result ||
    record?.executionResult ||
    record?.response ||
    record?.data ||
    {}
  );
}

function getExecutionAnalysis(record) {
  const result = getExecutionResult(record);
  return (
    result.execution_analysis ||
    result.executionAnalysis ||
    record?.execution_analysis ||
    record?.executionAnalysis ||
    {}
  );
}

function getMetrics(record) {
  const result = getExecutionResult(record);
  const analysis = getExecutionAnalysis(record);

  return (
    result.metrics ||
    analysis.execution_metrics ||
    analysis.executionMetrics ||
    result.execution_metrics ||
    record?.metrics ||
    {}
  );
}

function getStateAnalysis(record) {
  const analysis = getExecutionAnalysis(record);
  const result = getExecutionResult(record);

  return (
    analysis.state_space_analysis ||
    analysis.stateSpaceAnalysis ||
    result.state_space_analysis ||
    result.stateSpaceAnalysis ||
    {}
  );
}

function getPerformanceAnalysis(record) {
  const analysis = getExecutionAnalysis(record);
  const result = getExecutionResult(record);

  return (
    analysis.performance_analysis ||
    analysis.performanceAnalysis ||
    result.performance_analysis ||
    result.performanceAnalysis ||
    {}
  );
}

function getExecutionStatus(record) {
  const result = getExecutionResult(record);
  const analysis = getExecutionAnalysis(record);

  return (
    analysis.execution_status ||
    analysis.executionStatus ||
    result.execution_status ||
    result.executionStatus ||
    {}
  );
}

function getInput(record) {
  const result = getExecutionResult(record);
  return record?.input || result?.input || record?.request || {};
}

function getEventDistribution(record) {
  const state = getStateAnalysis(record);
  const result = getExecutionResult(record);

  return (
    state.event_distribution ||
    state.eventDistribution ||
    result.event_distribution ||
    result.eventDistribution ||
    {}
  );
}

function getRecordedEvents(record) {
  const result = getExecutionResult(record);
  const visualization =
    result.visualization ||
    result.execution_analysis?.visualization ||
    record?.visualization ||
    {};

  if (Array.isArray(visualization.events)) return visualization.events;
  if (Array.isArray(result.events)) return result.events;
  if (Array.isArray(record?.events)) return record.events;
  return [];
}

function getSolutionsFound(record) {
  const result = getExecutionResult(record);
  const status = getExecutionStatus(record);

  return Number(
    result.solutions_found ??
      result.solutionsFound ??
      status.solutions_found ??
      status.solutionsFound ??
      0,
  );
}

function getSearchComplete(record) {
  const result = getExecutionResult(record);
  const status = getExecutionStatus(record);

  return Boolean(
    result.search_complete ??
    result.searchComplete ??
    status.search_complete ??
    status.searchComplete ??
    false,
  );
}

function getAlgorithmName(record) {
  if (record?.algorithmName) return record.algorithmName;

  return (
    ALGORITHMS.find((item) => item.id === record?.algorithmId)?.name ||
    "Unknown Algorithm"
  );
}

function getRecordId(record, index = 0) {
  return String(
    record?.id ||
      `${record?.algorithmId || "execution"}-${record?.executedAt || index}`,
  );
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function formatDate(record) {
  const rawDate =
    record?.executedAt ||
    record?.createdAt ||
    record?.timestamp ||
    record?.date;

  let date = rawDate ? new Date(rawDate) : null;

  if (!date || Number.isNaN(date.getTime())) {
    const idTimestamp = Number(String(record?.id || "").split("-")[0]);
    if (Number.isFinite(idTimestamp) && idTimestamp > 1000000000000) {
      date = new Date(idTimestamp);
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTruncated(record) {
  const state = getStateAnalysis(record);
  const result = getExecutionResult(record);

  return Boolean(
    state.events_truncated ??
    state.eventsTruncated ??
    result.events_truncated ??
    result.eventsTruncated ??
    false,
  );
}

function getEventStatisticsComplete(record) {
  const state = getStateAnalysis(record);

  // Older records may not contain this field. Treat it as unknown,
  // rather than incorrectly labelling the statistics incomplete.
  if (
    state.event_statistics_complete === undefined &&
    state.eventStatisticsComplete === undefined
  ) {
    return null;
  }

  return Boolean(
    state.event_statistics_complete ?? state.eventStatisticsComplete,
  );
}

function MetricCard({ icon: Icon, label, value, description, color }) {
  return (
    <article className="ea-kpi-card">
      <div className={`ea-kpi-icon ${color}`}>
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function AnalysisCard({ label, value, description, progress, tone = "green" }) {
  return (
    <div className="ea-analysis-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {progress !== undefined && (
        <div className="ea-analysis-track">
          <div
            className={`ea-analysis-fill ${tone}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      <small>{description}</small>
    </div>
  );
}

function getSearchEfficiency(acceptanceRate) {
  if (acceptanceRate >= 70) return "High";
  if (acceptanceRate >= 40) return "Moderate";
  return "Low";
}

export default function ExecutionAnalytics() {
  const [history, setHistory] = useState(() => readHistory());
  const [filter, setFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedExecutionId, setSelectedExecutionId] = useState("");

  function refreshHistory() {
    const latest = readHistory();
    setHistory(latest);
    setLastUpdated(new Date());

    // Preserve the selected execution if it still exists.
    setSelectedExecutionId((currentId) => {
      if (
        currentId &&
        latest.some((record, index) => getRecordId(record, index) === currentId)
      ) {
        return currentId;
      }
      return latest.length ? getRecordId(latest[0], 0) : "";
    });
  }

  useEffect(() => {
    window.addEventListener("storage", refreshHistory);
    window.addEventListener("execution-history-updated", refreshHistory);

    return () => {
      window.removeEventListener("storage", refreshHistory);
      window.removeEventListener("execution-history-updated", refreshHistory);
    };
  }, []);

  const filteredHistory = useMemo(() => {
    if (filter === "all") return history;
    return history.filter((record) => record.algorithmId === filter);
  }, [history, filter]);

  useEffect(() => {
    if (!filteredHistory.length) {
      setSelectedExecutionId("");
      return;
    }

    const selectedStillVisible = filteredHistory.some(
      (record, index) => getRecordId(record, index) === selectedExecutionId,
    );

    if (!selectedStillVisible) {
      setSelectedExecutionId(getRecordId(filteredHistory[0], 0));
    }
  }, [filteredHistory, selectedExecutionId]);

  const selectedExecution = useMemo(() => {
    return (
      filteredHistory.find(
        (record, index) => getRecordId(record, index) === selectedExecutionId,
      ) ||
      filteredHistory[0] ||
      null
    );
  }, [filteredHistory, selectedExecutionId]);

  const overview = useMemo(() => {
    return filteredHistory.reduce(
      (total, record) => {
        const metrics = getMetrics(record);

        total.executions += 1;
        total.recursiveCalls += Number(metrics.recursive_calls || 0);
        total.decisions += Number(metrics.decisions || 0);
        total.validMoves += Number(metrics.valid_moves || 0);
        total.prunedMoves += Number(metrics.pruned_moves || 0);
        total.backtracks += Number(metrics.backtracks || 0);
        total.executionTime += Number(metrics.elapsed_time_ms || 0);
        total.solutions += getSolutionsFound(record);

        return total;
      },
      {
        executions: 0,
        recursiveCalls: 0,
        decisions: 0,
        validMoves: 0,
        prunedMoves: 0,
        backtracks: 0,
        executionTime: 0,
        solutions: 0,
      },
    );
  }, [filteredHistory]);

  const algorithmStats = useMemo(() => {
    return ALGORITHMS.map((algorithm) => {
      const records = filteredHistory.filter(
        (record) => record.algorithmId === algorithm.id,
      );

      const totals = records.reduce(
        (acc, record) => {
          const metrics = getMetrics(record);

          acc.recursiveCalls += Number(metrics.recursive_calls || 0);
          acc.decisions += Number(metrics.decisions || 0);
          acc.validMoves += Number(metrics.valid_moves || 0);
          acc.prunedMoves += Number(metrics.pruned_moves || 0);
          acc.backtracks += Number(metrics.backtracks || 0);
          acc.executionTime += Number(metrics.elapsed_time_ms || 0);

          return acc;
        },
        {
          recursiveCalls: 0,
          decisions: 0,
          validMoves: 0,
          prunedMoves: 0,
          backtracks: 0,
          executionTime: 0,
        },
      );

      return {
        ...algorithm,
        count: records.length,
        ...totals,
        averageTime: records.length ? totals.executionTime / records.length : 0,
      };
    });
  }, [filteredHistory]);

  const eventDistribution = useMemo(() => {
    const distribution = {};

    filteredHistory.forEach((record) => {
      const events = getEventDistribution(record);

      Object.entries(events).forEach(([event, count]) => {
        distribution[event] = (distribution[event] || 0) + Number(count || 0);
      });
    });

    return Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  }, [filteredHistory]);

  const performanceSummary = useMemo(() => {
    const decisions = overview.decisions;
    const acceptanceRate = decisions
      ? (overview.validMoves / decisions) * 100
      : 0;
    const pruningRate = decisions
      ? (overview.prunedMoves / decisions) * 100
      : 0;
    const backtrackingRate = overview.validMoves
      ? (overview.backtracks / overview.validMoves) * 100
      : 0;
    const averageBranchingFactor = overview.recursiveCalls
      ? overview.decisions / overview.recursiveCalls
      : 0;
    const averageTimePerCall = overview.recursiveCalls
      ? overview.executionTime / overview.recursiveCalls
      : 0;

    return {
      acceptanceRate,
      pruningRate,
      backtrackingRate,
      averageBranchingFactor,
      averageTimePerCall,
      searchEfficiency: getSearchEfficiency(acceptanceRate),
    };
  }, [overview]);

  const stateSpaceSummary = useMemo(() => {
    return filteredHistory.reduce(
      (acc, record) => {
        const state = getStateAnalysis(record);

        acc.totalEvents += Number(state.total_events_recorded || 0);
        acc.maximumDepth = Math.max(
          acc.maximumDepth,
          Number(state.maximum_recorded_depth || 0),
        );

        if (getTruncated(record)) acc.truncatedExecutions += 1;

        const statsComplete = getEventStatisticsComplete(record);
        if (statsComplete === false) acc.incompleteStatistics += 1;
        if (statsComplete === null) acc.unknownStatistics += 1;

        acc.executions += 1;
        return acc;
      },
      {
        totalEvents: 0,
        maximumDepth: 0,
        truncatedExecutions: 0,
        incompleteStatistics: 0,
        unknownStatistics: 0,
        executions: 0,
      },
    );
  }, [filteredHistory]);

  const selectedMetrics = selectedExecution
    ? getMetrics(selectedExecution)
    : {};
  const selectedState = selectedExecution
    ? getStateAnalysis(selectedExecution)
    : {};
  const selectedInput = selectedExecution ? getInput(selectedExecution) : {};
  const selectedEvents = selectedExecution
    ? getEventDistribution(selectedExecution)
    : {};
  const selectedPerformance = selectedExecution
    ? getPerformanceAnalysis(selectedExecution)
    : {};
  const selectedRecordedEvents = selectedExecution
    ? getRecordedEvents(selectedExecution)
    : [];

  const maxRecursiveCalls = Math.max(
    1,
    ...algorithmStats.map((item) => item.recursiveCalls),
  );

  const maxEventCount = Math.max(
    1,
    ...eventDistribution.map(([, count]) => count),
  );
  const averageRuntime = overview.executions
    ? overview.executionTime / overview.executions
    : 0;

  function handleClearHistory() {
    const confirmed = window.confirm(
      "Delete all saved algorithm execution history from this browser? This action cannot be undone.",
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    setSelectedExecutionId("");
    setLastUpdated(new Date());
  }

  function handleSelectExecution(event) {
    setSelectedExecutionId(event.target.value);
  }

  return (
    <section className="ea-page">
      {/* PAGE HEADER */}
      <header className="ea-header">
        <div>
          <span className="ea-eyebrow">INTELLIGENCE LAB / ANALYTICS</span>
          <h1>Execution Analytics</h1>
          <p>
            Analyze algorithm execution behaviour, recursive activity, pruning
            operations, and state-space exploration.
          </p>
          <small className="ea-updated">
            Last refreshed: {lastUpdated.toLocaleTimeString("en-IN")}
          </small>
        </div>

        <div className="ea-header-actions">
          <button
            type="button"
            className="ea-secondary-button"
            onClick={refreshHistory}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            type="button"
            className="ea-danger-button"
            onClick={handleClearHistory}
            disabled={!history.length}
          >
            <Trash2 size={15} />
            Clear History
          </button>
        </div>
      </header>

      {/* FILTER */}
      <section className="ea-filter-panel">
        <div>
          <strong>Execution Filter</strong>
          <small>Select an algorithm to filter the analytics.</small>
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All Algorithms</option>
          {ALGORITHMS.map((algorithm) => (
            <option value={algorithm.id} key={algorithm.id}>
              {algorithm.name}
            </option>
          ))}
        </select>
      </section>

      {/* EMPTY STATE */}
      {filteredHistory.length === 0 ? (
        <div className="ea-empty">
          <Database size={42} />
          <h2>No execution data available</h2>
          <p>
            Run an algorithm from its workspace. Its execution record will
            appear here if it is saved in browser Local Storage.
          </p>
          {history.length > 0 && (
            <small>
              There are saved records, but none match the selected algorithm
              filter.
            </small>
          )}
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <section className="ea-kpi-grid">
            <MetricCard
              icon={Activity}
              label="Total Executions"
              value={formatNumber(overview.executions)}
              description="Saved algorithm runs"
              color="purple"
            />
            <MetricCard
              icon={GitBranch}
              label="Recursive Calls"
              value={formatNumber(overview.recursiveCalls)}
              description="Across selected executions"
              color="blue"
            />
            <MetricCard
              icon={Gauge}
              label="Pruned Moves"
              value={formatNumber(overview.prunedMoves)}
              description="Rejected search branches"
              color="cyan"
            />
            <MetricCard
              icon={Clock3}
              label="Average Runtime"
              value={`${formatNumber(averageRuntime)} ms`}
              description="Mean recorded execution time"
              color="orange"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Solutions Found"
              value={formatNumber(overview.solutions)}
              description="Total reported solutions"
              color="green"
            />
            <MetricCard
              icon={TrendingUp}
              label="Backtracks"
              value={formatNumber(overview.backtracks)}
              description="Recorded backtracking operations"
              color="violet"
            />
          </section>

          {/* CHARTS */}
          <section className="ea-content-grid">
            <article className="ea-panel">
              <div className="ea-panel-heading">
                <div>
                  <h2>Recursive Calls by Algorithm</h2>
                  <p>Total recursive calls across saved executions.</p>
                </div>
              </div>

              <div className="ea-bar-list">
                {algorithmStats.map((item) => (
                  <div className="ea-bar-item" key={item.id}>
                    <div className="ea-bar-label">
                      <span>{item.name}</span>
                      <strong>{formatNumber(item.recursiveCalls)}</strong>
                    </div>
                    <div className="ea-bar-track">
                      <div
                        className="ea-bar-fill"
                        style={{
                          width: `${(item.recursiveCalls / maxRecursiveCalls) * 100}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                    <small>{item.count} execution(s)</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="ea-panel">
              <div className="ea-panel-heading">
                <div>
                  <h2>Event Distribution</h2>
                  <p>Recorded state-space event types.</p>
                </div>
              </div>

              {eventDistribution.length > 0 ? (
                <div className="ea-bar-list">
                  {eventDistribution.map(([event, count]) => (
                    <div className="ea-bar-item" key={event}>
                      <div className="ea-bar-label">
                        <span>
                          <i
                            className="ea-event-dot"
                            style={{
                              background: EVENT_COLORS[event] || "#64748b",
                            }}
                          />
                          {event}
                        </span>
                        <strong>{formatNumber(count)}</strong>
                      </div>
                      <div className="ea-bar-track">
                        <div
                          className="ea-bar-fill"
                          style={{
                            width: `${(count / maxEventCount) * 100}%`,
                            background: EVENT_COLORS[event] || "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ea-no-data">
                  <AlertTriangle size={17} />
                  Event distribution is unavailable in these records.
                </div>
              )}
            </article>
          </section>

          {/* PERFORMANCE ANALYSIS */}
          <section className="ea-panel">
            <div className="ea-panel-heading">
              <div>
                <h2>Performance Analysis</h2>
                <p>
                  Aggregate search behaviour across the executions selected by
                  the algorithm filter.
                </p>
              </div>
              <span
                className={`ea-efficiency ${performanceSummary.searchEfficiency.toLowerCase()}`}
              >
                {performanceSummary.searchEfficiency} Efficiency
              </span>
            </div>

            <div className="ea-analysis-grid">
              <AnalysisCard
                label="Acceptance Rate"
                value={`${formatNumber(performanceSummary.acceptanceRate)}%`}
                description="Valid moves / decisions"
                progress={performanceSummary.acceptanceRate}
                tone="green"
              />
              <AnalysisCard
                label="Pruning Rate"
                value={`${formatNumber(performanceSummary.pruningRate)}%`}
                description="Pruned moves / decisions"
                progress={performanceSummary.pruningRate}
                tone="red"
              />
              <AnalysisCard
                label="Average Branching Factor"
                value={formatNumber(
                  performanceSummary.averageBranchingFactor,
                  4,
                )}
                description="Decisions / recursive calls (operational ratio)"
              />
              <AnalysisCard
                label="Backtracking Rate"
                value={`${formatNumber(performanceSummary.backtrackingRate)}%`}
                description="Backtracks / valid moves"
                progress={performanceSummary.backtrackingRate}
                tone="purple"
              />
              <AnalysisCard
                label="Average Time per Recursive Call"
                value={`${formatNumber(performanceSummary.averageTimePerCall, 4)} ms`}
                description="Total execution time / recursive calls"
              />
              <AnalysisCard
                label="Search Efficiency"
                value={performanceSummary.searchEfficiency}
                description="Heuristic label based on aggregate acceptance rate"
              />
            </div>
          </section>

          {/* STATE-SPACE ANALYSIS */}
          <section className="ea-panel">
            <div className="ea-panel-heading">
              <div>
                <h2>State-Space Analysis</h2>
                <p>
                  Search depth, recorded events and event-capture completeness.
                </p>
              </div>
            </div>

            <div className="ea-analysis-grid">
              <AnalysisCard
                label="Maximum Search Depth"
                value={formatNumber(stateSpaceSummary.maximumDepth)}
                description="Deepest recorded state across selected runs"
              />
              <AnalysisCard
                label="Total Recorded Events"
                value={formatNumber(stateSpaceSummary.totalEvents)}
                description="Sum of recorded state-space events"
              />
              <AnalysisCard
                label="Truncated Executions"
                value={formatNumber(stateSpaceSummary.truncatedExecutions)}
                description="Runs where event recording was truncated"
              />
              <AnalysisCard
                label="Event Statistics Incomplete"
                value={formatNumber(stateSpaceSummary.incompleteStatistics)}
                description="Runs explicitly marked as incomplete"
              />
              <AnalysisCard
                label="Event Statistics Unknown"
                value={formatNumber(stateSpaceSummary.unknownStatistics)}
                description="Older records without a completeness flag"
              />
              <AnalysisCard
                label="Event Recording Status"
                value={
                  stateSpaceSummary.truncatedExecutions > 0
                    ? "Truncated"
                    : stateSpaceSummary.unknownStatistics > 0
                      ? "Partially Known"
                      : "Complete"
                }
                description="Based on the metadata stored in execution history"
              />
            </div>
          </section>

          {/* ALGORITHM COMPARISON */}
          <section className="ea-panel">
            <div className="ea-panel-heading">
              <div>
                <h2>Algorithm Performance Comparison</h2>
                <p>
                  Aggregated execution metrics. Runtime is the average of
                  recorded runs for each algorithm.
                </p>
              </div>
            </div>

            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Runs</th>
                    <th>Recursive Calls</th>
                    <th>Decisions</th>
                    <th>Valid Moves</th>
                    <th>Pruned</th>
                    <th>Backtracks</th>
                    <th>Avg. Runtime</th>
                  </tr>
                </thead>
                <tbody>
                  {algorithmStats.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span
                          className="ea-algorithm-dot"
                          style={{ background: item.color }}
                        />
                        {item.name}
                      </td>
                      <td>{item.count}</td>
                      <td>{formatNumber(item.recursiveCalls)}</td>
                      <td>{formatNumber(item.decisions)}</td>
                      <td>{formatNumber(item.validMoves)}</td>
                      <td>{formatNumber(item.prunedMoves)}</td>
                      <td>{formatNumber(item.backtracks)}</td>
                      <td>
                        {item.count
                          ? `${formatNumber(item.averageTime)} ms`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* RECENT EXECUTIONS */}
          <section className="ea-panel ea-history-panel">
            <div className="ea-panel-heading">
              <div>
                <h2>Recent Executions</h2>
                <p>Saved algorithm runs from this browser.</p>
              </div>
              <span className="ea-record-count">
                {filteredHistory.length} records
              </span>
            </div>

            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Date &amp; Time</th>
                    <th>Recursive Calls</th>
                    <th>Execution Time</th>
                    <th>Solutions</th>
                    <th>Search Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((record, index) => {
                    const metrics = getMetrics(record);
                    const complete = getSearchComplete(record);
                    const recordId = getRecordId(record, index);

                    return (
                      <tr
                        key={recordId}
                        className={
                          selectedExecutionId === recordId
                            ? "ea-selected-row"
                            : ""
                        }
                      >
                        <td>{getAlgorithmName(record)}</td>
                        <td>{formatDate(record)}</td>
                        <td>{formatNumber(metrics.recursive_calls)}</td>
                        <td>{formatNumber(metrics.elapsed_time_ms)} ms</td>
                        <td>{formatNumber(getSolutionsFound(record))}</td>
                        <td>
                          <span
                            className={`ea-status ${
                              complete ? "complete" : "partial"
                            }`}
                          >
                            {complete ? "Complete" : "Stopped / Partial"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ea-inspect-button"
                            onClick={() => setSelectedExecutionId(recordId)}
                            aria-label={`Inspect ${getAlgorithmName(record)} execution`}
                          >
                            <Eye size={14} />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* INDIVIDUAL EXECUTION DETAILS */}
          {selectedExecution && (
            <section className="ea-panel ea-detail-panel">
              <div className="ea-panel-heading ea-detail-heading">
                <div>
                  <h2>Execution Details</h2>
                  <p>
                    Inspect the input, execution metrics and event distribution
                    of one saved run.
                  </p>
                </div>

                <div className="ea-detail-select-wrap">
                  <label htmlFor="ea-execution-select">
                    Selected execution
                  </label>
                  <select
                    id="ea-execution-select"
                    value={selectedExecutionId}
                    onChange={handleSelectExecution}
                  >
                    {filteredHistory.map((record, index) => (
                      <option
                        key={getRecordId(record, index)}
                        value={getRecordId(record, index)}
                      >
                        {getAlgorithmName(record)} — {formatDate(record)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ea-detail-meta">
                <span>
                  <strong>Algorithm:</strong>{" "}
                  {getAlgorithmName(selectedExecution)}
                </span>
                <span>
                  <strong>Executed:</strong> {formatDate(selectedExecution)}
                </span>
                <span>
                  <strong>Solutions:</strong>{" "}
                  {formatNumber(getSolutionsFound(selectedExecution))}
                </span>
                <span>
                  <strong>Status:</strong>{" "}
                  {getSearchComplete(selectedExecution)
                    ? "Search complete"
                    : "Stopped / partial"}
                </span>
              </div>

              <div className="ea-detail-grid">
                <article className="ea-detail-card">
                  <h3>Input Parameters</h3>
                  <pre className="ea-json-view">
                    {JSON.stringify(selectedInput, null, 2)}
                  </pre>
                </article>

                <article className="ea-detail-card">
                  <h3>Execution Metrics</h3>
                  <div className="ea-detail-metrics">
                    {[
                      ["Recursive Calls", selectedMetrics.recursive_calls],
                      ["Decisions", selectedMetrics.decisions],
                      ["Valid Moves", selectedMetrics.valid_moves],
                      ["Pruned Moves", selectedMetrics.pruned_moves],
                      ["Backtracks", selectedMetrics.backtracks],
                      [
                        "Execution Time",
                        `${formatNumber(selectedMetrics.elapsed_time_ms)} ms`,
                      ],
                    ].map(([label, value]) => (
                      <div className="ea-detail-metric" key={label}>
                        <span>{label}</span>
                        <strong>
                          {typeof value === "number"
                            ? formatNumber(value)
                            : (value ?? "—")}
                        </strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="ea-detail-card">
                  <h3>Event Distribution</h3>
                  {Object.keys(selectedEvents).length > 0 ? (
                    <div className="ea-detail-events">
                      {Object.entries(selectedEvents)
                        .sort((a, b) => Number(b[1]) - Number(a[1]))
                        .map(([event, count]) => (
                          <div className="ea-detail-event" key={event}>
                            <span>
                              <i
                                className="ea-event-dot"
                                style={{
                                  background: EVENT_COLORS[event] || "#64748b",
                                }}
                              />
                              {event}
                            </span>
                            <strong>{formatNumber(count)}</strong>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="ea-no-data">
                      <AlertTriangle size={16} />
                      Event distribution is not available for this execution.
                    </div>
                  )}
                  <small className="ea-detail-note">
                    {selectedRecordedEvents.length
                      ? `${selectedRecordedEvents.length} raw event records are available.`
                      : "Raw event sequence is not included in this saved record; aggregated event counts are shown when available."}
                  </small>
                </article>

                <article className="ea-detail-card">
                  <h3>State-Space Metadata</h3>
                  <div className="ea-detail-metrics">
                    <div className="ea-detail-metric">
                      <span>Total Recorded Events</span>
                      <strong>
                        {formatNumber(selectedState.total_events_recorded)}
                      </strong>
                    </div>
                    <div className="ea-detail-metric">
                      <span>Maximum Search Depth</span>
                      <strong>
                        {formatNumber(selectedState.maximum_recorded_depth)}
                      </strong>
                    </div>
                    <div className="ea-detail-metric">
                      <span>Events Truncated</span>
                      <strong>
                        {getTruncated(selectedExecution) ? "Yes" : "No"}
                      </strong>
                    </div>
                    <div className="ea-detail-metric">
                      <span>Statistics Complete</span>
                      <strong>
                        {getEventStatisticsComplete(selectedExecution) === null
                          ? "Not recorded"
                          : getEventStatisticsComplete(selectedExecution)
                            ? "Yes"
                            : "No"}
                      </strong>
                    </div>
                    <div className="ea-detail-metric">
                      <span>Acceptance Rate</span>
                      <strong>
                        {selectedPerformance.acceptance_rate_percent !==
                        undefined
                          ? `${formatNumber(selectedPerformance.acceptance_rate_percent)}%`
                          : selectedMetrics.decisions
                            ? `${formatNumber((Number(selectedMetrics.valid_moves || 0) / Number(selectedMetrics.decisions)) * 100)}%`
                            : "—"}
                      </strong>
                    </div>
                    <div className="ea-detail-metric">
                      <span>Pruning Rate</span>
                      <strong>
                        {selectedPerformance.pruning_rate_percent !== undefined
                          ? `${formatNumber(selectedPerformance.pruning_rate_percent)}%`
                          : selectedMetrics.decisions
                            ? `${formatNumber((Number(selectedMetrics.pruned_moves || 0) / Number(selectedMetrics.decisions)) * 100)}%`
                            : "—"}
                      </strong>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
