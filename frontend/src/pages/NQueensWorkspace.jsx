import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trophy,
  Zap,
} from "lucide-react";

import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { runNQueens } from "../services/api";
import "./NQueensWorkspace.css";
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

function buildTree(events, activeStateId) {
  const stateMap = new Map();

  events.forEach((event) => {
    const id = String(event.state_id);

    if (!stateMap.has(id)) {
      stateMap.set(id, {
        id,
        parentId: event.parent_id == null ? null : String(event.parent_id),
        depth: event.depth ?? 0,
        state: event.state,
        status: event.event_type,
        eventCount: 0,
      });
    }

    const node = stateMap.get(id);
    node.eventCount += 1;
    node.state = event.state;
    node.status = event.event_type;
  });

  const children = new Map();
  stateMap.forEach((node) => children.set(node.id, []));

  stateMap.forEach((node) => {
    if (node.parentId !== null && stateMap.has(node.parentId)) {
      children.get(node.parentId).push(node.id);
    }
  });

  const NODE_WIDTH = 165;
  const NODE_HEIGHT = 76;
  const H_GAP = 34;
  const V_GAP = 75;

  const roots = [...stateMap.values()]
    .filter((node) => node.parentId === null)
    .map((node) => node.id);

  const positions = new Map();
  const visited = new Set();

  function subtreeWidth(id, ancestors = new Set()) {
    if (ancestors.has(id)) return NODE_WIDTH;

    const next = new Set(ancestors);
    next.add(id);

    const childIds = children.get(id) || [];
    if (!childIds.length) return NODE_WIDTH;

    const width = childIds.reduce(
      (sum, childId) => sum + subtreeWidth(childId, next),
      0,
    );

    return Math.max(NODE_WIDTH, width + H_GAP * (childIds.length - 1));
  }

  function positionSubtree(id, left, depth, ancestors = new Set()) {
    if (ancestors.has(id) || visited.has(id)) return;

    visited.add(id);

    const next = new Set(ancestors);
    next.add(id);

    const childIds = children.get(id) || [];
    const widths = childIds.map((childId) => subtreeWidth(childId, next));

    const childrenWidth =
      widths.reduce((sum, width) => sum + width, 0) +
      H_GAP * Math.max(0, widths.length - 1);

    const width = Math.max(NODE_WIDTH, childrenWidth);

    positions.set(id, {
      x: left + width / 2 - NODE_WIDTH / 2,
      y: depth * (NODE_HEIGHT + V_GAP),
    });

    let childLeft = left + (width - childrenWidth) / 2;

    childIds.forEach((childId, index) => {
      positionSubtree(childId, childLeft, depth + 1, next);
      childLeft += widths[index] + H_GAP;
    });
  }

  let rootLeft = 0;

  roots.forEach((id) => {
    const width = subtreeWidth(id);
    positionSubtree(id, rootLeft, 0);
    rootLeft += width + H_GAP * 2;
  });

  const nodes = [...stateMap.values()].map((node) => {
    const active = String(activeStateId) === node.id;
    const color = EVENT_COLORS[node.status] || "#64748b";

    const summary = Array.isArray(node.state)
      ? node.state.join(", ")
      : node.state?.queens
        ? node.state.queens.join(", ")
        : "Search state";

    return {
      id: node.id,
      position: positions.get(node.id) || {
        x: 0,
        y: node.depth * (NODE_HEIGHT + V_GAP),
      },
      data: {
        label: (
          <div className="tree-node-content">
            <strong>State {node.id}</strong>
            <span>{summary || "Empty state"}</span>
            <small>{node.status}</small>
            <small>{node.eventCount} event(s)</small>
          </div>
        ),
      },
      style: {
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        background: active ? "#302451" : "#111c30",
        color: "#e2e8f0",
        border: `${active ? 2 : 1}px solid ${active ? "#c4b5fd" : color}`,
        borderRadius: 9,
        fontSize: 10,
        padding: 9,
        boxShadow: active ? "0 0 0 3px rgba(167,139,250,0.15)" : "none",
      },
    };
  });

  const edges = [];

  stateMap.forEach((node) => {
    if (
      node.parentId !== null &&
      positions.has(node.id) &&
      positions.has(node.parentId)
    ) {
      edges.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: "smoothstep",
        style: {
          stroke: EVENT_COLORS[node.status] || "#64748b",
          strokeWidth: 1.5,
        },
      });
    }
  });

  return { nodes, edges };
}

function getQueenPositions(event) {
  const state = event?.state || [];

  if (Array.isArray(state)) return state;

  if (Array.isArray(state.queens)) return state.queens;

  return [];
}

function Chessboard({ n, event }) {
  const queens = getQueenPositions(event);
  const eventType = event?.event_type;
  const latestRow = queens.length - 1;

  return (
    <div className="chessboard-wrapper">
      <div
        className="chessboard"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {Array.from({ length: n * n }, (_, index) => {
          const row = Math.floor(index / n);
          const col = index % n;
          const hasQueen = queens[row] === col;
          const latest = row === latestRow;

          return (
            <div
              key={index}
              className={`chess-square ${
                (row + col) % 2 === 0 ? "light" : "dark"
              } ${
                hasQueen && latest && eventType === "PRUNE"
                  ? "invalid-square"
                  : ""
              } ${
                hasQueen && latest && eventType === "VALID"
                  ? "valid-square"
                  : ""
              }`}
            >
              {hasQueen && (
                <span className="queen-piece" aria-label="Queen">
                  {"\u2655"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NQueensWorkspace({ onBack }) {
  const [boardSize, setBoardSize] = useState(4);
  const [maxSolutions, setMaxSolutions] = useState(10);
  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const events = result?.visualization?.events || [];
  const currentEvent = events[currentStep] || null;

  const tree = useMemo(
    () => buildTree(events, currentEvent?.state_id),
    [events, currentEvent?.state_id],
  );

  useEffect(() => {
    if (!isPlaying || !events.length) return undefined;

    const timer = window.setInterval(() => {
      setCurrentStep((previous) => {
        if (previous >= events.length - 1) {
          setIsPlaying(false);
          return previous;
        }
        return previous + 1;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [isPlaying, events.length, speed]);

  async function executeAlgorithm() {
    setLoading(true);
    setIsPlaying(false);
    setError("");
    setResult(null);
    setCurrentStep(0);

    try {
      const data = await runNQueens({
        n: boardSize,
        max_solutions: maxSolutions,
        max_events: 5000,
      });

      setResult(data);

      try {
        saveExecution("n-queens", data, {
          board_size: boardSize,
          max_solutions: maxSolutions,
        });
      } catch (historyError) {
        console.warn("N-Queens history could not be saved:", historyError);
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to execute N-Queens.");
    } finally {
      setLoading(false);
    }
  }

  function selectStep(step) {
    setIsPlaying(false);
    setCurrentStep(Math.max(0, Math.min(step, events.length - 1)));
  }

  const metrics = result?.metrics || {};

  return (
    <section className="nq-workspace">
      <div className="nq-heading">
        <div>
          <button className="nq-back-button" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="nq-eyebrow">ALGORITHM WORKSPACE / BACKTRACKING</div>

          <h1>N-Queens Visualizer</h1>

          <p>
            Explore recursive placement, constraint checking, pruning, and
            backtracking on an N × N chessboard.
          </p>
        </div>

        <div className="nq-algorithm-tag">
          <Zap size={15} /> Backtracking
        </div>
      </div>

      <div className="nq-control-panel">
        <div className="nq-input-group">
          <label htmlFor="board-size">Board size (N)</label>
          <input
            id="board-size"
            type="number"
            min="1"
            max="12"
            value={boardSize}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isInteger(value) && value >= 1 && value <= 12) {
                setBoardSize(value);
              }
            }}
          />
          <small>Supported range: 1–12</small>
        </div>

        <div className="nq-input-group">
          <label htmlFor="max-solutions">Maximum solutions</label>
          <input
            id="max-solutions"
            type="number"
            min="1"
            max="1000"
            value={maxSolutions}
            onChange={(e) =>
              setMaxSolutions(
                Math.max(1, Math.min(1000, Number(e.target.value) || 1)),
              )
            }
          />
          <small>Stop after this many solutions</small>
        </div>

        <button
          className="nq-run-button"
          onClick={executeAlgorithm}
          disabled={loading}
        >
          <CirclePlay size={18} />
          {loading ? "Executing..." : "Run Algorithm"}
        </button>
      </div>

      {error && <div className="nq-error">{error}</div>}

      {result && (
        <>
          <div className="nq-result-banner">
            <div>
              <Trophy size={20} />
              <div>
                <strong>{result.result?.replaceAll("_", " ")}</strong>
                <span>
                  {result.solutions_found} solution(s) found for N ={" "}
                  {result.input_size}
                </span>
              </div>
            </div>

            <span>
              {result.search_complete ? "Search completed" : "Search stopped"}
            </span>
          </div>

          <div className="nq-metrics-grid">
            {[
              ["Recursive calls", metrics.recursive_calls],
              ["Decisions", metrics.decisions],
              ["Valid moves", metrics.valid_moves],
              ["Pruned moves", metrics.pruned_moves],
              ["Backtracks", metrics.backtracks],
              ["Execution time", `${metrics.elapsed_time_ms ?? 0} ms`],
            ].map(([label, value]) => (
              <div className="nq-metric-card" key={label}>
                <span>{label}</span>
                <strong>{value ?? 0}</strong>
              </div>
            ))}
          </div>

          <div className="nq-visual-grid">
            <div className="nq-panel">
              <div className="nq-panel-heading">
                <div>
                  <h2>Chessboard</h2>
                  <p>Current state at event {currentStep + 1}</p>
                </div>

                <span
                  className={`event-badge ${currentEvent?.event_type || ""}`}
                >
                  {currentEvent?.event_type || "READY"}
                </span>
              </div>

              <Chessboard n={result.input_size} event={currentEvent} />

              <div className="nq-event-description">
                <strong>
                  {currentEvent?.decision || "Waiting for execution"}
                </strong>
                <span>
                  {currentEvent?.reason?.replaceAll("_", " ") ||
                    "Run the algorithm to inspect its execution."}
                </span>
              </div>

              <div className="nq-playback">
                <button onClick={() => selectStep(0)} title="Reset">
                  <RotateCcw size={17} />
                </button>

                <button
                  onClick={() => selectStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  title="Previous event"
                >
                  <SkipBack size={17} />
                </button>

                <button
                  className="nq-play-button"
                  onClick={() => {
                    if (currentStep >= events.length - 1) {
                      setCurrentStep(0);
                    }
                    setIsPlaying((playing) => !playing);
                  }}
                  disabled={!events.length}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <CirclePause size={20} />
                  ) : (
                    <CirclePlay size={20} />
                  )}
                </button>

                <button
                  onClick={() => selectStep(currentStep + 1)}
                  disabled={currentStep >= events.length - 1}
                  title="Next event"
                >
                  <SkipForward size={17} />
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    selectStep(events.length - 1);
                  }}
                  disabled={!events.length}
                  title="Last event"
                >
                  <ChevronRight size={17} />
                </button>

                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="Playback speed"
                >
                  <option value={1000}>0.5×</option>
                  <option value={500}>1×</option>
                  <option value={200}>2.5×</option>
                  <option value={100}>5×</option>
                </select>
              </div>

              <div className="nq-progress">
                <input
                  type="range"
                  min="0"
                  max={Math.max(events.length - 1, 0)}
                  value={currentStep}
                  onChange={(e) => selectStep(Number(e.target.value))}
                />
                <div>
                  <span>Event {events.length ? currentStep + 1 : 0}</span>
                  <span>{events.length} total events</span>
                </div>
              </div>
            </div>

            <div className="nq-panel nq-timeline-panel">
              <div className="nq-panel-heading">
                <div>
                  <h2>Execution Timeline</h2>
                  <p>Select any event to inspect its board state.</p>
                </div>
              </div>

              <div className="nq-event-list">
                {events.map((event, index) => (
                  <button
                    key={`${event.event_id}-${index}`}
                    className={`nq-event-row ${
                      index === currentStep ? "selected" : ""
                    }`}
                    onClick={() => selectStep(index)}
                  >
                    <span className="event-number">{event.event_id}</span>
                    <span className={`event-dot ${event.event_type}`} />
                    <strong>{event.event_type}</strong>
                    <span className="event-decision">{event.decision}</span>
                    <span className="event-depth">Depth {event.depth}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="nq-panel nq-tree-panel">
            <div className="nq-panel-heading">
              <div>
                <h2>State-Space Tree</h2>
                <p>Each node represents a recorded search state.</p>
              </div>
            </div>

            <div className="nq-tree-canvas">
              {tree.nodes.length > 0 ? (
                <ReactFlow
                  nodes={tree.nodes}
                  edges={tree.edges}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable
                  nodesConnectable={false}
                  elementsSelectable
                >
                  <Background color="#26344b" gap={20} />
                  <MiniMap
                    pannable
                    zoomable
                    bgColor="#111c30"
                    maskColor="rgba(5, 10, 20, 0.72)"
                    nodeColor={(node) =>
                      node.style?.border?.match(/#[0-9a-fA-F]{6}/)?.[0] ||
                      "#64748b"
                    }
                    nodeStrokeColor="#64748b"
                    nodeBorderRadius={4}
                  />
                  <Controls />
                </ReactFlow>
              ) : (
                <div className="nq-empty-tree">
                  Run the algorithm to generate its state-space tree.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="nq-empty-state">
          <div className="nq-empty-icon">{"\u2655"}</div>
          <h2>Ready to explore backtracking?</h2>
          <p>
            Choose a board size and run the algorithm to generate its execution
            events, metrics, and state-space tree.
          </p>
        </div>
      )}
    </section>
  );
}
