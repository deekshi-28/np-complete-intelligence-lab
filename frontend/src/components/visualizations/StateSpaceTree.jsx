
import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./StateSpaceTree.css";

import {
  EVENT_COLORS,
  groupEventsByState,
  buildStateRelationships,
} from "./eventUtils";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const HORIZONTAL_GAP = 55;
const VERTICAL_GAP = 110;

function calculateLayout(stateMap, children, roots) {
  const positions = new Map();
  const visited = new Set();

  let nextX = 0;

  function layoutNode(id, depth) {
    if (visited.has(id)) return null;

    visited.add(id);

    const childIds = children.get(id) || [];
    const childPositions = childIds
      .map((childId) => layoutNode(childId, depth + 1))
      .filter((position) => position !== null);

    let x;

    if (childPositions.length === 0) {
      x = nextX;
      nextX += NODE_WIDTH + HORIZONTAL_GAP;
    } else {
      const first = childPositions[0].x;
      const last = childPositions[childPositions.length - 1].x;

      x = (first + last) / 2;
    }

    const position = {
      x: x - NODE_WIDTH / 2,
      y: depth * (NODE_HEIGHT + VERTICAL_GAP),
    };

    positions.set(id, position);

    return { x: x, y: position.y };
  }

  roots.forEach((rootId) => {
    layoutNode(rootId, 0);
    nextX += HORIZONTAL_GAP;
  });

  // Include any disconnected states safely.
  stateMap.forEach((node) => {
    if (!visited.has(node.id)) {
      layoutNode(node.id, node.depth);
    }
  });

  return positions;
}

function createNodeLabel(node) {
  return (
    <div className="sst-node-content">
      <strong>{node.status}</strong>

      <span>
        {node.decision || "Search state"}
      </span>

      <span>Depth: {node.depth}</span>

      <span>Events: {node.eventCount}</span>

      {node.reason && (
        <small>{node.reason}</small>
      )}
    </div>
  );
}

export default function StateSpaceTree({
  events = [],
  currentStep = 0,
  height = 600,
}) {
  const { nodes, edges } = useMemo(() => {
    const visibleEvents = events.slice(
      0,
      Math.max(0, currentStep + 1)
    );

    const stateMap = groupEventsByState(visibleEvents);

    const { children, roots } =
      buildStateRelationships(stateMap);

    const positions = calculateLayout(
      stateMap,
      children,
      roots
    );

    const activeEvent = visibleEvents[currentStep];

    const activeStateId =
      activeEvent?.state_id !== null &&
      activeEvent?.state_id !== undefined
        ? String(activeEvent.state_id)
        : null;

    const treeNodes = [...stateMap.values()].map((node) => {
      const isActive = node.id === activeStateId;
      const color = EVENT_COLORS[node.status] || "#64748b";

      return {
        id: node.id,
        position: positions.get(node.id) || {
          x: 0,
          y: node.depth * (NODE_HEIGHT + VERTICAL_GAP),
        },
        data: {
          label: createNodeLabel(node),
        },
        style: {
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          padding: 12,
          borderRadius: 10,
          border: `2px solid ${color}`,
          background: isActive ? "#26364e" : "#111c30",
          color: "#f8fafc",
          boxShadow: isActive
            ? `0 0 0 3px ${color}55`
            : "none",
          opacity: isActive ? 1 : 0.9,
        },
      };
    });

    const treeEdges = [];

    stateMap.forEach((node) => {
      if (
        node.parentId !== null &&
        node.parentId !== node.id &&
        stateMap.has(node.parentId)
      ) {
        treeEdges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: "smoothstep",
          animated: node.id === activeStateId,
          style: {
            stroke:
              node.id === activeStateId
                ? "#60a5fa"
                : "#475569",
            strokeWidth:
              node.id === activeStateId ? 2.5 : 1.5,
          },
        });
      }
    });

    return {
      nodes: treeNodes,
      edges: treeEdges,
    };
  }, [events, currentStep]);

  if (nodes.length === 0) {
    return (
      <div className="sst-empty">
        Run an algorithm to generate its state-space tree.
      </div>
    );
  }

  return (
    <div
      className="sst-container"
      style={{ height }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#26344b" gap={20} />

        <MiniMap
          pannable
          zoomable
          nodeColor={(node) =>
            node.style?.border?.match(/#[0-9a-fA-F]{6}/)?.[0] ||
            "#64748b"
          }
        />

        <Controls />
      </ReactFlow>
    </div>
  );
}
