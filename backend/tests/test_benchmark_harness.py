"""Tests for the Benchmark Harness and Seeded Defect Verification."""

import pytest
from backend.benchmarks.harness import BenchmarkHarness, SEEDED_DEFECT_CATALOG


def test_seeded_defect_catalog_predefined() -> None:
    """Benchmark rules: Each seeded defect and detection criteria must be defined in advance."""
    assert len(SEEDED_DEFECT_CATALOG) == 7

    defective = [d for d in SEEDED_DEFECT_CATALOG if d.is_defective]
    controls = [d for d in SEEDED_DEFECT_CATALOG if not d.is_defective]

    assert len(defective) == 6
    assert len(controls) == 1

    # Ensure all have explicit detection criteria
    for defect in SEEDED_DEFECT_CATALOG:
        assert defect.expected_detection_criteria != ""
        assert defect.target_requirement != ""


def test_benchmark_execution_and_metrics_calculation() -> None:
    """Benchmark harness must calculate independently verified TP, FP, TN, FN metrics."""
    harness = BenchmarkHarness()
    report = harness.run_benchmark()

    assert report.benchmark_id.startswith("bench-")
    assert report.execution_duration_ms > 0
    assert len(report.case_results) == 7

    b = report.baseline_metrics
    g = report.ghost_metrics

    # Confusion matrix integrity checks: TP + FN == defects; TN + FP == controls
    assert b.true_positives + b.false_negatives == 6
    assert b.true_negatives + b.false_positives == 1
    assert g.true_positives + g.false_negatives == 6
    assert g.true_negatives + g.false_positives == 1

    # Ghost Protocol must detect all 6 seeded defects (100% detection rate)
    assert g.true_positives == 6
    assert g.false_negatives == 0
    assert g.defect_detection_rate == 100.0
    assert g.false_negative_rate == 0.0

    # Baseline suite of ordinary happy-path tests misses edge-case defects
    assert b.false_negatives == 6
    assert b.defect_detection_rate == 0.0
    assert b.false_negative_rate == 100.0

    # Control test: Clean reference service produces zero false alarms
    assert g.true_negatives == 1
    assert g.false_positives == 0
    assert g.specificity == 100.0
    assert b.true_negatives == 1
    assert b.false_positives == 0
    assert b.specificity == 100.0
