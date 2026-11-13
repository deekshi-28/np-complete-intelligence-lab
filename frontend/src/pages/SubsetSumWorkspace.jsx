import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Layers3,
  AlertTriangle,
  CheckCircle2,
  Target,
} from "lucide-react";

import "./SubsetSumWorkspace.css";
import { saveExecution } from "../services/executionHistory";
import { runSubsetSum } from "../services/api";

const EVENT_COLORS = {
  START: "#64748b",
  DECISION: "#60a5fa",
  VALID: "#34d399",
  PRUNE: "#f87171",
  BACKTRACK: "#fbbf24",
  SOLUTION: "#a78bfa",
  COMPLETE: "#94a3b8",
};

function getEventColor(type) {
  return EVENT_COLORS[String(type || "").toUpperCase()] || "#64748b";
}

function buildStateTree(events, activeStateId) {
  const stateMap = new Map();

  // COMPLETE is an execution lifecycle event, not a search-tree state.
  events.forEach((event) => {
    const type = String(event.event_type || "UNKNOWN").toUpperCase();

    if (
      type === "COMPLETE" ||
      event.state_id === undefined ||
      event.state_id === null
    ) {
      return;
    }

    const id = String(event.state_id);
    const parentId = event.parent_id == null ? null : String(event.parent_id);

    if (!stateMap.has(id)) {
      stateMap.set(id, {
        id,
        parentId,
        depth: Number(event.depth) || 0,
        status: type,
        decision: event.decision || "",
        state: event.state || {},
        eventCount: 0,
      });
    }

    const node = stateMap.get(id);

    node.eventCount += 1;
    node.status = type;
    node.state = event.state || node.state;
    node.decision = event.decision || node.decision;

    if (node.parentId === null && parentId !== null) {
      node.parentId = parentId;
    }

    node.depth = Math.max(node.depth, Number(event.depth) || 0);
  });

  // Build the parent-child relationships.
  const children = new Map();

  stateMap.forEach((node) => {
    children.set(node.id, []);
  });

  stateMap.forEach((node) => {
    if (node.parentId !== null && stateMap.has(node.parentId)) {
      children.get(node.parentId).push(node.id);
    }
  });

  const NODE_WIDTH = 170;
  const NODE_HEIGHT = 88;
  const H_GAP = 42;
  const V_GAP = 95;

  const roots = [...stateMap.values()]
    .filter((node) => node.parentId === null || !stateMap.has(node.parentId))
    .map((node) => node.id);

  const positions = new Map();
  const visited = new Set();

  // Calculate the complete width needed by each subtree.
  function subtreeWidth(id, ancestors = new Set()) {
    if (ancestors.has(id)) return NODE_WIDTH;

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(id);

    const childIds = children.get(id) || [];

    if (childIds.length === 0) {
      return NODE_WIDTH;
    }

    const childrenWidth = childIds.reduce(
      (total, childId) => total + subtreeWidth(childId, nextAncestors),
      0,
    );

    return Math.max(NODE_WIDTH, childrenWidth + H_GAP * (childIds.length - 1));
  }

  // Position each parent above the center of its descendants.
  function positionSubtree(id, left, depth, ancestors = new Set()) {
    if (ancestors.has(id) || visited.has(id)) return;

    visited.add(id);

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(id);

    const childIds = children.get(id) || [];

    const childWidths = childIds.map((childId) =>
      subtreeWidth(childId, nextAncestors),
    );

    const childrenWidth =
      childWidths.reduce((sum, width) => sum + width, 0) +
      H_GAP * Math.max(0, childWidths.length - 1);

    const totalWidth = Math.max(NODE_WIDTH, childrenWidth);

    positions.set(id, {
      x: left + totalWidth / 2 - NODE_WIDTH / 2,
      y: depth * (NODE_HEIGHT + V_GAP),
    });

    let childLeft = left + (totalWidth - childrenWidth) / 2;

    childIds.forEach((childId, index) => {
      positionSubtree(childId, childLeft, depth + 1, nextAncestors);
      childLeft += childWidths[index] + H_GAP;
    });
  }

  let rootLeft = 0;

  roots.forEach((rootId) => {
    const width = subtreeWidth(rootId);
    positionSubtree(rootId, rootLeft, 0);
    rootLeft += width + H_GAP * 2;
  });

  // Handle any unvisited states safely.
  stateMap.forEach((node) => {
    if (!positions.has(node.id)) {
      positionSubtree(node.id, rootLeft, node.depth);
      rootLeft += NODE_WIDTH + H_GAP;
    }
  });

  const nodes = [];
  const edges = [];

  stateMap.forEach((node) => {
    const active = String(activeStateId) === node.id;
    const color = getEventColor(node.status);

    const state = node.state || {};
    const selectedValues = Array.isArray(state.selected_values)
      ? state.selected_values
      : [];

    const currentSum = state.current_sum ?? 0;

    nodes.push({
      id: node.id,
      position: positions.get(node.id),
      data: {
        label: (
          <div className="ss-tree-node">
            <strong>State {node.id}</strong>
            <span>{node.status}</span>
            <small>Sum: {currentSum}</small>
            <small>
              Selected:{" "}
              {selectedValues.length ? selectedValues.join(", ") : "None"}
            </small>
            <small className="ss-tree-decision">
              {node.decision || "Search state"}
            </small>
            <small>{node.eventCount} event(s)</small>
          </div>
        ),
      },
      style: {
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        borderRadius: 9,
        background: active ? "#302451" : "#111c30",
        border: `2px solid ${active ? "#c4b5fd" : color}`,
        color: "#f8fafc",
        padding: 9,
        boxShadow: active ? "0 0 0 4px rgba(167,139,250,0.15)" : "none",
      },
    });

    if (node.parentId !== null && stateMap.has(node.parentId)) {
      edges.push({
        id: `ss-tree-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: "smoothstep",
        style: {
          stroke: color,
          strokeWidth: 1.7,
        },
      });
    }
  });

  return { nodes, edges };
}

function getEventState(event) {
  return event?.state && typeof event.state === "object" ? event.state : {};
}

export default function SubsetSumWorkspace({ onBack }) {
  const [numbersText, setNumbersText] = useState("3, 4, 5, 2");
  const [target, setTarget] = useState("7");
  const [maxSolutions, setMaxSolutions] = useState("20");

  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const events = result?.visualization?.events || [];
  const currentEvent = events[currentStep] || null;
  const currentState = getEventState(currentEvent);

  const selectedIndices = Array.isArray(currentState.selected_indices)
    ? currentState.selected_indices
    : [];

  const selectedValues = Array.isArray(currentState.selected_values)
    ? currentState.selected_values
    : [];

  const currentIndex = Number.isInteger(currentState.index)
    ? currentState.index
    : 0;

  const currentSum = Number(currentState.current_sum) || 0;

  const tree = useMemo(
    () => buildStateTree(events, currentEvent?.state_id),
    [events, currentEvent?.state_id],
  );

  useEffect(() => {
    if (!isPlaying || events.length === 0) return undefined;

    if (currentStep >= events.length - 1) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCurrentStep((step) => Math.min(step + 1, events.length - 1));
    }, 1000 / speed);

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStep, events.length, speed]);

  const selectEvent = useCallback((index) => {
    setIsPlaying(false);
    setCurrentStep(index);
  }, []);

  function resetPlayback() {
    setIsPlaying(false);
    setCurrentStep(0);
  }

  async function runAlgorithm() {
    setError("");
    setResult(null);
    setCurrentStep(0);
    setIsPlaying(false);

    const numbers = numbersText
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "")
      .map(Number);

    const targetValue = Number(target);
    const solutionLimit = Number(maxSolutions);

    if (
      numbers.length === 0 ||
      numbers.some((number) => !Number.isInteger(number))
    ) {
      setError("Enter a valid comma-separated list of integers.");
      return;
    }

    if (numbers.length > 18) {
      setError("For clear state-space visualization, use 18 numbers or fewer.");
      return;
    }

    if (!Number.isFinite(targetValue)) {
      setError("Enter a valid target sum.");
      return;
    }

    if (
      !Number.isInteger(solutionLimit) ||
      solutionLimit < 1 ||
      solutionLimit > 1000
    ) {
      setError("Maximum solutions must be an integer between 1 and 1000.");
      return;
    }

    setLoading(true);

    try {
      const data = await runSubsetSum({
        numbers,
        target: targetValue,
        max_solutions: solutionLimit,
        max_events: 5000,
      });

      setResult(data);
      setCurrentStep(0);

      try {
        saveExecution("subset-sum", data, {
          numbers,
          target: targetValue,
          max_solutions: solutionLimit,
        });
      } catch (historyError) {
        console.warn("Subset Sum history could not be saved:", historyError);
      }
    } catch (err) {
      setError(err.message || "Unable to execute Subset Sum.");
    } finally {
      setLoading(false);
    }
  }

  const metrics = result?.metrics || {};
  const solutions = Array.isArray(result?.solutions) ? result.solutions : [];

  const metricCards = [
    ["Recursive calls", metrics.recursive_calls ?? 0],
    ["Decisions", metrics.decisions ?? 0],
    ["Valid moves", metrics.valid_moves ?? 0],
    ["Pruned moves", metrics.pruned_moves ?? 0],
    ["Backtracks", metrics.backtracks ?? 0],
    ["Execution time", `${metrics.elapsed_time_ms ?? 0} ms`],
  ];

  const eventType = String(currentEvent?.event_type || "READY").toUpperCase();

  const isPruned = eventType === "PRUNE";
  const isSolution = eventType === "SOLUTION";

  const inputNumbers =
    result?.input?.numbers ||
    numbersText
      .split(",")
      .map((item) => Number(item.trim()))
      .filter(Number.isFinite);

  const targetValue = result?.input?.target ?? Number(target);

  return (
    <section className="ss-workspace">
      <button className="ss-back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="ss-heading">
        <div>
          <span className="ss-eyebrow">ALGORITHM WORKSPACE / BACKTRACKING</span>
          <h1>Subset Sum Visualizer</h1>
          <p>
            Explore include/exclude decisions, target reachability, pruning, and
            backtracking.
          </p>
        </div>

        <span className="ss-technique">
          <Layers3 size={15} />
          Backtracking
        </span>
      </div>

      <section className="ss-input-panel">
        <div className="ss-input-grid">
          <label className="ss-numbers-field">
            Input numbers
            <input
              type="text"
              value={numbersText}
              onChange={(event) => setNumbersText(event.target.value)}
              placeholder="Example: 3, 4, 5, 2"
            />
            <small>Enter comma-separated integers.</small>
          </label>

          <div className="ss-input-side">
            <label>
              Target sum
              <input
                type="number"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
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
            </label>

            <button
              className="ss-run-button"
              onClick={runAlgorithm}
              disabled={loading}
            >
              <Play size={16} />
              {loading ? "Running..." : "Run Algorithm"}
            </button>
          </div>
        </div>

        {error && (
          <div className="ss-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
      </section>

      {result && (
        <>
          <section
            className={`ss-result-banner ${
              result.is_satisfiable ? "success" : "failure"
            }`}
          >
            {result.is_satisfiable ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}

            <div>
              <strong>
                {result.is_satisfiable ? "SOLUTION FOUND" : "NO SOLUTION FOUND"}
              </strong>
              <span>
                {result.solutions_found ?? solutions.length} subset(s) found for
                target {result.input?.target ?? target}.
              </span>
            </div>

            <small>
              {result.search_complete ? "Search completed" : "Search stopped"}
            </small>
          </section>

          <section className="ss-metrics-grid">
            {metricCards.map(([label, value]) => (
              <div className="ss-metric-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>

          <section className="ss-top-grid">
            <div className="ss-panel ss-array-panel">
              <div className="ss-panel-heading">
                <div>
                  <h2>Array Visualization</h2>
                  <p>Current state at event {currentEvent?.event_id ?? 0}</p>
                </div>

                <span className="ss-event-badge">{eventType}</span>
              </div>

              <div className="ss-target-display">
                <Target size={17} />
                <span>Target</span>
                <strong>{targetValue}</strong>
                <span className="ss-current-sum">
                  Current sum: <b>{currentSum}</b>
                </span>
              </div>

              <div className="ss-array-grid">
                {inputNumbers.map((number, index) => {
                  const selected = selectedIndices.includes(index);
                  const active =
                    index === currentIndex &&
                    currentIndex < inputNumbers.length;

                  return (
                    <div
                      className={[
                        "ss-array-item",
                        selected ? "selected" : "",
                        active ? "active" : "",
                        isPruned && active ? "pruned" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={`${index}-${number}`}
                    >
                      <span className="ss-array-index">Index {index}</span>
                      <strong>{number}</strong>
                      <small>
                        {selected
                          ? "Included"
                          : active
                            ? "Current"
                            : "Not selected"}
                      </small>
                    </div>
                  );
                })}
              </div>

              <div className="ss-array-legend">
                <span>
                  <i className="selected-dot" /> Selected
                </span>
                <span>
                  <i className="active-dot" /> Current element
                </span>
                <span>
                  <i className="pruned-dot" /> Pruned
                </span>
              </div>

              <div className="ss-inspector">
                <strong>
                  {currentEvent?.decision || "Waiting for execution"}
                </strong>

                <p>
                  {currentEvent?.reason
                    ? currentEvent.reason.replaceAll("_", " ")
                    : "Select an event from the execution timeline to inspect the search."}
                </p>

                {isPruned && (
                  <div className="ss-prune-message">
                    <AlertTriangle size={15} />
                    This branch was pruned because the target is outside the
                    reachable remaining-sum bounds.
                  </div>
                )}

                {isSolution && (
                  <div className="ss-solution-message">
                    <CheckCircle2 size={15} />
                    The selected elements produce the target sum.
                  </div>
                )}

                <div className="ss-selected-summary">
                  <span>Selected values:</span>
                  <strong>
                    {selectedValues.length
                      ? selectedValues.join(" + ")
                      : "None"}
                  </strong>
                  <span className="ss-sum-total">= {currentSum}</span>
                </div>
              </div>

              <div className="ss-playback">
                <div className="ss-playback-buttons">
                  <button
                    title="Reset"
                    onClick={resetPlayback}
                    disabled={!events.length}
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    title="Previous event"
                    onClick={() => selectEvent(Math.max(0, currentStep - 1))}
                    disabled={!events.length || currentStep === 0}
                  >
                    <SkipBack size={16} />
                  </button>

                  <button
                    className="ss-play-main"
                    title={isPlaying ? "Pause" : "Play"}
                    onClick={() => {
                      if (isPlaying) {
                        setIsPlaying(false);
                      } else {
                        if (currentStep >= events.length - 1) {
                          setCurrentStep(0);
                        }
                        setIsPlaying(true);
                      }
                    }}
                    disabled={!events.length}
                  >
                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                  </button>

                  <button
                    title="Next event"
                    onClick={() =>
                      selectEvent(Math.min(events.length - 1, currentStep + 1))
                    }
                    disabled={
                      !events.length || currentStep >= events.length - 1
                    }
                  >
                    <SkipForward size={16} />
                  </button>

                  <select
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    aria-label="Playback speed"
                  >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </div>

                <input
                  className="ss-event-slider"
                  type="range"
                  min="0"
                  max={Math.max(0, events.length - 1)}
                  value={currentStep}
                  onChange={(event) => selectEvent(Number(event.target.value))}
                  disabled={!events.length}
                />

                <div className="ss-slider-labels">
                  <span>Event {currentEvent?.event_id ?? 0}</span>
                  <span>{events.length} total events</span>
                </div>
              </div>
            </div>

            <div className="ss-panel ss-timeline-panel">
              <div className="ss-panel-heading">
                <div>
                  <h2>Execution Timeline</h2>
                  <p>Select any event to inspect its search state.</p>
                </div>
              </div>

              <div className="ss-event-list">
                {events.map((event, index) => (
                  <button
                    key={`${event.event_id ?? index}-${event.state_id ?? "state"}`}
                    className={`ss-event-row ${
                      index === currentStep ? "selected" : ""
                    }`}
                    onClick={() => selectEvent(index)}
                  >
                    <span className="ss-event-number">
                      {event.event_id ?? index + 1}
                    </span>

                    <i
                      className="ss-event-dot"
                      style={{
                        background: getEventColor(event.event_type),
                      }}
                    />

                    <strong>{event.event_type || "EVENT"}</strong>

                    <span className="ss-event-decision">
                      {event.decision || "—"}
                    </span>

                    <span className="ss-event-depth">
                      Depth {event.depth ?? 0}
                    </span>

                    <span className="ss-event-arrow">›</span>
                  </button>
                ))}

                {events.length === 0 && (
                  <div className="ss-empty-state">
                    No execution events were returned.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="ss-panel ss-tree-panel">
            <div className="ss-panel-heading">
              <div>
                <h2>State-Space Tree</h2>
                <p>
                  Each node represents a recorded search state. The selected
                  event's state is highlighted.
                </p>
              </div>
            </div>

            <div className="ss-tree-canvas">
              {tree.nodes.length > 0 ? (
                <ReactFlow
                  nodes={tree.nodes}
                  edges={tree.edges}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable
                  nodesConnectable={false}
                  elementsSelectable
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#26344b" gap={20} />
                  <Controls />
                </ReactFlow>
              ) : (
                <div className="ss-empty-state">
                  Run the algorithm to generate the state-space tree.
                </div>
              )}
            </div>
          </section>

          <section className="ss-panel ss-solutions-panel">
            <div className="ss-panel-heading">
              <div>
                <h2>Solutions</h2>
                <p>
                  {result.solutions_found ?? solutions.length} valid subset(s)
                  discovered.
                </p>
              </div>
            </div>

            {solutions.length > 0 ? (
              <div className="ss-solutions-grid">
                {solutions.map((solution, index) => (
                  <div className="ss-solution-card" key={index}>
                    <strong>Solution {index + 1}</strong>

                    <div className="ss-solution-values">
                      {solution.values?.length ? (
                        solution.values.map((value, valueIndex) => (
                          <span key={`${valueIndex}-${value}`}>{value}</span>
                        ))
                      ) : (
                        <span>Empty subset</span>
                      )}
                    </div>

                    <div className="ss-solution-total">
                      <span>Target sum</span>
                      <strong>{solution.sum ?? targetValue}</strong>
                    </div>

                    <small>
                      Indices: {solution.indices?.join(", ") || "None"}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ss-empty-solutions">
                No valid subsets were found for this input.
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
