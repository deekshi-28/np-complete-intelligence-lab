const STORAGE_KEY = "np_complete_execution_history";
const MAX_HISTORY = 200;

export function getExecutionHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read execution history:", error);
    return [];
  }
}

export function saveExecution(algorithmId, result, inputSummary = {}) {
  if (!algorithmId || !result || typeof result !== "object") {
    throw new Error("Invalid execution data.");
  }

  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    algorithmId,
    algorithmName:
      {
        "n-queens": "N-Queens",
        "graph-coloring": "Graph Coloring",
        "subset-sum": "Subset Sum",
        "hamiltonian-cycle": "Hamiltonian Cycle",
      }[algorithmId] || algorithmId,
    executedAt: new Date().toISOString(),
    input: inputSummary,
    result: {
      result: result.result ?? null,
      is_satisfiable: result.is_satisfiable ?? null,
      is_hamiltonian: result.is_hamiltonian ?? null,
      solutions_found: result.solutions_found ?? 0,
      search_complete: result.search_complete ?? false,
      metrics: result.metrics ?? {},
      execution_analysis: result.execution_analysis ?? {},
      visualization: {
        total_events_recorded: result.visualization?.total_events_recorded ?? 0,
        events_truncated: result.visualization?.events_truncated ?? false,
      },
    },
  };

  const history = getExecutionHistory();

  const updated = [record, ...history].slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Unable to save execution history:", error);
    throw new Error("Could not save execution history in this browser.");
  }

  return record;
}

export function clearExecutionHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
