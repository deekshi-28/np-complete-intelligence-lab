import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Network,
} from "lucide-react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { runHamiltonianCycle } from "../services/api";
import "./HamiltonianCycleWorkspace.css";
import { saveExecution } from "../services/executionHistory";

const EVENT_COLORS = {
  START: "#64748b",
  DECISION: "#60a5fa",
  VALID: "#34d399",
  PRUNE: "#f87171",
  BACKTRACK: "#fbbf24",
  SOLUTION: "#a78bfa",
  COMPLETE: "#94a3b8",
};

const DEFAULT_GRAPH = {
  0: ["1", "2"],
  1: ["0", "2", "3"],
  2: ["0", "1", "3"],
  3: ["1", "2"],
};

function normalizeGraph(adjacency) {
  const vertices = Object.keys(adjacency);
  const vertexSet = new Set(vertices);

  for (const vertex of vertices) {
    if (!Array.isArray(adjacency[vertex])) {
      throw new Error(`Neighbors of vertex ${vertex} must be an array.`);
    }

    for (const neighbor of adjacency[vertex]) {
      if (!vertexSet.has(String(neighbor))) {
        throw new Error(
          `Vertex ${neighbor} is referenced but is not defined in the graph.`,
        );
      }
      if (String(neighbor) === vertex) {
        throw new Error(`Self-loop detected at vertex ${vertex}.`);
      }
    }
  }

  return Object.fromEntries(
    vertices.map((vertex) => [
      vertex,
      [...new Set(adjacency[vertex].map(String))],
    ]),
  );
}

function getEventState(event) {
  return event?.state && typeof event.state === "object" ? event.state : {};
}

function buildGraph(adjacency, event, solution) {
  const vertices = Object.keys(adjacency);
  const state = getEventState(event);
  const path = Array.isArray(state.path) ? state.path.map(String) : [];
  const completed = String(event?.event_type).toUpperCase() === "SOLUTION";
  const activeEdges = new Set();

  for (let i = 1; i < path.length; i += 1) {
    activeEdges.add(`${path[i - 1]}|${path[i]}`);
    activeEdges.add(`${path[i]}|${path[i - 1]}`);
  }

  const selectedPath = completed ? path : path;
  const count = vertices.length;
  const radius = Math.max(125, count * 24);

  const positions = {};
  vertices.forEach((vertex, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    positions[vertex] = {
      x: 260 + radius * Math.cos(angle),
      y: 220 + radius * Math.sin(angle),
    };
  });

  const nodes = vertices.map((vertex) => {
    const index = selectedPath.indexOf(vertex);
    const isCurrent = index === selectedPath.length - 1 && index >= 0;
    const isVisited = index >= 0;
    const isStart = vertex === vertices[0];

    return {
      id: vertex,
      position: positions[vertex],
      data: {
        label: (
          <div className="hc-graph-node">
            <strong>{vertex}</strong>
            <small>
              {isStart
                ? "START"
                : isCurrent
                  ? "CURRENT"
                  : isVisited
                    ? `STEP ${index + 1}`
                    : "UNVISITED"}
            </small>
          </div>
        ),
      },
      style: {
        width: 82,
        height: 68,
        borderRadius: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: isCurrent ? "#4c2e75" : isVisited ? "#123c36" : "#17263c",
        color: "#f8fafc",
        border: `2px solid ${
          isCurrent ? "#c4b5fd" : isVisited ? "#34d399" : "#475569"
        }`,
      },
    };
  });

  const edgeSet = new Set();
  const edges = [];

  vertices.forEach((vertex) => {
    (adjacency[vertex] || []).forEach((neighbor) => {
      const key = [vertex, String(neighbor)].sort().join("|");
      if (edgeSet.has(key)) return;
      edgeSet.add(key);

      const active = activeEdges.has(`${vertex}|${neighbor}`);
      edges.push({
        id: `edge-${key}`,
        source: vertex,
        target: String(neighbor),
        type: "smoothstep",
        animated: active,
        style: {
          stroke: active ? "#34d399" : "#475569",
          strokeWidth: active ? 3 : 1.5,
        },
      });
    });
  });

  return { nodes, edges, path };
}

function buildStateTree(events, activeStateId) {
  const map = new Map();

  // COMPLETE is not a recursive search state.
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

    if (!map.has(id)) {
      map.set(id, {
        id,
        parentId,
        depth: Number(event.depth) || 0,
        status: type,
        state: event.state || {},
        decision: event.decision || "",
        count: 0,
      });
    }

    const node = map.get(id);

    node.count += 1;
    node.status = type;
    node.state = event.state || node.state;
    node.decision = event.decision || node.decision;

    if (node.parentId === null && parentId !== null) {
      node.parentId = parentId;
    }

    node.depth = Math.max(node.depth, Number(event.depth) || 0);
  });

  // Build parent-child relationships.
  const children = new Map();

  map.forEach((node) => {
    children.set(node.id, []);
  });

  map.forEach((node) => {
    if (node.parentId !== null && map.has(node.parentId)) {
      children.get(node.parentId).push(node.id);
    }
  });

  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 92;
  const H_GAP = 45;
  const V_GAP = 100;

  const roots = [...map.values()]
    .filter((node) => node.parentId === null || !map.has(node.parentId))
    .map((node) => node.id);

  const positions = new Map();
  const visited = new Set();

  // Calculate the horizontal space required by each subtree.
  function subtreeWidth(id, ancestors = new Set()) {
    if (ancestors.has(id)) return NODE_WIDTH;

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(id);

    const childIds = children.get(id) || [];

    if (childIds.length === 0) {
      return NODE_WIDTH;
    }

    const totalChildrenWidth = childIds.reduce(
      (total, childId) => total + subtreeWidth(childId, nextAncestors),
      0,
    );

    return Math.max(
      NODE_WIDTH,
      totalChildrenWidth + H_GAP * (childIds.length - 1),
    );
  }

  // Center each parent above its complete subtree.
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

  // Safety handling for any disconnected or unvisited states.
  map.forEach((node) => {
    if (!positions.has(node.id)) {
      positionSubtree(node.id, rootLeft, node.depth);
      rootLeft += NODE_WIDTH + H_GAP;
    }
  });

  const nodes = [];
  const edges = [];

  map.forEach((node) => {
    const active = String(activeStateId) === node.id;
    const color = EVENT_COLORS[node.status] || "#64748b";

    const path = Array.isArray(node.state?.path) ? node.state.path : [];

    const visitedCount = node.state?.visited_count ?? path.length;

    nodes.push({
      id: node.id,
      position: positions.get(node.id),
      data: {
        label: (
          <div className="hc-tree-node">
            <strong>State {node.id}</strong>
            <span>{node.status}</span>
            <small>Path: {path.length ? path.join(" → ") : "Empty"}</small>
            <small>Visited: {visitedCount}</small>
            <small>{node.count} event(s)</small>
          </div>
        ),
      },
      style: {
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        padding: 9,
        borderRadius: 9,
        background: active ? "#302451" : "#111c30",
        color: "#f8fafc",
        border: `2px solid ${active ? "#c4b5fd" : color}`,
        boxShadow: active ? "0 0 0 3px #a78bfa30" : "none",
      },
    });

    if (node.parentId !== null && map.has(node.parentId)) {
      edges.push({
        id: `tree-${node.parentId}-${node.id}`,
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

export default function HamiltonianCycleWorkspace({ onBack }) {
  const [adjacencyText, setAdjacencyText] = useState(
    JSON.stringify(DEFAULT_GRAPH, null, 2),
  );
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
  const vertices = Object.keys(
    result?.normalized_adjacency ||
      (() => {
        try {
          return JSON.parse(adjacencyText);
        } catch {
          return {};
        }
      })(),
  );

  const graph = useMemo(
    () =>
      buildGraph(
        result?.normalized_adjacency ||
          (() => {
            try {
              return JSON.parse(adjacencyText);
            } catch {
              return {};
            }
          })(),
        currentEvent,
      ),
    [result, adjacencyText, currentEvent],
  );

  const tree = useMemo(
    () => buildStateTree(events, currentEvent?.state_id),
    [events, currentEvent?.state_id],
  );

  useEffect(() => {
    if (!isPlaying || !events.length) return undefined;

    if (currentStep >= events.length - 1) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCurrentStep((step) => Math.min(step + 1, events.length - 1));
    }, 1000 / speed);

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStep, events.length, speed]);

  const selectEvent = useCallback(
    (index) => {
      setIsPlaying(false);
      setCurrentStep(Math.max(0, Math.min(index, events.length - 1)));
    },
    [events.length],
  );

  async function runAlgorithm() {
    setError("");
    setResult(null);
    setCurrentStep(0);
    setIsPlaying(false);

    let adjacency;
    try {
      adjacency = normalizeGraph(JSON.parse(adjacencyText));
    } catch (err) {
      setError(err.message || "Enter a valid adjacency-list JSON object.");
      return;
    }

    const solutionLimit = Number(maxSolutions);

    if (Object.keys(adjacency).length < 3) {
      setError("A Hamiltonian cycle requires at least 3 vertices.");
      return;
    }

    if (Object.keys(adjacency).length > 10) {
      setError(
        "Use 10 vertices or fewer for a readable state-space visualization.",
      );
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
      const data = await runHamiltonianCycle({
        adjacency,
        max_solutions: solutionLimit,
        max_events: 5000,
      });

      setResult({ ...data, normalized_adjacency: adjacency });

      try {
        saveExecution("hamiltonian-cycle", data, {
          adjacency,
          max_solutions: solutionLimit,
        });
      } catch (historyError) {
        console.warn(
          "Hamiltonian Cycle history could not be saved:",
          historyError,
        );
      }
    } catch (err) {
      setError(err.message || "Unable to execute Hamiltonian Cycle.");
    } finally {
      setLoading(false);
    }
  }

  const metrics = result?.metrics || {};
  const solutions = result?.solutions || [];
  const eventType = String(currentEvent?.event_type || "READY").toUpperCase();
  const path = Array.isArray(currentState.path) ? currentState.path : [];

  const metricCards = [
    ["Recursive calls", metrics.recursive_calls ?? 0],
    ["Decisions", metrics.decisions ?? 0],
    ["Valid moves", metrics.valid_moves ?? 0],
    ["Pruned moves", metrics.pruned_moves ?? 0],
    ["Backtracks", metrics.backtracks ?? 0],
    ["Execution time", `${metrics.elapsed_time_ms ?? 0} ms`],
  ];

  return (
    <section className="hc-workspace">
      <button className="hc-back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <header className="hc-heading">
        <div>
          <span className="hc-eyebrow">ALGORITHM WORKSPACE / BACKTRACKING</span>
          <h1>Hamiltonian Cycle Visualizer</h1>
          <p>
            Explore path construction, vertex visitation, cycle closure,
            pruning, and recursive backtracking.
          </p>
        </div>
        <span className="hc-technique">
          <GitBranch size={15} /> Backtracking
        </span>
      </header>

      <section className="hc-input-panel">
        <label className="hc-adjacency-field">
          Graph adjacency list (JSON)
          <textarea
            value={adjacencyText}
            onChange={(event) => setAdjacencyText(event.target.value)}
            spellCheck="false"
            rows={8}
          />
          <small>
            Each vertex maps to its neighboring vertices. Use quoted vertex
            labels and undirected edges.
          </small>
        </label>

        <div className="hc-input-side">
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
            className="hc-run-button"
            onClick={runAlgorithm}
            disabled={loading}
          >
            <Play size={16} />
            {loading ? "Executing..." : "Run Algorithm"}
          </button>
        </div>

        {error && (
          <div className="hc-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
      </section>

      {result && (
        <>
          <section
            className={`hc-result-banner ${result.is_hamiltonian ? "success" : "failure"}`}
          >
            {result.is_hamiltonian ? (
              <CheckCircle2 size={21} />
            ) : (
              <AlertTriangle size={21} />
            )}
            <div>
              <strong>{result.result?.replaceAll("_", " ")}</strong>
              <span>
                {result.solutions_found} Hamiltonian cycle(s) found across
                {` ${result.input?.vertices ?? vertices.length} `}vertices.
              </span>
            </div>
            <small>
              {result.search_complete ? "Search completed" : "Search stopped"}
            </small>
          </section>

          <section className="hc-metrics-grid">
            {metricCards.map(([label, value]) => (
              <div className="hc-metric-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>

          <section className="hc-top-grid">
            <div className="hc-panel">
              <div className="hc-panel-heading">
                <div>
                  <h2>Graph Visualization</h2>
                  <p>Current path at event {currentEvent?.event_id ?? 0}</p>
                </div>
                <span className={`hc-event-badge ${eventType}`}>
                  {eventType}
                </span>
              </div>

              <div className="hc-graph-canvas">
                <ReactFlow
                  nodes={graph.nodes}
                  edges={graph.edges}
                  fitView
                  fitViewOptions={{ padding: 0.15, minZoom: 0.12, maxZoom: 1 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#26344b" gap={20} />
                  <MiniMap />
                  <Controls />
                </ReactFlow>
              </div>

              <div className="hc-path-display">
                <span>Current path</span>
                <strong>
                  {path.length ? path.join(" → ") : "No vertex selected"}
                </strong>
                <small>
                  {currentState.visited_count ?? path.length} /{" "}
                  {result.input?.vertices} vertices visited
                </small>
              </div>

              <div className="hc-inspector">
                <strong>
                  {currentEvent?.decision || "Waiting for execution"}
                </strong>
                <p>
                  {currentEvent?.reason?.replaceAll("_", " ") ||
                    "Run the algorithm and select an event to inspect its execution."}
                </p>
                {eventType === "PRUNE" && (
                  <div className="hc-warning">
                    <AlertTriangle size={15} />
                    This branch cannot produce a Hamiltonian cycle.
                  </div>
                )}
                {eventType === "SOLUTION" && (
                  <div className="hc-success">
                    <CheckCircle2 size={15} />
                    Every vertex was visited exactly once and the cycle was
                    closed.
                  </div>
                )}
              </div>

              <div className="hc-playback">
                <div className="hc-playback-buttons">
                  <button
                    title="Reset"
                    onClick={() => selectEvent(0)}
                    disabled={!events.length}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    title="Previous"
                    onClick={() => selectEvent(currentStep - 1)}
                    disabled={currentStep === 0}
                  >
                    <SkipBack size={16} />
                  </button>
                  <button
                    className="hc-play-main"
                    title={isPlaying ? "Pause" : "Play"}
                    onClick={() => {
                      if (currentStep >= events.length - 1) setCurrentStep(0);
                      setIsPlaying(!isPlaying);
                    }}
                    disabled={!events.length}
                  >
                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  <button
                    title="Next"
                    onClick={() => selectEvent(currentStep + 1)}
                    disabled={currentStep >= events.length - 1}
                  >
                    <SkipForward size={16} />
                  </button>
                  <select
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, events.length - 1)}
                  value={currentStep}
                  onChange={(event) => selectEvent(Number(event.target.value))}
                  disabled={!events.length}
                />
                <div className="hc-slider-labels">
                  <span>Event {currentEvent?.event_id ?? 0}</span>
                  <span>{events.length} total events</span>
                </div>
              </div>
            </div>

            <div className="hc-panel hc-timeline-panel">
              <div className="hc-panel-heading">
                <div>
                  <h2>Execution Timeline</h2>
                  <p>Select an event to inspect the path.</p>
                </div>
              </div>
              <div className="hc-event-list">
                {events.map((event, index) => (
                  <button
                    key={`${event.event_id ?? index}-${event.state_id}`}
                    className={`hc-event-row ${index === currentStep ? "selected" : ""}`}
                    onClick={() => selectEvent(index)}
                  >
                    <span>{event.event_id ?? index + 1}</span>
                    <i
                      style={{
                        background: EVENT_COLORS[event.event_type] || "#64748b",
                      }}
                    />
                    <strong>{event.event_type}</strong>
                    <small>{event.decision}</small>
                    <span>Depth {event.depth ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="hc-panel hc-tree-panel">
            <div className="hc-panel-heading">
              <div>
                <h2>State-Space Tree</h2>
                <p>Each node represents a recorded recursive search state.</p>
              </div>
            </div>
            <div className="hc-tree-canvas">
              {tree.nodes.length ? (
                <ReactFlow
                  nodes={tree.nodes}
                  edges={tree.edges}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable
                  nodesConnectable={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#26344b" gap={20} />
                  <MiniMap />
                  <Controls />
                </ReactFlow>
              ) : (
                <div className="hc-empty">No recorded states.</div>
              )}
            </div>
          </section>

          <section className="hc-panel hc-solutions-panel">
            <div className="hc-panel-heading">
              <div>
                <h2>Hamiltonian Cycles</h2>
                <p>{solutions.length} valid cycle(s) discovered.</p>
              </div>
            </div>
            {solutions.length ? (
              <div className="hc-solutions-grid">
                {solutions.map((solution, index) => (
                  <article className="hc-solution-card" key={index}>
                    <strong>Cycle {index + 1}</strong>
                    <div className="hc-solution-path">
                      {solution.map((vertex, vertexIndex) => (
                        <span key={`${vertex}-${vertexIndex}`}>
                          {vertex}
                          {vertexIndex < solution.length - 1 && <b>→</b>}
                        </span>
                      ))}
                    </div>
                    <small>
                      {solution.length - 1} edges · {solution.length - 1}{" "}
                      vertices
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="hc-empty">
                No Hamiltonian cycle exists for this graph.
              </div>
            )}
          </section>
        </>
      )}

      {!result && !loading && (
        <div className="hc-empty-state">
          <Network size={42} />
          <h2>Ready to explore Hamiltonian cycles?</h2>
          <p>
            Enter an undirected graph and run the algorithm to visualize
            recursive path construction, pruning, and cycle discovery.
          </p>
        </div>
      )}
    </section>
  );
}
