#!/usr/bin/env python3
"""Ghost Protocol Benchmark Execution Script.

Runs the independent benchmark harness comparing Baseline Happy-Path tests
against Ghost Protocol Adversarial & Invariant tests across 7 isolated fixtures
(6 seeded defects + 1 clean control).
"""

import json
import sys
from pathlib import Path

# Ensure project root is on PYTHONPATH
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.benchmarks.harness import BenchmarkHarness


def main() -> None:
    print("=" * 80)
    print(" GHOST PROTOCOL — REPRODUCIBLE VERIFICATION BENCHMARK HARNESS")
    print(' "AI says Done. We demand proof."')
    print("=" * 80)
    print()

    harness = BenchmarkHarness()
    print("Executing benchmark against isolated fixtures...")
    report = harness.run_benchmark()

    print(f"\nBenchmark ID: {report.benchmark_id}")
    print(f"Timestamp:    {report.timestamp}")
    print(f"Duration:     {report.execution_duration_ms:.2f} ms")
    print(f"Environment:  Python {report.environment['python_version']} on {report.environment['platform']} ({report.environment['os']})")
    print("-" * 80)

    print("\n--- BASELINE METRICS (Ordinary Happy-Path Tests) ---")
    b = report.baseline_metrics
    print(f"  Total Cases:             {b.total_cases}")
    print(f"  True Positives (Caught): {b.true_positives}")
    print(f"  False Negatives (Missed):{b.false_negatives}")
    print(f"  True Negatives (Clean):  {b.true_negatives}")
    print(f"  False Positives (Alarm): {b.false_positives}")
    print(f"  Defect Detection Rate:   {b.defect_detection_rate}%")
    print(f"  False Negative Rate:     {b.false_negative_rate}%")
    print(f"  Specificity:             {b.specificity}%")
    print(f"  Accuracy:                {b.accuracy}%")

    print("\n--- GHOST PROTOCOL METRICS (Adversarial & Invariants) ---")
    g = report.ghost_metrics
    print(f"  Total Cases:             {g.total_cases}")
    print(f"  True Positives (Caught): {g.true_positives}")
    print(f"  False Negatives (Missed):{g.false_negatives}")
    print(f"  True Negatives (Clean):  {g.true_negatives}")
    print(f"  False Positives (Alarm): {g.false_positives}")
    print(f"  Defect Detection Rate:   {g.defect_detection_rate}%")
    print(f"  False Negative Rate:     {g.false_negative_rate}%")
    print(f"  Specificity:             {g.specificity}%")
    print(f"  Accuracy:                {g.accuracy}%")

    print("\n" + "=" * 80)
    print(" COMPARATIVE SUMMARY MATRIX")
    print("=" * 80)
    print(f"{'Fixture ID':<26} | {'Req':<11} | {'Baseline':<16} | {'Ghost Protocol':<16}")
    print("-" * 80)
    for c in report.case_results:
        print(f"{c.defect_id:<26} | {c.target_requirement:<11} | {c.baseline_classification:<16} | {c.ghost_classification:<16}")

    print("-" * 80)
    print(f"Defect Detection Delta:        +{report.comparative_advantage['defect_detection_delta_percentage_points']}%")
    print(f"False Negative Reduction:      -{report.comparative_advantage['false_negative_reduction_percentage_points']}%")
    print(f"Clean Specificity Maintained:  {report.comparative_advantage['clean_control_specificity_maintained']}")
    print(f"\nConclusion: {report.comparative_advantage['conclusion']}")
    print("=" * 80)

    # Save benchmark report artifact
    output_path = PROJECT_ROOT / "evidence" / f"benchmark_report_{report.benchmark_id}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))
    print(f"\nReport artifact preserved at: {output_path}")


if __name__ == "__main__":
    main()
