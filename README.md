# NP-Complete Intelligence Lab

### An Interactive Algorithm Visualization and Computational Complexity Analysis Platform

NP-Complete Intelligence Lab is an interactive web-based platform designed to explore backtracking algorithms, visualize their execution, analyze computational complexity, and evaluate algorithm performance through benchmarking.

The platform combines algorithm execution, state-space visualization, execution analytics, theoretical complexity modeling, and empirical performance analysis in one environment.

---

## Project Overview

Understanding NP-Complete and computationally intensive problems requires more than studying their theoretical definitions. It is also important to understand how algorithms explore possible solutions, make decisions, backtrack from invalid states, and consume computational resources.

NP-Complete Intelligence Lab addresses this by providing an interactive environment where users can execute selected combinatorial problems, observe their search processes, and analyze their computational behavior.

The system uses **backtracking** to solve four selected problems and provides visual and analytical representations of their execution.

## Key Features

### 1. Algorithm Execution and Visualization
- Interactive execution of four combinatorial problems.
- Backtracking-based solution generation.
- Step-by-step execution playback.
- State-space tree visualization.
- Execution timeline with recorded algorithm events.
- Support for limiting the number of solutions and recorded events.

### 2. Problem Library
Provides information about the supported problems, including:
- Problem descriptions.
- Input parameters and constraints.
- Algorithmic techniques.
- Complexity classifications.

### 3. Complexity Analysis
- Best-case, average-case, and worst-case time complexity.
- Auxiliary space complexity.
- Growth-function representation.
- Complexity classification.
- Theoretical analysis of algorithm behavior.

### 4. Execution Analytics
Analyzes algorithm execution using metrics such as:
- Recursive calls.
- Decisions made.
- Valid moves.
- Pruned moves.
- Backtracking operations.
- Solutions found.
- Execution time.
- Acceptance and pruning rates.
- Branching factor.
- Maximum search depth.
- Execution event distribution.

### 5. Benchmarking Lab
- Executes algorithms across multiple input sizes.
- Supports repeated benchmark measurements.
- Records execution time statistics.
- Calculates average, minimum, maximum, and standard deviation.
- Analyzes empirical scaling behavior.
- Compares execution metrics across input sizes.

**Note:** Empirical benchmark measurements describe the tested instances and execution environment. They do not independently prove theoretical asymptotic complexity.

---

## Supported Algorithms

The platform currently supports four problems.

| Problem | Technique | Theoretical Classification |
|---|---|---|
| N-Queens | Backtracking | Combinatorial search problem |
| Graph Coloring | Backtracking | NP-Complete for general k-colorability when k ≥ 3 |
| Subset Sum | Backtracking | NP-Complete in the standard binary-encoded decision formulation |
| Hamiltonian Cycle | Backtracking | NP-Complete in its standard decision formulation |

### 1. N-Queens Problem
Places N queens on an N × N chessboard so that no two queens attack each other.

Constraints:
- One queen per row.
- No two queens in the same column.
- No two queens on the same diagonal.

### 2. Graph Coloring Problem
Assigns colors to graph vertices so that no two adjacent vertices share the same color.

Constraints:
- Every vertex receives one color.
- Adjacent vertices must have different colors.

### 3. Subset Sum Problem
Determines whether a subset of the given integers can produce a specified target sum.

Constraints:
- Each input element can be selected at most once.
- Selected elements must sum to the target.

### 4. Hamiltonian Cycle Problem
Determines whether an undirected graph contains a cycle that visits every vertex exactly once.

Constraints:
- Every vertex must be visited exactly once.
- Consecutive vertices must be connected by an edge.
- The final vertex must connect back to the starting vertex.

**Classification note:** N-Queens is included as a backtracking search problem for algorithmic comparison. It is not classified as an NP-Complete problem in this formulation.

---

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript |
| Styling | CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Algorithm Design | Backtracking |
| API Documentation | OpenAPI, Swagger UI |
| Testing | Pytest |
| Development Tools | VS Code, Git |

---

## System Architecture

The application follows a frontend-backend architecture.

```text
                  USER
                    |
                    v
          REACT + VITE FRONTEND
                    |
                    v
              FASTAPI BACKEND
                    |
       +------------+-------------+
       |            |             |
       v            v             v
   ALGORITHMS    ANALYZERS      ENGINES
       |            |             |
       +------------+-------------+
                    |
                    v
             EXECUTION RESULTS
                    |
          +---------+---------+
          |                   |
          v                   v
    VISUALIZATION        ANALYTICS
          |                   |
          +---------+---------+
                    |
                    v
             POSTGRESQL DATABASE
```

The frontend communicates with the backend through REST API endpoints. The backend handles algorithm execution, complexity analysis, benchmarking, and associated processing.

---

## Project Structure

```text
np-complete-intelligence-lab/
│
├── backend/
│   ├── app/
│   │   ├── algorithms/
│   │   ├── analyzers/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── engines/
│   │   ├── experiments/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── theory/
│   │
│   ├── tests/
│   │   ├── test_execution_analyzer.py
│   │   ├── test_graph_coloring.py
│   │   ├── test_hamiltonian_cycle.py
│   │   ├── test_n_queens.py
│   │   └── test_subset_sum.py
│   │
│   ├── test_complexity.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── visualizations/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   └── package.json
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## Installation and Setup

### Prerequisites

Install the following before running the project:

- Python 3.11 or later
- Node.js and npm
- PostgreSQL
- Git (optional, for version control)

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd np-complete-intelligence-lab
```

### 2. Backend Setup

Open a terminal and navigate to the backend directory.

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv venv
```

Activate the environment:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Configure the PostgreSQL database connection using the application's backend configuration.

Start the FastAPI server:

```powershell
python -m uvicorn app.main:app --reload
```

Backend server:

`http://127.0.0.1:8000`

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory.

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Frontend application:

`http://localhost:5173`

### 4. API Documentation

Once the backend server is running, access the interactive Swagger documentation:

`http://127.0.0.1:8000/docs`

OpenAPI specification:

`http://127.0.0.1:8000/openapi.json`

---

## API Endpoints

### System Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Root endpoint |
| GET | `/api/health` | Backend and database health check |

### Problem Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/problems/` | List supported problems |
| GET | `/api/problems/{problem_id}` | Retrieve problem details |
| POST | `/api/problems/{problem_id}/validate` | Validate problem inputs |
| GET | `/api/problems/{problem_id}/complexity` | Retrieve complexity analysis |

### Algorithm Execution

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/algorithms/n-queens/run` | Execute N-Queens |
| POST | `/api/algorithms/graph-coloring/run` | Execute Graph Coloring |
| POST | `/api/algorithms/subset-sum/run` | Execute Subset Sum |
| POST | `/api/algorithms/hamiltonian-cycle/run` | Execute Hamiltonian Cycle |

### Benchmarking

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/benchmarks/run` | Execute and analyze benchmarks |

---

## Testing

The backend uses Pytest for automated testing.

Run the test suite from the backend directory:

```bash
python -m pytest -v
```

### Current Test Results

| Metric | Result |
|---|---:|
| Total tests | 50 |
| Passed | 50 |
| Failed | 0 |
| Execution time | 1.25 seconds |

The tests cover:
- Algorithm solution correctness.
- Solution counts and constraints.
- Input validation.
- Execution event recording.
- Execution analytics.
- Backtracking and pruning metrics.
- Edge cases and solution limits.

---

## Benchmarking Methodology

The Benchmarking Lab evaluates algorithm execution across selected input sizes.

The system records:
- Input size.
- Execution time for each run.
- Average execution time.
- Minimum and maximum execution time.
- Standard deviation.
- Recursive calls.
- Decisions.
- Backtracking operations.

It also calculates empirical scaling estimates between tested input sizes.

Benchmark measurements include instrumented solver execution time. They should be interpreted as observations of specific test instances rather than definitive evidence of asymptotic complexity.

---

## Project Objectives

1. Implement selected combinatorial problems using backtracking.
2. Visualize algorithm execution through state-space representations.
3. Analyze theoretical time and space complexity.
4. Measure execution behavior using algorithmic performance metrics.
5. Compare empirical execution measurements across input sizes.
6. Provide an interactive environment for understanding computational complexity.

---

## Future Enhancements

Potential improvements include:

- Additional NP-Complete problem implementations.
- More algorithmic techniques, including branch and bound.
- Enhanced comparison between different solving strategies.
- Larger-scale benchmark experiments.
- Exportable execution reports.
- Additional visualization and analytics capabilities.

---

## Academic Project

**Project:** NP-Complete Intelligence Lab

**Domain:** Design and Analysis of Algorithms (DAA)
**Focus Areas:** Backtracking, Computational Complexity, Algorithm Visualization, Execution Analytics, and Performance Benchmarking.

---

*Developed as an academic project to explore algorithmic problem-solving, computational complexity, and the practical behavior of backtracking algorithms.*