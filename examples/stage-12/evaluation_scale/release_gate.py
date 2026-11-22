"""Thin release-gate entry point for the local evaluation harness."""
from evaluation_engine import ReleaseGate, calibration_report, evaluate_dataset


def evaluate_release(dataset, predictions, judge_scores, human_labels):
    report = evaluate_dataset(dataset, predictions)
    calibration = calibration_report(judge_scores, human_labels)
    decision = ReleaseGate(min_samples=2, min_quality_lcb=0.0).evaluate(report, calibration["ece"])
    return {"report": report, "judge_calibration": calibration,
            "passed": decision.passed, "reasons": decision.reasons}
