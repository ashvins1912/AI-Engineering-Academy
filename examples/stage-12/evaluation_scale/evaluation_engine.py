"""Offline, confidence-aware evaluation harness for AI systems."""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
import math
import random
import re
from collections import defaultdict


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    query: str
    relevant_doc_ids: frozenset[str]
    expected_facts: frozenset[str]
    answerable: bool
    slices: dict[str, str] = field(default_factory=dict)
    expected_tool_calls: frozenset[str] = frozenset()
    source_fingerprints: frozenset[str] = frozenset()
    high_risk: bool = False


@dataclass(frozen=True)
class Prediction:
    case_id: str
    retrieved_doc_ids: tuple[str, ...]
    answer: str
    cited_doc_ids: tuple[str, ...]
    abstained: bool
    safety_violations: tuple[str, ...] = ()
    tool_calls: tuple[str, ...] = ()
    latency_ms: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0


@dataclass(frozen=True)
class EvaluationDataset:
    version: str
    split: str
    cases: tuple[EvalCase, ...]

    def validate(self) -> None:
        if not self.version or self.split not in {"train", "validation", "test", "golden"}:
            raise ValueError("DATASET_VERSION_OR_SPLIT_INVALID")
        ids = [case.case_id for case in self.cases]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_EVALUATION_CASE_ID")
        for case in self.cases:
            if not case.case_id or not case.query.strip():
                raise ValueError("EVALUATION_CASE_REQUIRED_FIELDS_MISSING")

    @property
    def fingerprint(self) -> str:
        material = [
            {
                "id": c.case_id, "query": c.query, "relevant": sorted(c.relevant_doc_ids),
                "facts": sorted(c.expected_facts), "answerable": c.answerable,
                "slices": c.slices, "tools": sorted(c.expected_tool_calls),
                "sources": sorted(c.source_fingerprints), "high_risk": c.high_risk,
            }
            for c in self.cases
        ]
        return sha256(json.dumps({"version": self.version, "split": self.split, "cases": material},
                                 sort_keys=True).encode()).hexdigest()


def assert_no_split_leakage(train: EvaluationDataset, evaluation: EvaluationDataset) -> None:
    train.validate()
    evaluation.validate()
    if train.split != "train" or evaluation.split not in {"validation", "test", "golden"}:
        raise ValueError("DATASET_SPLIT_ROLES_INVALID")
    train_queries = {" ".join(sorted(_tokens(case.query))) for case in train.cases}
    eval_queries = {" ".join(sorted(_tokens(case.query))) for case in evaluation.cases}
    train_sources = set().union(*(case.source_fingerprints for case in train.cases))
    eval_sources = set().union(*(case.source_fingerprints for case in evaluation.cases))
    if train_queries & eval_queries or train_sources & eval_sources:
        raise ValueError("DATASET_SPLIT_LEAKAGE_DETECTED")


def token_f1(answer: str, expected_facts: frozenset[str]) -> float:
    expected = set().union(*(_tokens(fact) for fact in expected_facts)) if expected_facts else set()
    predicted = _tokens(answer)
    if not expected:
        return 1.0 if not predicted else 0.0
    if not predicted:
        return 0.0
    overlap = len(expected & predicted)
    precision = overlap / len(predicted)
    recall = overlap / len(expected)
    return 2 * precision * recall / (precision + recall) if precision + recall else 0.0


def recall_at_k(retrieved: tuple[str, ...], relevant: frozenset[str], k: int) -> float:
    if k < 1:
        raise ValueError("K_MUST_BE_POSITIVE")
    if not relevant:
        return 1.0
    return len(set(retrieved[:k]) & relevant) / len(relevant)


def reciprocal_rank(retrieved: tuple[str, ...], relevant: frozenset[str]) -> float:
    return next((1.0 / rank for rank, item in enumerate(retrieved, 1) if item in relevant), 0.0)


def citation_precision(cited: tuple[str, ...], relevant: frozenset[str]) -> float:
    if not cited:
        return 1.0 if not relevant else 0.0
    return len(set(cited) & relevant) / len(set(cited))


def abstention_correct(prediction: Prediction, case: EvalCase) -> float:
    return float(prediction.abstained == (not case.answerable))


def p95(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    return ordered[max(0, math.ceil(0.95 * len(ordered)) - 1)]


def bootstrap_mean_ci(values: list[float], confidence: float = 0.95,
                      resamples: int = 1000, seed: int = 7) -> tuple[float, float]:
    if (len(values) < 2 or not 0 < confidence < 1 or resamples < 100
            or any(not math.isfinite(value) for value in values)):
        raise ValueError("BOOTSTRAP_INPUT_INVALID")
    rng = random.Random(seed)
    means = []
    n = len(values)
    for _ in range(resamples):
        sample = [values[rng.randrange(n)] for _ in range(n)]
        means.append(sum(sample) / n)
    means.sort()
    tail = (1 - confidence) / 2
    low = means[int(tail * resamples)]
    high = means[min(resamples - 1, math.ceil((1 - tail) * resamples) - 1)]
    return low, high


class DeterministicJudge:
    """A non-generative local judge; it never executes instructions in candidate text."""
    def score(self, answer: str, expected_facts: frozenset[str]) -> float:
        return token_f1(answer, expected_facts)


def calibration_report(scores: list[float], human_labels: list[float], bins: int = 5) -> dict:
    if not scores or len(scores) != len(human_labels) or bins < 1:
        raise ValueError("CALIBRATION_INPUT_INVALID")
    if any(not 0 <= x <= 1 for x in scores + human_labels):
        raise ValueError("CALIBRATION_SCORE_OUT_OF_RANGE")
    brier = sum((score - label) ** 2 for score, label in zip(scores, human_labels)) / len(scores)
    ece = 0.0
    for index in range(bins):
        lower, upper = index / bins, (index + 1) / bins
        bucket = [(s, y) for s, y in zip(scores, human_labels)
                  if lower <= s < upper or (index == bins - 1 and s == 1.0)]
        if bucket:
            avg_score = sum(s for s, _ in bucket) / len(bucket)
            avg_label = sum(y for _, y in bucket) / len(bucket)
            ece += len(bucket) / len(scores) * abs(avg_score - avg_label)
    return {"brier": brier, "ece": ece, "count": len(scores)}


def cohen_kappa(rater_a: list[int], rater_b: list[int]) -> float:
    if not rater_a or len(rater_a) != len(rater_b):
        raise ValueError("RATER_INPUT_INVALID")
    categories = set(rater_a) | set(rater_b)
    observed = sum(a == b for a, b in zip(rater_a, rater_b)) / len(rater_a)
    expected = sum(
        (rater_a.count(category) / len(rater_a)) * (rater_b.count(category) / len(rater_b))
        for category in categories
    )
    return 1.0 if expected == 1 and observed == 1 else (
        0.0 if expected == 1 else (observed - expected) / (1 - expected)
    )


def pairwise_win_rate(candidate: list[float], baseline: list[float]) -> float:
    if not candidate or len(candidate) != len(baseline):
        raise ValueError("PAIRED_EVALUATION_INPUT_INVALID")
    wins = sum(1.0 if c > b else 0.5 if c == b else 0.0 for c, b in zip(candidate, baseline))
    return wins / len(candidate)


def paired_delta_ci(candidate: list[float], baseline: list[float], *, seed: int = 7) -> tuple[float, float]:
    if not candidate or len(candidate) != len(baseline):
        raise ValueError("PAIRED_EVALUATION_INPUT_INVALID")
    return bootstrap_mean_ci([c - b for c, b in zip(candidate, baseline)], seed=seed)


def population_stability_index(baseline_counts: dict[str, int],
                               current_counts: dict[str, int], epsilon: float = 1e-6) -> float:
    if not baseline_counts or not current_counts or epsilon <= 0:
        raise ValueError("DRIFT_DISTRIBUTION_INPUT_INVALID")
    keys = set(baseline_counts) | set(current_counts)
    if any(value < 0 for value in list(baseline_counts.values()) + list(current_counts.values())):
        raise ValueError("DRIFT_COUNTS_INVALID")
    baseline_total = sum(baseline_counts.values())
    current_total = sum(current_counts.values())
    if baseline_total <= 0 or current_total <= 0:
        raise ValueError("DRIFT_COUNTS_EMPTY")
    psi = 0.0
    for key in keys:
        expected = max(epsilon, baseline_counts.get(key, 0) / baseline_total)
        actual = max(epsilon, current_counts.get(key, 0) / current_total)
        psi += (actual - expected) * math.log(actual / expected)
    return psi


def evaluate_dataset(dataset: EvaluationDataset, predictions: list[Prediction], top_k: int = 5) -> dict:
    dataset.validate()
    by_id = {prediction.case_id: prediction for prediction in predictions}
    expected_ids = {case.case_id for case in dataset.cases}
    if set(by_id) != expected_ids:
        raise ValueError("PREDICTION_COVERAGE_MISMATCH")
    retrieval, answer, citation, abstention, safety, tool, latencies = [], [], [], [], [], [], []
    costs, input_tokens, output_tokens = [], [], []
    slice_values: dict[str, list[float]] = defaultdict(list)
    high_risk_count = high_risk_reviewed = high_risk_passed = 0
    successful_tasks = 0
    for case in dataset.cases:
        prediction = by_id[case.case_id]
        if (not math.isfinite(prediction.latency_ms) or prediction.latency_ms < 0
                or not math.isfinite(prediction.cost_usd) or prediction.cost_usd < 0
                or prediction.input_tokens < 0 or prediction.output_tokens < 0):
            raise ValueError("PREDICTION_TELEMETRY_INVALID")
        retrieval.append(recall_at_k(prediction.retrieved_doc_ids, case.relevant_doc_ids, top_k))
        answer.append(DeterministicJudge().score(prediction.answer, case.expected_facts))
        citation.append(citation_precision(prediction.cited_doc_ids, case.relevant_doc_ids))
        abstention.append(abstention_correct(prediction, case))
        safety.append(float(bool(prediction.safety_violations)))
        tool.append(float(set(prediction.tool_calls) == set(case.expected_tool_calls)))
        latencies.append(prediction.latency_ms)
        costs.append(prediction.cost_usd)
        input_tokens.append(prediction.input_tokens)
        output_tokens.append(prediction.output_tokens)
        quality = (answer[-1] + citation[-1] + abstention[-1]) / 3
        if (safety[-1] == 0 and abstention[-1] == 1
                and (not case.answerable or (answer[-1] >= 0.7 and citation[-1] >= 0.7))):
            successful_tasks += 1
        if case.high_risk:
            high_risk_count += 1
            high_risk_reviewed += int(prediction.human_reviewed)
            high_risk_passed += int(prediction.human_reviewed and prediction.human_review_passed)
        for key, value in case.slices.items():
            slice_values[f"{key}={value}"].append(quality)
    quality_values = [(a + c + abst) / 3 for a, c, abst in zip(answer, citation, abstention)]
    low, high = bootstrap_mean_ci(quality_values) if len(quality_values) >= 2 else (0.0, 1.0)
    slice_report = {}
    for key, values in sorted(slice_values.items()):
        slice_low, slice_high = bootstrap_mean_ci(values) if len(values) >= 2 else (values[0], values[0])
        slice_report[key] = {"count": len(values), "quality_mean": sum(values) / len(values),
                             "quality_ci": (slice_low, slice_high)}
    total_cost = sum(costs)
    return {
        "dataset_version": dataset.version,
        "dataset_fingerprint": dataset.fingerprint,
        "sample_count": len(dataset.cases),
        "retrieval_recall_at_k": sum(retrieval) / len(retrieval) if retrieval else 0.0,
        "answer_score": sum(answer) / len(answer) if answer else 0.0,
        "citation_precision": sum(citation) / len(citation) if citation else 0.0,
        "abstention_accuracy": sum(abstention) / len(abstention) if abstention else 0.0,
        "safety_violation_rate": sum(safety) / len(safety) if safety else 0.0,
        "tool_accuracy": sum(tool) / len(tool) if tool else 0.0,
        "p95_latency_ms": p95(latencies),
        "input_tokens_total": sum(input_tokens),
        "output_tokens_total": sum(output_tokens),
        "total_cost_usd": total_cost,
        "successful_task_count": successful_tasks,
        "cost_per_successful_task_usd": total_cost / successful_tasks if successful_tasks else float("inf"),
        "high_risk_case_count": high_risk_count,
        "high_risk_review_coverage": high_risk_reviewed / high_risk_count if high_risk_count else 1.0,
        "high_risk_review_pass_rate": high_risk_passed / high_risk_count if high_risk_count else 1.0,
        "quality_mean": sum(quality_values) / len(quality_values) if quality_values else 0.0,
        "quality_ci": (low, high),
        "slices": slice_report,
    }

@dataclass(frozen=True)
class GateDecision:
    passed: bool
    reasons: tuple[str, ...]


class ReleaseGate:
    def __init__(self, *, min_samples: int = 30, min_quality_lcb: float = 0.8,
                 max_safety_violation_rate: float = 0.0, max_p95_latency_ms: float = 2500,
                 max_cost_per_successful_task_usd: float = 0.05, max_judge_ece: float = 0.1):
        self.min_samples = min_samples
        self.min_quality_lcb = min_quality_lcb
        self.max_safety_violation_rate = max_safety_violation_rate
        self.max_p95_latency_ms = max_p95_latency_ms
        self.max_cost_per_successful_task_usd = max_cost_per_successful_task_usd
        self.max_judge_ece = max_judge_ece
        self.max_cost_per_successful_task_usd = max_cost_per_successful_task_usd

    def evaluate(self, report: dict, judge_ece: float | None) -> GateDecision:
        reasons = []
        if report.get("sample_count", 0) < self.min_samples:
            reasons.append("SAMPLE_SIZE_INSUFFICIENT")
        if "quality_ci" not in report:
            reasons.append("CONFIDENCE_INTERVAL_MISSING")
        elif (len(report["quality_ci"]) != 2
              or any(not math.isfinite(value) or not 0 <= value <= 1 for value in report["quality_ci"])
              or report["quality_ci"][0] > report["quality_ci"][1]):
            reasons.append("CONFIDENCE_INTERVAL_INVALID")
        elif report["quality_ci"][0] < self.min_quality_lcb:
            reasons.append("QUALITY_LOWER_BOUND_BELOW_THRESHOLD")
        safety_rate = report.get("safety_violation_rate", 1.0)
        if not math.isfinite(safety_rate) or not 0 <= safety_rate <= 1 or safety_rate > self.max_safety_violation_rate:
            reasons.append("SAFETY_VIOLATION_THRESHOLD_EXCEEDED")
        latency = report.get("p95_latency_ms", float("inf"))
        if not math.isfinite(latency) or latency < 0 or latency > self.max_p95_latency_ms:
            reasons.append("P95_LATENCY_THRESHOLD_EXCEEDED")
        cost_per_success = report.get("cost_per_successful_task_usd", float("inf"))
        if not math.isfinite(cost_per_success) or cost_per_success < 0 or cost_per_success > self.max_cost_per_successful_task_usd:
            reasons.append("COST_PER_SUCCESSFUL_TASK_THRESHOLD_EXCEEDED")
        if judge_ece is None or not math.isfinite(judge_ece) or not 0 <= judge_ece <= 1 or judge_ece > self.max_judge_ece:
            reasons.append("JUDGE_CALIBRATION_MISSING_OR_POOR")
        if not report.get("dataset_fingerprint"):
            reasons.append("DATASET_PROVENANCE_MISSING")
        cost = report.get("cost_per_successful_task_usd", float("inf"))
        if (not math.isfinite(cost) or cost < 0
                or cost > self.max_cost_per_successful_task_usd):
            reasons.append("COST_PER_SUCCESSFUL_TASK_THRESHOLD_EXCEEDED")
        if report.get("high_risk_case_count", 0) > 0:
            if report.get("high_risk_review_coverage", 0.0) < 1.0:
                reasons.append("HIGH_RISK_HUMAN_REVIEW_INCOMPLETE")
            if report.get("high_risk_review_pass_rate", 0.0) < 1.0:
                reasons.append("HIGH_RISK_HUMAN_REVIEW_FAILED")
        return GateDecision(not reasons, tuple(reasons))


class DriftMonitor:
    def __init__(self, baseline: float, max_relative_drop: float = 0.1):
        if not 0 <= baseline <= 1 or not 0 <= max_relative_drop <= 1:
            raise ValueError("DRIFT_CONFIG_INVALID")
        self.baseline = baseline
        self.max_relative_drop = max_relative_drop

    def check(self, current: float) -> dict:
        if not math.isfinite(current) or not 0 <= current <= 1:
            raise ValueError("DRIFT_SCORE_OUT_OF_RANGE")
        drop = max(0.0, (self.baseline - current) / max(self.baseline, 1e-9))
        return {"baseline": self.baseline, "current": current, "relative_drop": drop,
                "drift_detected": drop > self.max_relative_drop}

    @staticmethod
    def check_distribution(baseline_counts: dict[str, int],
                           current_counts: dict[str, int], threshold: float = 0.2) -> dict:
        if threshold < 0:
            raise ValueError("DRIFT_THRESHOLD_INVALID")
        psi = population_stability_index(baseline_counts, current_counts)
        return {"psi": psi, "threshold": threshold, "drift_detected": psi > threshold}


def demo() -> None:
    dataset = EvaluationDataset("golden-v1", "golden", (
        EvalCase("q1", "retention days", frozenset({"policy-A"}),
                 frozenset({"records", "kept", "90", "days"}), True,
                 {"tenant": "A", "difficulty": "easy"}),
        EvalCase("q2", "unknown policy", frozenset(), frozenset(), False,
                 {"tenant": "A", "difficulty": "hard"}),
    ))
    predictions = [
        Prediction("q1", ("policy-A",), "Records are kept for 90 days.",
                   ("policy-A",), False, latency_ms=850),
        Prediction("q2", (), "", (), True, latency_ms=400),
    ]
    report = evaluate_dataset(dataset, predictions)
    print(f"dataset={report['dataset_version']} n={report['sample_count']} "
          f"quality={report['quality_mean']:.3f} safety={report['safety_violation_rate']:.3f}")


if __name__ == "__main__":
    demo()
