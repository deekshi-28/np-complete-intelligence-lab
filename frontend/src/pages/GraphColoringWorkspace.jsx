import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Network,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import "./GraphColoringWorkspace.css";
import { saveExecution } from "../services/executionHistory";
import { runGraphColoring } from "../services/api";

const API_BASE_URL = "http://127.0.0.1:8000";

const COLOR_PALETTE = {
  1: "#8b5cf6",
  2: "#06b6d4",
  3: "#f59e0b",
  4: "#22c55e",
  5: "#ec4899",
  6: "#ef4444",
  7: "#3b82f6",
  8: "#a3e635",
};

const EVENT_COLORS = {
  START: "#64748b",
  DECISION: "#60a5fa",
  VALID: "#34d399",
  PRUNE: "#f87171",
  BACKTRACK: "#fbbf24",
  SOLUTION: "#a78bfa",
  COMPLETE: "#94a3b8",
};

const DEFAULT_ADJACENCY = {
  A: ["B", "D"],
  B: ["A", "C"],
  C: ["B", "D"],
  D: ["A", "C"],
};

function getColor(colorNumber) {
  return COLOR_PALETTE[Number(colorNumber)] || "#64748b";
}

function getEventColor(type) {
  return EVENT_COLORS[String(type || "").toUpperCase()] || "#64748b";
}

function normalizeAdjacency(adjacency) {
  const normalized = {};

  Object.entries(adjacency).forEach(([vertex, neighbors]) => {
    normalized[String(vertex)] = [
      ...new Set(
        neighbors.map(String).filter((item) => item !== String(vertex)),
      ),
    ];
  });

  Object.keys(normalized).forEach((vertex) => {
    normalized[vertex].forEach((neighbor) => {
      if (!normalized[neighbor]) {
        normalized[neighbor] = [];
      }

      if (!normalized[neighbor].includes(vertex)) {
        normalized[neighbor].push(vertex);
      }
    });
  });

  return normalized;
}

/*
 * Backend event snapshots may expose the coloring directly as state.coloring,
 * or may store vertex assignments directly inside state.
 */

function getEventColoring(event, fallbackColoring = {}) {
  const state = event?.state;

  if (!state || typeof state !== "object") {
    return fallbackColoring;
  }

  if (
    state.coloring &&
    typeof state.coloring === "object" &&
    !Array.isArray(state.coloring) &&
    Object.keys(state.coloring).length > 0
  ) {
    return state.coloring;
  }

  const ignoredKeys = new Set([
    "attempted_vertex",
    "attempted_color",
    "conflicting_neighbors",
    "vertex",
    "color",
    "depth",
  ]);

  const coloring = Object.fromEntries(
    Object.entries(state).filter(
      ([key, value]) =>
        !ignoredKeys.has(key) &&
        (typeof value === "number" ||
          (typeof value === "string" && /^\d+$/.test(value))),
    ),
  );

  return Object.keys(coloring).length > 0 ? coloring : fallbackColoring;
}

function getAttemptedVertex(event) {
  const state = event?.state || {};

  if (state.attempted_vertex !== undefined && state.attempted_vertex !== null) {
    return String(state.attempted_vertex);
  }

  const decision = String(event?.decision || "");
  const match = decision.match(/^color_(.+)_with_\d+$/);

  return match?.[1] ?? null;
}

function getAttemptedColor(event) {
  const state = event?.state || {};

  if (state.attempted_color !== undefined && state.attempted_color !== null) {
    return Number(state.attempted_color);
  }

  const decision = String(event?.decision || "");
  const match = decision.match(/^color_.+_with_(\d+)$/);

  return match ? Number(match[1]) : null;
}

function getConflictingNeighbors(event) {
  const neighbors = event?.state?.conflicting_neighbors;

  return Array.isArray(neighbors) ? neighbors.map(String) : [];
}

function buildGraphNodes(adjacency, event, fallbackColoring = {}) {
  const vertices = Object.keys(adjacency);
  const coloring = getEventColoring(event, fallbackColoring);
  const attemptedVertex = getAttemptedVertex(event);
  const conflictingNeighbors = getConflictingNeighbors(event);

  const centerX = 300;
  const centerY = 205;
  const radius = Math.max(95, Math.min(155, vertices.length * 22));

  return vertices.map((vertex, index) => {
    const angle =
      (2 * Math.PI * index) / Math.max(vertices.length, 1) - Math.PI / 2;

    const assignedColor = coloring[vertex];
    const isAttempted = vertex === attemptedVertex;
    const isConflict = conflictingNeighbors.includes(vertex);

    const fillColor = assignedColor ? getColor(assignedColor) : "#26364e";

    let borderColor = assignedColor ? getColor(assignedColor) : "#64748b";

    if (isConflict) borderColor = "#f87171";
    if (isAttempted) borderColor = "#fbbf24";

    return {
      id: vertex,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      data: {
        label: (
          <div className="gc-vertex-label">
            <strong>{vertex}</strong>
            <span>
              {assignedColor !== undefined
                ? `Color ${assignedColor}`
                : "Uncolored"}
            </span>
            {isAttempted && (
              <small className="gc-node-attempted">Attempted</small>
            )}
            {isConflict && <small className="gc-node-conflict">Conflict</small>}
          </div>
        ),
      },
      style: {
        width: 88,
        height: 88,
        borderRadius: "50%",
        background: assignedColor ? `${fillColor}35` : "#17243a",
        border: `3px solid ${borderColor}`,
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isAttempted
          ? "0 0 0 6px rgba(251,191,36,0.16)"
          : isConflict
            ? "0 0 0 6px rgba(248,113,113,0.16)"
            : assignedColor
              ? `0 0 18px ${fillColor}35`
              : "none",
      },
    };
  });
}

function buildGraphEdges(adjacency, event) {
  const seen = new Set();
  const edges = [];

  const attemptedVertex = getAttemptedVertex(event);
  const conflictingNeighbors = getConflictingNeighbors(event);
  const isConflictEvent =
    String(event?.event_type || "").toUpperCase() === "PRUNE";

  Object.entries(adjacency).forEach(([vertex, neighbors]) => {
    neighbors.forEach((neighbor) => {
      const key = [vertex, neighbor].sort().join("|");

      if (seen.has(key)) return;
      seen.add(key);

      const conflictEdge =
        isConflictEvent &&
        attemptedVertex &&
        ((vertex === attemptedVertex &&
          conflictingNeighbors.includes(neighbor)) ||
          (neighbor === attemptedVertex &&
            conflictingNeighbors.includes(vertex)));

      edges.push({
        id: `graph-${key}`,
        source: vertex,
        target: neighbor,
        type: "straight",
        animated: Boolean(conflictEdge),
        style: {
          stroke: conflictEdge ? "#f87171" : "#64748b",
          strokeWidth: conflictEdge ? 3 : 2,
          opacity: conflictEdge ? 1 : 0.8,
        },
      });
    });
  });

  return edges;
}

function buildStateTree(events, activeStateId) {
  const stateMap = new Map();

  const statusPriority = {
    START: 1,
    DECISION: 2,
    VALID: 3,
    BACKTRACK: 4,
    PRUNE: 5,
    SOLUTION: 6,
  };

  events.forEach((event) => {
    if (event?.state_id === undefined || event?.state_id === null) {
      return;
    }

    const id = String(event.state_id);

    const parentId =
      event.parent_id === null || event.parent_id === undefined
        ? null
        : String(event.parent_id);

    if (!stateMap.has(id)) {
      stateMap.set(id, {
        id,
        parentId,
        depth: Number(event.depth) || 0,
        status: "START",
        decision: "",
        eventCount: 0,
        eventTypes: [],
      });
    }

    const node = stateMap.get(id);
    const eventType = String(event.event_type || "UNKNOWN").toUpperCase();

    node.eventCount += 1;

    if (!node.eventTypes.includes(eventType)) {
      node.eventTypes.push(eventType);
    }

    // COMPLETE describes the whole search, not a new tree state.
    if (eventType === "COMPLETE") {
      return;
    }

    // Preserve the original search-state decision.
    if (!node.decision && event.decision) {
      node.decision = event.decision;
    }

    // Backtracking updates a state's lifecycle, not its parent.
    if ((statusPriority[eventType] || 0) > (statusPriority[node.status] || 0)) {
      node.status = eventType;
    }

    if (node.parentId === null && parentId !== null) {
      node.parentId = parentId;
    }

    node.depth = Math.max(node.depth, Number(event.depth) || 0);
  });

  const levels = new Map();

  stateMap.forEach((node) => {
    if (!levels.has(node.depth)) {
      levels.set(node.depth, []);
    }

    levels.get(node.depth).push(node.id);
  });

  const nodes = [];
  const edges = [];

  const maxDepth = Math.max(
    0,
    ...Array.from(stateMap.values()).map((node) => node.depth),
  );

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const level = levels.get(depth) || [];
    const spacing = 190;
    const totalWidth = Math.max(0, (level.length - 1) * spacing);

    level.forEach((id, index) => {
      const node = stateMap.get(id);
      const active = String(activeStateId) === id;
      const eventColor = getEventColor(node.status);

      nodes.push({
        id,
        position: {
          x: index * spacing - totalWidth / 2 + 500,
          y: depth * 125 + 35,
        },
        data: {
          label: (
            <div className="gc-tree-node">
              <strong>State {id}</strong>
              <span>{node.status}</span>
              <small>{node.eventCount} event(s)</small>

              {node.decision && (
                <small className="gc-tree-decision">{node.decision}</small>
              )}
            </div>
          ),
        },
        style: {
          width: 150,
          minHeight: 78,
          borderRadius: 9,
          background: active ? "#302451" : "#111c30",
          border: `${active ? 2 : 1}px solid ${
            active ? "#c4b5fd" : eventColor
          }`,
          color: "#f8fafc",
          padding: 8,
          boxShadow: active ? "0 0 0 4px rgba(167,139,250,0.15)" : "none",
        },
      });

      if (node.parentId !== null && stateMap.has(node.parentId)) {
        edges.push({
          id: `tree-${node.parentId}-${id}`,
          source: node.parentId,
          target: id,
          type: "smoothstep",
          style: {
            stroke: eventColor,
            strokeWidth: 1.5,
          },
        });
      }
    });
  }

  return { nodes, edges };
}

export default function GraphColoringWorkspace({ onBack }) {
  const [adjacencyText, setAdjacencyText] = useState(
    JSON.stringify(DEFAULT_ADJACENCY, null, 2),
  );
  const [numColors, setNumColors] = useState(2);
  const [maxSolutions, setMaxSolutions] = useState(100);
  const [adjacency, setAdjacency] = useState(DEFAULT_ADJACENCY);

  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const events = result?.visualization?.events || [];
  const currentEvent = events[currentStep] || null;

  const graphEdges = useMemo(
    () => buildGraphEdges(adjacency, currentEvent),
    [adjacency, currentEvent],
  );

  const graphNodes = useMemo(
    () =>
      buildGraphNodes(
        adjacency,
        currentEvent,
        ["COMPLETE", "SOLUTION"].includes(
          String(currentEvent?.event_type || "").toUpperCase(),
        )
          ? result?.solutions?.[0] || {}
          : {},
      ),
    [adjacency, currentEvent, result],
  );

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

    let parsedAdjacency;

    try {
      parsedAdjacency = JSON.parse(adjacencyText);

      if (
        !parsedAdjacency ||
        typeof parsedAdjacency !== "object" ||
        Array.isArray(parsedAdjacency) ||
        Object.keys(parsedAdjacency).length === 0
      ) {
        throw new Error("Enter a valid adjacency-list object.");
      }

      Object.entries(parsedAdjacency).forEach(([vertex, neighbors]) => {
        if (!vertex.trim()) {
          throw new Error("Vertex names cannot be empty.");
        }

        if (
          !Array.isArray(neighbors) ||
          neighbors.some(
            (neighbor) =>
              typeof neighbor !== "string" || neighbor.trim() === "",
          )
        ) {
          throw new Error(
            `Neighbors for vertex ${vertex} must be an array of non-empty strings.`,
          );
        }
      });

      parsedAdjacency = normalizeAdjacency(parsedAdjacency);

      const vertices = Object.keys(parsedAdjacency);

      if (vertices.length > 30) {
        throw new Error("For clear visualization, use 30 vertices or fewer.");
      }

      Object.entries(parsedAdjacency).forEach(([vertex, neighbors]) => {
        if (neighbors.includes(vertex)) {
          throw new Error(`Vertex ${vertex} cannot have a self-loop.`);
        }
      });
    } catch (err) {
      setError(err.message || "Invalid adjacency JSON.");
      return;
    }

    const colorCount = Number(numColors);
    const solutionLimit = Number(maxSolutions);

    if (!Number.isInteger(colorCount) || colorCount < 1 || colorCount > 8) {
      setError("Number of colors must be an integer between 1 and 8.");
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
      const data = await runGraphColoring({
        adjacency: parsedAdjacency,
        num_colors: colorCount,
        max_solutions: solutionLimit,
        max_events: 5000,
      });

      setAdjacency(parsedAdjacency);
      setAdjacencyText(JSON.stringify(parsedAdjacency, null, 2));
      setResult(data);
      setCurrentStep(0);

      try {
        saveExecution("graph-coloring", data, {
          adjacency: parsedAdjacency,
          num_colors: colorCount,
          max_solutions: solutionLimit,
        });
      } catch (historyError) {
        console.warn(
          "Graph Coloring history could not be saved:",
          historyError,
        );
      }
    } catch (err) {
      setError(err.message || "Unable to execute Graph Coloring.");
    } finally {
      setLoading(false);
    }
  }

  const metrics = result?.metrics || {};

  const metricCards = [
    ["Recursive calls", metrics.recursive_calls ?? 0],
    ["Decisions", metrics.decisions ?? 0],
    ["Valid moves", metrics.valid_moves ?? 0],
    ["Conflicts", metrics.conflicts ?? 0],
    ["Backtracks", metrics.backtracks ?? 0],
    ["Execution time", `${metrics.elapsed_time_ms ?? 0} ms`],
  ];

  const firstSolution = result?.solutions?.[0] || {};

  const coloring = getEventColoring(
    currentEvent,
    String(currentEvent?.event_type).toUpperCase() === "COMPLETE" ||
      String(currentEvent?.event_type).toUpperCase() === "SOLUTION"
      ? firstSolution
      : {},
  );
  const attemptedVertex = getAttemptedVertex(currentEvent);
  const attemptedColor = getAttemptedColor(currentEvent);
  const conflicts = getConflictingNeighbors(currentEvent);

  const isConflictEvent =
    String(currentEvent?.event_type || "").toUpperCase() === "PRUNE";

  const solutionEntries = Array.isArray(result?.solutions)
    ? result.solutions
    : [];

  return (
    <section className="gc-workspace">
      <button className="gc-back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="gc-heading">
        <div>
          <span className="gc-eyebrow">ALGORITHM WORKSPACE / BACKTRACKING</span>
          <h1>Graph Coloring Visualizer</h1>
          <p>
            Assign colors to graph vertices while preventing adjacent vertices
            from sharing the same color.
          </p>
        </div>

        <span className="gc-technique">
          <Network size={14} />
          Backtracking
        </span>
      </div>

      <section className="gc-input-panel">
        <div className="gc-input-grid">
          <label className="gc-adjacency-field">
            Graph adjacency list (JSON)
            <textarea
              value={adjacencyText}
              onChange={(event) => setAdjacencyText(event.target.value)}
              spellCheck="false"
              rows={7}
            />
            <small>
              Each vertex maps to an array of its neighboring vertices. Edges
              are treated as undirected.
            </small>
          </label>

          <div className="gc-input-side">
            <label>
              Number of colors
              <input
                type="number"
                min="1"
                max="8"
                value={numColors}
                onChange={(event) => setNumColors(event.target.value)}
              />
            </label>

            <label>
              Maximum solutions
              <input
                type="number"
                min="1"
                value={maxSolutions}
                onChange={(event) => setMaxSolutions(event.target.value)}
              />
            </label>

            <button
              className="gc-run-button"
              onClick={runAlgorithm}
              disabled={loading}
            >
              <Play size={16} />
              {loading ? "Running..." : "Run Algorithm"}
            </button>
          </div>
        </div>

        {error && (
          <div className="gc-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </section>

      {result && (
        <>
          <section
            className={`gc-result-banner ${
              result.is_colorable ? "success" : "failure"
            }`}
          >
            {result.is_colorable ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}

            <div>
              <strong>
                {result.is_colorable ? "SOLUTION FOUND" : "NO VALID COLORING"}
              </strong>
              <span>
                {result.solutions_found ?? solutionEntries.length} solution(s)
                found using {result.input?.num_colors ?? numColors} color(s).
              </span>
            </div>

            <small>
              {result.search_complete ? "Search completed" : "Search stopped"}
            </small>
          </section>

          <section className="gc-metrics-grid">
            {metricCards.map(([label, value]) => (
              <div className="gc-metric-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>

          <section className="gc-top-grid">
            <div className="gc-panel gc-graph-panel">
              <div className="gc-panel-heading">
                <div>
                  <h2>Graph Visualization</h2>
                  <p>Current state at event {currentEvent?.event_id ?? 0}</p>
                </div>

                <span className="gc-event-badge">
                  {currentEvent?.event_type || "READY"}
                </span>
              </div>

              <div className="gc-graph-canvas">
                <ReactFlow
                  nodes={graphNodes}
                  edges={graphEdges}
                  fitView
                  fitViewOptions={{ padding: 0.25 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#26344b" gap={20} />
                  <Controls />
                </ReactFlow>
              </div>

              <div className="gc-color-legend">
                {Array.from(
                  { length: Number(numColors) || 0 },
                  (_, index) => index + 1,
                ).map((color) => (
                  <span key={color}>
                    <i style={{ background: getColor(color) }} />
                    Color {color}
                  </span>
                ))}
              </div>

              <div className="gc-inspector">
                <strong>
                  {currentEvent?.decision ||
                    "Run the algorithm to inspect execution events"}
                </strong>

                <p>
                  {currentEvent?.reason ||
                    (currentEvent?.event_type === "VALID"
                      ? "The selected color does not conflict with an adjacent vertex."
                      : currentEvent?.event_type === "SOLUTION"
                        ? "All vertices have been assigned valid colors."
                        : "Select an event from the execution timeline to inspect its graph state.")}
                </p>

                {isConflictEvent && (
                  <div className="gc-conflict-message">
                    <AlertTriangle size={15} />
                    <span>
                      {attemptedVertex
                        ? `Vertex ${attemptedVertex} cannot use color ${attemptedColor ?? ""}. `
                        : "The attempted coloring is invalid. "}
                      {conflicts.length
                        ? `Conflicting neighbor(s): ${conflicts.join(", ")}.`
                        : "The backend did not provide conflicting-neighbor details for this event."}
                    </span>
                  </div>
                )}

                {attemptedVertex && !isConflictEvent && (
                  <div className="gc-attempt-message">
                    Attempting Color {attemptedColor ?? "—"} on vertex{" "}
                    {attemptedVertex}.
                  </div>
                )}

                <div className="gc-current-coloring">
                  <span>Current assignments:</span>
                  {Object.keys(coloring).length > 0 ? (
                    Object.entries(coloring).map(([vertex, color]) => (
                      <span className="gc-assignment" key={vertex}>
                        <i style={{ background: getColor(color) }} />
                        {vertex}: {color}
                      </span>
                    ))
                  ) : (
                    <small>No vertices colored at this event.</small>
                  )}
                </div>
              </div>

              <div className="gc-playback">
                <div className="gc-playback-buttons">
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
                    className="gc-play-main"
                    title={isPlaying ? "Pause" : "Play"}
                    onClick={() => {
                      if (isPlaying) {
                        setIsPlaying(false);
                        return;
                      }

                      if (currentStep >= events.length - 1) {
                        setCurrentStep(0);
                      }

                      setIsPlaying(true);
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
                  className="gc-event-slider"
                  type="range"
                  min="0"
                  max={Math.max(0, events.length - 1)}
                  value={currentStep}
                  onChange={(event) => selectEvent(Number(event.target.value))}
                  disabled={!events.length}
                />

                <div className="gc-slider-labels">
                  <span>Event {currentEvent?.event_id ?? 0}</span>
                  <span>{events.length} total events</span>
                </div>
              </div>
            </div>

            <div className="gc-panel gc-timeline-panel">
              <div className="gc-panel-heading">
                <div>
                  <h2>Execution Timeline</h2>
                  <p>Select any event to inspect its graph state.</p>
                </div>
              </div>

              <div className="gc-event-list">
                {events.map((event, index) => (
                  <button
                    key={`${event.event_id ?? index}-${event.state_id ?? "state"}`}
                    className={`gc-event-row ${
                      index === currentStep ? "selected" : ""
                    }`}
                    onClick={() => selectEvent(index)}
                  >
                    <span className="gc-event-number">
                      {event.event_id ?? index + 1}
                    </span>

                    <i
                      className="gc-event-dot"
                      style={{
                        background: getEventColor(event.event_type),
                      }}
                    />

                    <strong>{event.event_type || "EVENT"}</strong>
                    <span className="gc-event-decision">
                      {event.decision || "—"}
                    </span>
                    <span className="gc-event-depth">
                      Depth {event.depth ?? 0}
                    </span>
                    <span className="gc-event-arrow">›</span>
                  </button>
                ))}

                {events.length === 0 && (
                  <div className="gc-empty-state">
                    No execution events were returned by the backend.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="gc-panel gc-tree-panel">
            <div className="gc-panel-heading">
              <div>
                <h2>State-Space Tree</h2>
                <p>
                  Each node represents a recorded search state. The selected
                  event's state is highlighted.
                </p>
              </div>
            </div>

            <div className="gc-tree-canvas">
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
                  <MiniMap
                    pannable
                    zoomable
                    bgColor="#111c30"
                    maskColor="rgba(5, 10, 20, 0.72)"
                    nodeColor={(node) => {
                      const border = node.style?.border;
                      return typeof border === "string"
                        ? border.match(/#[0-9a-fA-F]{6}/)?.[0] || "#64748b"
                        : "#64748b";
                    }}
                  />
                  <Controls />
                </ReactFlow>
              ) : (
                <div className="gc-empty-state">
                  Run the algorithm to generate the state-space tree.
                </div>
              )}
            </div>
          </section>

          <section className="gc-panel gc-solutions-panel">
            <div className="gc-panel-heading">
              <div>
                <h2>Solutions</h2>
                <p>
                  {result.solutions_found ?? solutionEntries.length} valid
                  coloring(s) discovered.
                </p>
              </div>
            </div>

            {solutionEntries.length > 0 ? (
              <div className="gc-solutions-grid">
                {solutionEntries.map((solution, index) => (
                  <div className="gc-solution-card" key={index}>
                    <strong>Solution {index + 1}</strong>
                    <div>
                      {Object.entries(solution).map(([vertex, color]) => (
                        <span key={vertex}>
                          <i style={{ background: getColor(color) }} />
                          {vertex}: Color {color}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gc-empty-solutions">
                No valid color assignments were found for this input.
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
