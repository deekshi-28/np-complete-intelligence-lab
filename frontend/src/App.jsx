import { useEffect, useState } from "react";

import {
  Activity,
  TrendingUp,
  Atom,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Code2,
  Cpu,
  GitBranch,
  Layers3,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  Zap,
} from "lucide-react";

import { checkBackendHealth } from "./services/api";

import NQueensWorkspace from "./pages/NQueensWorkspace";
import GraphColoringWorkspace from "./pages/GraphColoringWorkspace";
import SubsetSumWorkspace from "./pages/SubsetSumWorkspace";
import HamiltonianCycleWorkspace from "./pages/HamiltonianCycleWorkspace";
import ExecutionAnalytics from "./pages/ExecutionAnalytics";
import ComplexityAnalysis from "./pages/ComplexityAnalysis";
import BenchmarkingLab from "./pages/BenchmarkingLab";

import "./App.css";

const algorithms = [
  {
    id: "n-queens",
    name: "N-Queens",
    category: "Constraint Satisfaction",
    description:
      "Place N queens on an N × N chessboard so that no two queens attack each other.",
    complexity: "O(N!)",
    type: "Factorial",
    icon: Target,
    color: "violet",
    technique: "Backtracking",
  },
  {
    id: "graph-coloring",
    name: "Graph Coloring",
    category: "Combinatorial Optimization",
    description:
      "Assign colors to graph vertices while ensuring that adjacent vertices have different colors.",
    complexity: "O(K^V × V)",
    type: "Exponential",
    icon: Network,
    color: "blue",
    technique: "Backtracking",
  },
  {
    id: "subset-sum",
    name: "Subset Sum",
    category: "Decision Problem",
    description:
      "Find subsets of given numbers whose sum equals a specified target value.",
    complexity: "O(2^N)",
    type: "Exponential",
    icon: Layers3,
    color: "cyan",
    technique: "Backtracking",
  },
  {
    id: "hamiltonian-cycle",
    name: "Hamiltonian Cycle",
    category: "Graph Theory",
    description:
      "Find a cycle that visits every vertex exactly once and returns to the starting vertex.",
    complexity: "O(V!)",
    type: "Factorial",
    icon: GitBranch,
    color: "orange",
    technique: "Backtracking",
  },
];

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");

  if (hash.startsWith("algorithm/")) {
    const id = hash.split("/")[1];
    const valid = [
      "n-queens",
      "graph-coloring",
      "subset-sum",
      "hamiltonian-cycle",
    ];

    if (valid.includes(id)) {
      return { algorithm: id, module: null };
    }
  }

  if (hash.startsWith("module/")) {
    const id = hash.split("/")[1];
    const valid = [
      "execution-analytics",
      "complexity-analysis",
      "benchmarking-lab",
    ];

    if (valid.includes(id)) {
      return { algorithm: null, module: id };
    }
  }

  return { algorithm: null, module: null };
}

function App() {
  const [backend, setBackend] = useState("checking");
  const [backendMessage, setBackendMessage] = useState(
    "Checking backend connection...",
  );

  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  // Check backend connection
  useEffect(() => {
    let mounted = true;

    checkBackendHealth()
      .then((data) => {
        if (!mounted) return;

        setBackend("connected");
        setBackendMessage(data.message || "Backend is operational");
      })
      .catch(() => {
        if (!mounted) return;

        setBackend("disconnected");
        setBackendMessage("Unable to connect to FastAPI backend");
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function syncRoute() {
      const route = getRouteFromHash();
      setSelectedAlgorithm(route.algorithm);
      setSelectedModule(route.module);
    }

    syncRoute();

    window.addEventListener("hashchange", syncRoute);

    return () => {
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  // Navigation functions
  function navigateTo(hash, algorithm = null, module = null) {
    setSelectedAlgorithm(algorithm);
    setSelectedModule(module);

    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }

  function openDashboard() {
    navigateTo("#dashboard");
  }

  function openAlgorithms() {
    navigateTo("#algorithms");
  }

  function openAlgorithm(algorithmId) {
    navigateTo(`#algorithm/${algorithmId}`, algorithmId);
  }

  function openAnalytics() {
    navigateTo("#module/execution-analytics", null, "execution-analytics");
  }

  function openComplexityAnalysis() {
    navigateTo("#module/complexity-analysis", null, "complexity-analysis");
  }

  function openBenchmarkingLab() {
    navigateTo("#module/benchmarking-lab", null, "benchmarking-lab");
  }

  // Current page information
  const selectedAlgorithmName = algorithms.find(
    (item) => item.id === selectedAlgorithm,
  )?.name;

  const breadcrumbTitle =
    selectedModule === "execution-analytics"
      ? "Execution Analytics"
      : selectedModule === "complexity-analysis"
        ? "Complexity Analysis"
        : selectedModule === "benchmarking-lab"
          ? "Benchmarking Lab"
          : selectedAlgorithm
            ? `${selectedAlgorithmName || "Algorithm"} Visualizer`
            : "Dashboard";

  const dashboardVisible = !selectedAlgorithm && !selectedModule;

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <BrainCircuit size={25} />
          </div>

          <div>
            <h2>NP-Complete</h2>
            <span>INTELLIGENCE LAB</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <a
            href="#dashboard"
            className={`nav-item ${dashboardVisible ? "active" : ""}`}
            onClick={openDashboard}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </a>

          <a
            href="#algorithms"
            className={`nav-item ${selectedAlgorithm ? "active" : ""}`}
            onClick={openAlgorithms}
          >
            <Workflow size={18} />
            <span>Algorithms</span>
          </a>

          <button
            type="button"
            className={`nav-item nav-button ${
              selectedModule === "complexity-analysis" ? "active" : ""
            }`}
            onClick={openComplexityAnalysis}
          >
            <ChartNoAxesCombined size={18} />
            <span>Complexity Analysis</span>
          </button>

          <button
            type="button"
            className={`nav-item nav-button ${
              selectedModule === "execution-analytics" ? "active" : ""
            }`}
            onClick={openAnalytics}
          >
            <Activity size={18} />
            <span>Execution Analytics</span>
          </button>

          <button
            type="button"
            className={`nav-item nav-button ${
              selectedModule === "benchmarking-lab" ? "active" : ""
            }`}
            onClick={openBenchmarkingLab}
          >
            <TrendingUp size={18} />
            <span>Benchmarking Lab</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className={`status-dot ${backend}`} />

            <div>
              <strong>Backend Status</strong>
              <span>
                {backend === "connected"
                  ? "Operational"
                  : backend === "checking"
                    ? "Connecting..."
                    : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="sidebar-version">
            NP-Complete Intelligence Lab
            <span>Version 1.0.0</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{breadcrumbTitle}</strong>
          </div>

          <div className="topbar-right">
            <div className="live-indicator">
              <span className={`status-dot ${backend}`} />

              {backend === "connected"
                ? "System Online"
                : backend === "checking"
                  ? "Connecting"
                  : "System Offline"}
            </div>

            <div className="profile-icon">
              <Cpu size={19} />
            </div>
          </div>
        </header>

        {/* DASHBOARD */}
        <div
          id="dashboard"
          className={
            dashboardVisible ? "dashboard-content" : "dashboard-hidden"
          }
        >
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} />
                ALGORITHM INTELLIGENCE PLATFORM
              </div>

              <h1>NP-Complete Intelligence Lab</h1>

              <p>
                Explore computational complexity, execute backtracking
                algorithms, and visualize their state-space search process.
              </p>
            </div>

            <div className="welcome-decoration">
              <Atom size={82} strokeWidth={0.8} />
            </div>
          </section>

          {/* DASHBOARD STATISTICS */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">
                <Code2 size={20} />
              </div>

              <div className="stat-details">
                <span>Implemented Algorithms</span>
                <strong>04</strong>
                <small>Backtracking algorithms</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <Zap size={20} />
              </div>

              <div className="stat-details">
                <span>Algorithm Technique</span>
                <strong>01</strong>
                <small>Backtracking approach</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon cyan">
                <ChartNoAxesCombined size={20} />
              </div>

              <div className="stat-details">
                <span>Growth Categories</span>
                <strong>03</strong>
                <small>Polynomial, exponential, factorial</small>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <ShieldCheck size={20} />
              </div>

              <div className="stat-details">
                <span>Backend Connection</span>

                <strong className={`connection-text ${backend}`}>
                  {backend === "connected"
                    ? "Online"
                    : backend === "checking"
                      ? "Checking"
                      : "Offline"}
                </strong>

                <small>{backendMessage}</small>
              </div>
            </div>
          </section>

          {/* ALGORITHM LIBRARY */}
          <section className="section-heading" id="algorithms">
            <div>
              <div className="eyebrow">ALGORITHM LIBRARY</div>
              <h2>Explore Algorithms</h2>

              <p>
                Select an algorithm to explore its problem definition and
                execution.
              </p>
            </div>

            <div className="algorithm-count">
              <CircleDot size={15} />4 PROBLEMS
            </div>
          </section>

          <section className="algorithm-grid">
            {algorithms.map((algorithm) => {
              const Icon = algorithm.icon;

              return (
                <article className="algorithm-card" key={algorithm.id}>
                  <div className="card-top">
                    <div className={`algorithm-icon ${algorithm.color}`}>
                      <Icon size={23} />
                    </div>

                    <span className="technique-tag">{algorithm.technique}</span>
                  </div>

                  <div className="algorithm-category">{algorithm.category}</div>

                  <h3>{algorithm.name}</h3>

                  <p className="algorithm-description">
                    {algorithm.description}
                  </p>

                  <div className="complexity-info">
                    <div>
                      <span>Worst-case complexity</span>
                      <strong>{algorithm.complexity}</strong>
                    </div>

                    <span className={`complexity-tag ${algorithm.color}`}>
                      {algorithm.type}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="explore-button"
                    onClick={() => openAlgorithm(algorithm.id)}
                  >
                    Explore Algorithm
                    <ChevronRight size={17} />
                  </button>
                </article>
              );
            })}
          </section>

          {/* PLATFORM MODULES */}
          <section className="roadmap-section" id="roadmap">
            <div className="roadmap-heading">
              <div>
                <div className="eyebrow">PLATFORM MODULES</div>
                <h2>Intelligence Lab Modules</h2>
              </div>

              <span className="development-tag">Development roadmap</span>
            </div>

            <div className="module-grid">
              <div className="module-card">
                <div className="module-icon purple">
                  <BrainCircuit size={20} />
                </div>

                <div>
                  <h3>Problem & Complexity Modeling</h3>
                  <p>
                    Problem definitions, constraints and theoretical complexity.
                  </p>

                  <span className="module-state complete">
                    <CheckCircle2 size={13} />
                    Backend foundation ready
                  </span>
                </div>
              </div>

              <div className="module-card">
                <div className="module-icon blue">
                  <GitBranch size={20} />
                </div>

                <div>
                  <h3>State-Space Visualization</h3>
                  <p>
                    Visualize decisions, recursive states, pruning and
                    backtracking.
                  </p>

                  <span className="module-state complete">
                    <CheckCircle2 size={13} />
                    Implemented
                  </span>
                </div>
              </div>

              <div className="module-card">
                <div className="module-icon cyan">
                  <ChartNoAxesCombined size={20} />
                </div>

                <div>
                  <h3>Execution Analytics</h3>
                  <p>
                    Analyze recursive calls, decisions, pruning and execution
                    metrics.
                  </p>

                  <button
                    type="button"
                    className="module-open-button"
                    onClick={openAnalytics}
                  >
                    <CheckCircle2 size={13} />
                    Open Analytics
                  </button>
                </div>
              </div>

              <div className="module-card">
                <div className="module-icon orange">
                  <Search size={20} />
                </div>

                <div>
                  <h3>Complexity Comparison</h3>
                  <p>Compare polynomial, exponential and factorial growth.</p>

                  <button
                    type="button"
                    className="module-open-button"
                    onClick={openComplexityAnalysis}
                  >
                    <CheckCircle2 size={13} />
                    Open Complexity Analysis
                  </button>
                </div>
              </div>
            </div>
          </section>

          <footer className="footer">
            <span>NP-Complete Intelligence Lab</span>
            <span>
              Algorithm Visualization & Computational Complexity Analysis
            </span>
          </footer>
        </div>

        {/* N-QUEENS */}
        {selectedAlgorithm === "n-queens" && (
          <NQueensWorkspace onBack={openDashboard} />
        )}

        {/* GRAPH COLORING */}
        {selectedAlgorithm === "graph-coloring" && (
          <GraphColoringWorkspace onBack={openDashboard} />
        )}

        {/* SUBSET SUM */}
        {selectedAlgorithm === "subset-sum" && (
          <SubsetSumWorkspace onBack={openDashboard} />
        )}

        {/* HAMILTONIAN CYCLE */}
        {selectedAlgorithm === "hamiltonian-cycle" && (
          <HamiltonianCycleWorkspace onBack={openDashboard} />
        )}

        {/* EXECUTION ANALYTICS */}
        {selectedModule === "execution-analytics" && <ExecutionAnalytics />}

        {/* COMPLEXITY ANALYSIS */}
        {selectedModule === "complexity-analysis" && (
          <ComplexityAnalysis onBack={openDashboard} />
        )}

        {/* BENCHMARKING LAB */}
        {selectedModule === "benchmarking-lab" && <BenchmarkingLab />}
      </main>
    </div>
  );
}

export default App;
