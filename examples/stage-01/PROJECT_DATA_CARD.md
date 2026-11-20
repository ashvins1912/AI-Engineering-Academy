# Stage 1 integrated project — data card

## Dataset provenance
This is a deterministic, synthetic 12-row educational fixture. It contains no real customer or personal data.

## Intended use
Demonstrate ingestion, validation, feature engineering, time/entity splitting, train-only scaling and artifact export before classical ML training.

## Fields
| Field | Meaning | Allowed in model features? |
|---|---|---|
| row_id | Unique source row identifier | No |
| entity_id | Entity grouping key | No |
| event_date | Point-in-time event date | No; split/audit metadata |
| feature_value | Numeric observed feature | Yes |
| target | Binary outcome label | Label only |

## Split and leakage policy
- Cutoff: 2025-01-01.
- Training rows are on or before the cutoff; validation rows are after it.
- An entity cannot appear in both partitions.
- Target-derived and post-outcome columns are rejected.
- The scaler is fitted only on training feature values and applied unchanged to validation.

## Limitations and risks
- The sample is tiny and synthetic; no population or model-quality claim can be inferred.
- The feature is illustrative, not predictive evidence.
- A date split is appropriate only when it matches the real prediction timeline.
- Real data requires access controls, provenance, retention rules, privacy review, drift checks and domain-specific fairness analysis.
