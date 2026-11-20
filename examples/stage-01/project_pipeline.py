"""Reproducible, leakage-safe tabular ML pipeline using only Python's standard library."""
from __future__ import annotations
import argparse, csv, json, math, statistics
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path

REQUIRED = {"row_id", "entity_id", "event_date", "feature_value", "target"}
FORBIDDEN_FEATURES = {"future_revenue", "post_outcome_status", "target_after_event", "label_timestamp"}

@dataclass(frozen=True)
class Record:
    row_id: str
    entity_id: str
    event_date: date
    feature_value: float
    target: int

@dataclass(frozen=True)
class Scaler:
    mean: float
    scale: float
    fit_rows: int

def load_records(path: Path) -> list[Record]:
    records, seen_rows = [], set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("input CSV is empty or has no header")
        missing = REQUIRED - set(reader.fieldnames)
        if missing:
            raise ValueError(f"missing required columns: {', '.join(sorted(missing))}")
        forbidden = FORBIDDEN_FEATURES.intersection(reader.fieldnames)
        if forbidden:
            raise ValueError(f"target leakage columns are forbidden: {', '.join(sorted(forbidden))}")
        for line, row in enumerate(reader, start=2):
            row_id, entity_id = (row.get("row_id") or "").strip(), (row.get("entity_id") or "").strip()
            if not row_id or not entity_id:
                raise ValueError(f"line {line}: row_id and entity_id are required")
            if row_id in seen_rows:
                raise ValueError(f"line {line}: duplicate row_id {row_id}")
            seen_rows.add(row_id)
            try:
                event_date = date.fromisoformat((row.get("event_date") or "").strip())
                feature_value = float(row.get("feature_value") or "")
                target = int(row.get("target") or "")
            except (TypeError, ValueError) as exc:
                raise ValueError(f"line {line}: invalid date, feature_value or target") from exc
            if not math.isfinite(feature_value):
                raise ValueError(f"line {line}: feature_value must be finite")
            if target not in (0, 1):
                raise ValueError(f"line {line}: target must be 0 or 1")
            records.append(Record(row_id, entity_id, event_date, feature_value, target))
    if not records:
        raise ValueError("input CSV contains no data rows")
    return records

def engineer_features(records: list[Record]) -> list[dict[str, object]]:
    return [{"row_id": r.row_id, "entity_id": r.entity_id, "event_date": r.event_date.isoformat(),
             "feature_value": r.feature_value, "feature_abs": abs(r.feature_value), "target": r.target}
            for r in records]

def split_by_time_and_entity(records: list[Record], cutoff: date) -> tuple[list[Record], list[Record]]:
    train = [r for r in records if r.event_date <= cutoff]
    validation = [r for r in records if r.event_date > cutoff]
    if not train or not validation:
        raise ValueError("time split requires at least one train and one validation row")
    overlap = {r.entity_id for r in train} & {r.entity_id for r in validation}
    if overlap:
        raise ValueError(f"entity leakage across time split: {', '.join(sorted(overlap))}")
    if max(r.event_date for r in train) > min(r.event_date for r in validation):
        raise AssertionError("temporal ordering invariant failed")
    return train, validation

def fit_scaler(train_values: list[float]) -> Scaler:
    if not train_values:
        raise ValueError("cannot fit scaler on an empty training set")
    if any(not math.isfinite(value) for value in train_values):
        raise ValueError("scaler input must be finite")
    mean = statistics.fmean(train_values)
    variance = statistics.fmean((value - mean) ** 2 for value in train_values)
    scale = math.sqrt(variance)
    return Scaler(mean, scale if scale > 0 else 1.0, len(train_values))

def transform(values: list[float], scaler: Scaler) -> list[float]:
    return [(value - scaler.mean) / scaler.scale for value in values]

def build_pipeline(input_path: Path, output_path: Path, cutoff: date) -> dict[str, object]:
    records = load_records(input_path)
    train, validation = split_by_time_and_entity(records, cutoff)
    train_features, validation_features = engineer_features(train), engineer_features(validation)
    # Critical invariant: scaler is fitted on train only.
    scaler = fit_scaler([float(row["feature_value"]) for row in train_features])
    train_scaled = transform([float(r["feature_value"]) for r in train_features], scaler)
    validation_scaled = transform([float(r["feature_value"]) for r in validation_features], scaler)
    for row, value in zip(train_features, train_scaled):
        row["feature_scaled"] = round(value, 8)
    for row, value in zip(validation_features, validation_scaled):
        row["feature_scaled"] = round(value, 8)
    artifact = {
        "schema_version": "1.0", "cutoff": cutoff.isoformat(),
        "counts": {"total": len(records), "train": len(train), "validation": len(validation)},
        "scaler": asdict(scaler), "train": train_features, "validation": validation_features,
        "invariants": {
            "entity_disjoint": not ({r.entity_id for r in train} & {r.entity_id for r in validation}),
            "temporal_order": max(r.event_date for r in train) <= min(r.event_date for r in validation),
            "scaler_fit_rows": len(train), "validation_used_for_fit": False,
        },
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return artifact

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("examples/stage-01/fixtures/tabular_project.csv"))
    parser.add_argument("--output", type=Path, default=Path("build/stage-01/tabular-pipeline.json"))
    parser.add_argument("--cutoff", type=date.fromisoformat, default=date(2025, 1, 1))
    args = parser.parse_args()
    try:
        artifact = build_pipeline(args.input, args.output, args.cutoff)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    print(json.dumps({"output": str(args.output), "counts": artifact["counts"], "scaler": artifact["scaler"], "invariants": artifact["invariants"]}, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
