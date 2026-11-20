# Stage 09 — MLOps, LLMOps & AI DevOps

## Outcome
Make experiments reproducible, artifacts traceable, evaluation release-gated and deployments observable and reversible.

### Experiment tracking
Track code revision, dataset version, split, seed, config, metrics and artifact hashes. Build an experiment table and compare runs. Test missing metadata and accidental overwrite. Keep secrets and personal data out of artifacts.

### Model and prompt registry
Version model weights, tokenizer, adapters, prompt templates, evaluation sets and runtime config as a compatible release bundle. Implement stage transitions (candidate → validated → production → archived). Test incompatible tokenizer/model pairs and rollback. Maintain lineage and approval history.

### Evaluation in CI
Build deterministic smoke tests and a versioned evaluation set. Add thresholds for correctness, safety, latency and cost; distinguish hard failures from noisy statistical signals. Test flaky cases and threshold boundary. Block releases on critical regression and store reports.

### Data and feature pipelines
Implement ingestion, validation, transformation, point-in-time joins, feature versioning and backfills. Test schema evolution, late data, duplicates and leakage. Monitor freshness, null rates and distribution drift.

### Containers and images
Build minimal reproducible images with pinned dependencies, non-root user, health check and no embedded secrets. Scan dependencies and image layers. Test graceful shutdown, read-only filesystem assumptions and resource limits.

### CI/CD pipelines
Separate test, build, scan, evaluation, deploy and post-deploy verification. Use immutable artifacts, environment promotion and approval gates. Test failed deploy, rollback and migration compatibility. Avoid rebuilding different bits for production than were tested.

### Infrastructure as Code
Represent networking, identity, storage, compute and observability as reviewed code. Plan before apply; separate state and secrets. Test drift detection, least privilege and destroy protection. Document cost estimates and teardown.

### Kubernetes for AI services
Understand pods, deployments, services, ingress, config/secrets, requests/limits, probes, autoscaling and GPU scheduling. Deploy a small stateless API. Test OOM, readiness failure, rolling update and scale-to-zero constraints. Capacity-plan model memory per replica.

### Model serving and inference optimization
Compare synchronous/batched/streamed serving, CPU/GPU, quantization and concurrency. Benchmark p50/p95, throughput, memory and cost. Test cold start, overload, cancellation and long prompts. Apply admission control and backpressure.

### Deployment strategies
Compare rolling, blue-green, canary and shadow traffic. Define health/quality guardrails and rollback triggers. Test incompatible schema, quality regression and partial rollout. Monitor model quality after deploy, not just process health.

## Stage project — Release pipeline for an AI API
Package a model-backed service; version model/config/prompt; run unit, integration, security and evaluation checks in CI; deploy a candidate; run smoke tests; promote or rollback. Deliver reproducible release manifest and SLO dashboard.

## Mastery gate
Reproduce an experiment from metadata, explain artifact lineage, demonstrate a failed release rollback and show evaluation gates.

## Primary references
- MLflow: https://mlflow.org/docs/latest/
- Docker: https://docs.docker.com/
- GitHub Actions: https://docs.github.com/actions
- Kubernetes: https://kubernetes.io/docs/
