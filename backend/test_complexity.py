from app.analyzers.complexity_analyzer import ComplexityAnalyzer


problems = [
    "n_queens",
    "graph_coloring",
    "subset_sum",
    "hamiltonian_cycle"
]

for problem in problems:

    result = ComplexityAnalyzer.analyze(problem)

    print("\n" + "=" * 50)
    print("PROBLEM:", result["name"])
    print("TIME COMPLEXITY:", result["time_complexity"])
    print("SPACE COMPLEXITY:", result["space_complexity"])
    print("GROWTH FUNCTION:", result["growth_function"])
    print("COMPLEXITY CLASS:", result["complexity_class"])
    print("=" * 50)