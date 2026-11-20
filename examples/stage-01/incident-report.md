# Stage 1 integrated project — failure incident report

## Injected failure
An entity was deliberately represented once before and once after the time cutoff.

## Symptom
A row-only chronological split could put the same entity in both training and validation.

## Root cause
The split ignored the entity grouping key, allowing entity-specific information to cross the evaluation boundary.

## Resolution
The pipeline computes entity sets for both partitions and fails closed when their intersection is non-empty. Regression test: `test_entity_reuse_across_time_is_rejected`.

## Prevention
Keep split policy explicit, test entity disjointness and temporal ordering, and store split invariants in every exported artifact.
