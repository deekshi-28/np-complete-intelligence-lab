const API_BASE_URL = "http://127.0.0.1:8000";

// Shared API request handler
async function request(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure the FastAPI server is running.",
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || "Invalid input").join(", ")
      : typeof detail === "string"
        ? detail
        : "Backend request failed.";

    throw new Error(message);
  }

  return data;
}

// Backend health check
export async function checkBackendHealth() {
  return request("/api/health");
}

// N-Queens execution
export async function runNQueens({
  n = 4,
  max_solutions = 10,
  max_events = 5000,
} = {}) {
  return request("/api/algorithms/n-queens/run", {
    method: "POST",
    body: JSON.stringify({
      n,
      max_solutions,
      max_events,
    }),
  });
}

// Graph Coloring execution
export async function runGraphColoring({
  adjacency,
  num_colors = 3,
  max_solutions = 10,
  max_events = 5000,
} = {}) {
  return request("/api/algorithms/graph-coloring/run", {
    method: "POST",
    body: JSON.stringify({
      adjacency,
      num_colors,
      max_solutions,
      max_events,
    }),
  });
}

// Subset Sum execution
export async function runSubsetSum({
  numbers,
  target,
  max_solutions = 20,
  max_events = 5000,
} = {}) {
  return request("/api/algorithms/subset-sum/run", {
    method: "POST",
    body: JSON.stringify({
      numbers,
      target,
      max_solutions,
      max_events,
    }),
  });
}

// Hamiltonian Cycle execution
export async function runHamiltonianCycle({
  adjacency,
  max_solutions = 20,
  max_events = 5000,
} = {}) {
  return request("/api/algorithms/hamiltonian-cycle/run", {
    method: "POST",
    body: JSON.stringify({
      adjacency,
      max_solutions,
      max_events,
    }),
  });
}

// Phase 6: Benchmarking Lab
export async function runBenchmark({
  problem_id,
  sizes,
  repeats = 3,
  max_solutions = 1,
  max_events = 100,
  num_colors = 3,
} = {}) {
  return request("/api/benchmarks/run", {
    method: "POST",
    body: JSON.stringify({
      problem_id,
      sizes,
      repeats,
      max_solutions,
      max_events,
      num_colors,
    }),
  });
}
