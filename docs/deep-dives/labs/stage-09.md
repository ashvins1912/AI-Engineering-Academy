# Stage 09 — Individual lesson lab pack: MLOps, LLMOps & AI DevOps

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## experiment — Experiment tracking

**Implementation task:** Experiment tracking

**Worked fixture:** Record dataset/version, code SHA, seed, config, metrics and artifact hash.

**Expected result:** Two runs differ only in learning rate.

**Verification tests:** Run comparison is reproducible and lineage complete.

**Debugging checklist:** What metadata is required to reproduce an experiment?

**Interview checks:** Test missing metadata and overwritten artifact.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## registry — Model and prompt registry

**Implementation task:** Model and prompt registry

**Worked fixture:** Promote compatible model+tokenizer+prompt bundle through stages.

**Expected result:** Candidate model v2 paired with tokenizer v1 mismatch.

**Verification tests:** Promotion blocked until compatibility check passes.

**Debugging checklist:** Why version prompt and tokenizer with model weights?

**Interview checks:** Test rollback and artifact hash mismatch.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## eval-ci — Evaluation in CI

**Implementation task:** Evaluation in CI

**Worked fixture:** Add evaluation gate that blocks a release below threshold.

**Expected result:** Baseline accuracy .90; candidate .82; minimum .88.

**Verification tests:** Candidate fails gate and report identifies regression.

**Debugging checklist:** How do you avoid noisy evaluation gates?

**Interview checks:** Test flaky metric and boundary value .88.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## data-pipeline — Data and feature pipelines

**Implementation task:** Data and feature pipelines

**Worked fixture:** Build point-in-time feature join and validate freshness.

**Expected result:** Prediction at Jan 10; source record Jan 11 and Jan 9.

**Verification tests:** Jan 11 row excluded; Jan 9 row included.

**Debugging checklist:** What is a point-in-time correct feature join?

**Interview checks:** Test late-arriving data, duplicate key and schema drift.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## containers — Containers and images

**Implementation task:** Containers and images

**Worked fixture:** Build non-root minimal image with health check and pinned runtime.

**Expected result:** Small FastAPI app, requirements pinned, no embedded secret.

**Verification tests:** Container starts as non-root and health endpoint returns 200.

**Debugging checklist:** Why pin dependencies and avoid secrets in image layers?

**Interview checks:** Test missing env, graceful shutdown and read-only FS.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## cicd — CI/CD pipelines

**Implementation task:** CI/CD pipelines

**Worked fixture:** Separate test/build/scan/evaluate/deploy and promote same immutable artifact.

**Expected result:** Build SHA abc; deploy staging then production.

**Verification tests:** Artifact digest identical across environments.

**Debugging checklist:** Why should production deploy not rebuild from source?

**Interview checks:** Test failed test, failed deploy and rollback.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## infra — Infrastructure as Code

**Implementation task:** Infrastructure as Code

**Worked fixture:** Represent service, storage and identity as reviewed IaC plan.

**Expected result:** One service and one private database resource.

**Verification tests:** Plan shows intended create/update; no apply until approved.

**Debugging checklist:** How do you manage Terraform state and secrets?

**Interview checks:** Test drift, least privilege and destroy protection.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## kubernetes — Kubernetes for AI services

**Implementation task:** Kubernetes for AI services

**Worked fixture:** Deploy stateless inference API with requests/limits and probes.

**Expected result:** One replica, memory request/limit, readiness endpoint.

**Verification tests:** Pod becomes ready only after readiness check passes.

**Debugging checklist:** Difference between readiness and liveness probes?

**Interview checks:** Test OOMKilled, failed liveness and rolling update.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## serving — Model serving and inference optimization

**Implementation task:** Model serving and inference optimization

**Worked fixture:** Benchmark batch sizes and apply admission control under overload.

**Expected result:** Requests of 128/512 tokens; concurrency 1/4/8.

**Verification tests:** Report p50/p95, throughput and memory; overload returns bounded response.

**Debugging checklist:** Why can larger batch improve throughput but worsen latency?

**Interview checks:** Test cancellation, queue cap and long prompt.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rollouts — Deployment strategies

**Implementation task:** Deployment strategies

**Worked fixture:** Run canary and automatically roll back on quality/latency regression.

**Expected result:** 10% traffic canary; p95 threshold 2s, quality drop threshold 5%.

**Verification tests:** Canary promoted only when both guardrails pass.

**Debugging checklist:** How is canary different from blue-green and shadow?

**Interview checks:** Test partial rollout and rollback artifact compatibility.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
