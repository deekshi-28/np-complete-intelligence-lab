
export const EVENT_COLORS = {
  START: "#64748b",
  DECISION: "#60a5fa",
  VALID: "#34d399",
  PRUNE: "#f87171",
  BACKTRACK: "#fbbf24",
  SOLUTION: "#a78bfa",
  COMPLETE: "#94a3b8",
};

export function groupEventsByState(events = []) {
  const stateMap = new Map();

  events.forEach((event) => {
    if (event.state_id === null || event.state_id === undefined) {
      return;
    }

    const id = String(event.state_id);

    if (!stateMap.has(id)) {
      stateMap.set(id, {
        id,
        parentId:
          event.parent_id === null || event.parent_id === undefined
            ? null
            : String(event.parent_id),
        depth: event.depth ?? 0,
        state: event.state ?? null,
        status: event.event_type ?? "UNKNOWN",
        decision: event.decision ?? null,
        reason: event.reason ?? null,
        eventCount: 0,
        eventTypes: [],
      });
    }

    const node = stateMap.get(id);

    node.eventCount += 1;
    node.state = event.state ?? node.state;
    node.status = event.event_type ?? node.status;
    node.decision = event.decision ?? node.decision;
    node.reason = event.reason ?? node.reason;

    if (event.event_type) {
      node.eventTypes.push(event.event_type);
    }
  });

  return stateMap;
}

export function buildStateRelationships(stateMap) {
  const children = new Map();

  stateMap.forEach((node) => {
    children.set(node.id, []);
  });

  stateMap.forEach((node) => {
    if (
      node.parentId !== null &&
      node.parentId !== node.id &&
      stateMap.has(node.parentId)
    ) {
      children.get(node.parentId).push(node.id);
    }
  });

  children.forEach((childIds, parentId) => {
    children.set(parentId, [...new Set(childIds)]);
  });

  const roots = [...stateMap.values()]
    .filter(
      (node) =>
        node.parentId === null || !stateMap.has(node.parentId)
    )
    .map((node) => node.id);

  return { children, roots };
}

export function getActiveState(events, currentStep) {
  const event = events[currentStep];

  return event?.state_id === null || event?.state_id === undefined
    ? null
    : String(event.state_id);
}

export function getVisibleEvents(events = [], currentStep = 0) {
  return events.slice(0, Math.max(0, currentStep + 1));
}
