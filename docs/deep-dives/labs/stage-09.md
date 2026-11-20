# Stage 09 — Individual lesson lab pack: MLOps, LLMOps & AI DevOps

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## experiment — Experiment tracking

**Implementation task:** Record dataset/version, code SHA, seed, config, metrics and artifact hash.

**Worked fixture:** Two runs differ only in learning rate.

**Expected result:** Run comparison is reproducible and lineage complete.

**Verification tests:** Test missing metadata and overwritten artifact.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What metadata is required to reproduce an experiment?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## registry — Model and prompt registry

**Implementation task:** Promote compatible model+tokenizer+prompt bundle through stages.

**Worked fixture:** Candidate model v2 paired with tokenizer v1 mismatch.

**Expected result:** Promotion blocked until compatibility check passes.

**Verification tests:** Test rollback and artifact hash mismatch.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why version prompt and tokenizer with model weights?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## eval-ci — Evaluation in CI

**Implementation task:** Add evaluation gate that blocks a release below threshold.

**Worked fixture:** Baseline accuracy .90; candidate .82; minimum .88.

**Expected result:** Candidate fails gate and report identifies regression.

**Verification tests:** Test flaky metric and boundary value .88.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How do you avoid noisy evaluation gates?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## data-pipeline — Data and feature pipelines

**Implementation task:** Build point-in-time feature join and validate freshness.

**Worked fixture:** Prediction at Jan 10; source record Jan 11 and Jan 9.

**Expected result:** Jan 11 row excluded; Jan 9 row included.

**Verification tests:** Test late-arriving data, duplicate key and schema drift.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What is a point-in-time correct feature join?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## containers — Containers and images

**Implementation task:** Build non-root minimal image with health check and pinned runtime.

**Worked fixture:** Small FastAPI app, requirements pinned, no embedded secret.

**Expected result:** Container starts as non-root and health endpoint returns 200.

**Verification tests:** Test missing env, graceful shutdown and read-only FS.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why pin dependencies and avoid secrets in image layers?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## cicd — CI/CD pipelines

**Implementation task:** Separate test/build/scan/evaluate/deploy and promote same immutable artifact.

**Worked fixture:** Build SHA abc; deploy staging then production.

**Expected result:** Artifact digest identical across environments.

**Verification tests:** Test failed test, failed deploy and rollback.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why should production deploy not rebuild from source?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## infra — Infrastructure as Code

**Implementation task:** Represent service, storage and identity as reviewed IaC plan.

**Worked fixture:** One service and one private database resource.

**Expected result:** Plan shows intended create/update; no apply until approved.

**Verification tests:** Test drift, least privilege and destroy protection.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How do you manage Terraform state and secrets?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## kubernetes — Kubernetes for AI services

**Implementation task:** Deploy stateless inference API with requests/limits and probes.

**Worked fixture:** One replica, memory request/limit, readiness endpoint.

**Expected result:** Pod becomes ready only after readiness check passes.

**Verification tests:** Test OOMKilled, failed liveness and rolling update.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Difference between readiness and liveness probes?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## serving — Model serving and inference optimization

**Implementation task:** Benchmark batch sizes and apply admission control under overload.

**Worked fixture:** Requests of 128/512 tokens; concurrency 1/4/8.

**Expected result:** Report p50/p95, throughput and memory; overload returns bounded response.

**Verification tests:** Test cancellation, queue cap and long prompt.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why can larger batch improve throughput but worsen latency?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rollouts — Deployment strategies

**Implementation task:** Run canary and automatically roll back on quality/latency regression.

**Worked fixture:** 10% traffic canary; p95 threshold 2s, quality drop threshold 5%.

**Expected result:** Canary promoted only when both guardrails pass.

**Verification tests:** Test partial rollout and rollback artifact compatibility.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How is canary different from blue-green and shadow?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
