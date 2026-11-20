# Stage 09 — Individual lesson lab pack: MLOps, LLMOps & AI DevOps

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## experiment — Record dataset/version, code SHA, seed, config, metrics and artifact hash.

**Implementation task:** Two runs differ only in learning rate.

**Worked fixture:** Run comparison is reproducible and lineage complete.

**Expected result:** Test missing metadata and overwritten artifact.

**Verification tests:** What metadata is required to reproduce an experiment?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## registry — Promote compatible model+tokenizer+prompt bundle through stages.

**Implementation task:** Candidate model v2 paired with tokenizer v1 mismatch.

**Worked fixture:** Promotion blocked until compatibility check passes.

**Expected result:** Test rollback and artifact hash mismatch.

**Verification tests:** Why version prompt and tokenizer with model weights?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## eval-ci — Add evaluation gate that blocks a release below threshold.

**Implementation task:** Baseline accuracy .90; candidate .82; minimum .88.

**Worked fixture:** Candidate fails gate and report identifies regression.

**Expected result:** Test flaky metric and boundary value .88.

**Verification tests:** How do you avoid noisy evaluation gates?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## data-pipeline — Build point-in-time feature join and validate freshness.

**Implementation task:** Prediction at Jan 10; source record Jan 11 and Jan 9.

**Worked fixture:** Jan 11 row excluded; Jan 9 row included.

**Expected result:** Test late-arriving data, duplicate key and schema drift.

**Verification tests:** What is a point-in-time correct feature join?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## containers — Build non-root minimal image with health check and pinned runtime.

**Implementation task:** Small FastAPI app, requirements pinned, no embedded secret.

**Worked fixture:** Container starts as non-root and health endpoint returns 200.

**Expected result:** Test missing env, graceful shutdown and read-only FS.

**Verification tests:** Why pin dependencies and avoid secrets in image layers?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## cicd — Separate test/build/scan/evaluate/deploy and promote same immutable artifact.

**Implementation task:** Build SHA abc; deploy staging then production.

**Worked fixture:** Artifact digest identical across environments.

**Expected result:** Test failed test, failed deploy and rollback.

**Verification tests:** Why should production deploy not rebuild from source?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## infra — Represent service, storage and identity as reviewed IaC plan.

**Implementation task:** One service and one private database resource.

**Worked fixture:** Plan shows intended create/update; no apply until approved.

**Expected result:** Test drift, least privilege and destroy protection.

**Verification tests:** How do you manage Terraform state and secrets?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## kubernetes — Deploy stateless inference API with requests/limits and probes.

**Implementation task:** One replica, memory request/limit, readiness endpoint.

**Worked fixture:** Pod becomes ready only after readiness check passes.

**Expected result:** Test OOMKilled, failed liveness and rolling update.

**Verification tests:** Difference between readiness and liveness probes?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## serving — Benchmark batch sizes and apply admission control under overload.

**Implementation task:** Requests of 128/512 tokens; concurrency 1/4/8.

**Worked fixture:** Report p50/p95, throughput and memory; overload returns bounded response.

**Expected result:** Test cancellation, queue cap and long prompt.

**Verification tests:** Why can larger batch improve throughput but worsen latency?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## rollouts — Run canary and automatically roll back on quality/latency regression.

**Implementation task:** 10% traffic canary; p95 threshold 2s, quality drop threshold 5%.

**Worked fixture:** Canary promoted only when both guardrails pass.

**Expected result:** Test partial rollout and rollback artifact compatibility.

**Verification tests:** How is canary different from blue-green and shadow?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
