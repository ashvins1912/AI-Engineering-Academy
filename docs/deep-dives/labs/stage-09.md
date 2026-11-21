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

**Implementation task:** Build a bounded inference-serving simulator that estimates KV cache, admits requests under active/queue budgets, models cancellation and reports synthetic latency/throughput proxies.

**Worked fixture:** 32 layers, 8 KV heads, head dimension 128, FP16 cache, 4,096 tokens per sequence. Cache = 128 KiB/token = 512 MiB/sequence; eight sequences need about 4 GiB before model weights and runtime reserve.

**Expected result:** The simulator rejects requests that exceed the memory budget or queue cap, promotes queued work after a slot is released, and labels benchmark values as synthetic proxies rather than GPU measurements.

**Verification tests:** Test KV formula, invalid dimensions, eight-sequence memory calculation, queue cap, duplicate IDs, cancellation, promotion, long-prompt rejection and synthetic-metric labeling.

**Debugging checklist:** Record model/runtime/hardware and prompt/output distributions; separate queue wait, TTFT and inter-token latency; inspect KV-cache allocation and non-cache reserve; verify cancellation releases resources; compare p50/p95 and tokens/sec; evaluate quality after quantization; never infer GPU performance from the local simulator.

**Interview checks:** Explain prefill vs decode, continuous vs static batching, KV-cache scaling, TTFT vs ITL, why quantization may not improve speed, and why bounded admission is required under overload.

**Submission evidence:** Include simulator output, passing tests with a negative case, KV-cache calculation, benchmark matrix, one cancellation/overload diagnosis, and an engine-selection rationale.

---

## rollouts — Deployment strategies

**Implementation task:** Implement a progressive canary controller that advances through 10%, 25%, 50% and 100% only when sample count, p95 latency and relative model-quality guardrails pass. Restore the previous release on any mandatory breach.

**Worked fixture:** Stable quality 0.90 and p95 1,700 ms; candidate quality 0.88 and p95 1,800 ms; minimum 50 samples; maximum p95 2,000 ms; maximum relative quality drop 5%. A second observation injects p95 2,300 ms.

**Expected result:** The healthy candidate advances through the configured steps. The injected latency breach stops progression, returns candidate traffic to 0%, and restores the stable release ID. Missing telemetry or insufficient samples holds the rollout.

**Verification tests:** Run `python -m unittest discover -s examples/stage-09 -p 'test_rollouts.py' -v`. Cover quality-drop calculation, healthy promotion, p95 and quality rollback, insufficient samples, missing telemetry, blue-green readiness, shadow response isolation, shadow side-effect rejection and deterministic A/B cohorts.

**Debugging checklist:** Confirm the candidate manifest binds model, prompt, index, runtime and tool-policy versions; inspect the exact metric window and cohort; verify minimum sample count; compare p95 rather than mean latency; confirm missing telemetry fails closed; inspect traffic weights and last known-good release; verify shadow credentials are read-only; check the rollback bundle is schema-compatible.

**Interview checks:** Compare rolling, blue-green, canary, shadow and A/B. Explain why shadow traffic must not trigger side effects, why p95 can fail while average latency passes, how stable cohort assignment works, and why rollback must restore a complete release bundle.

**Submission evidence:** Include simulator output, healthy and failed canary traces, passing tests with negative cases, the release-flow diagram, an immutable manifest example, and a short strategy-selection decision record.

---


## kubernetes — Kubernetes for AI services

**Implementation task:** Deploy a stateless inference API with a digest-pinned image, explicit CPU/memory requests and limits, startup/readiness/liveness probes, a bounded HPA and least-privilege runtime settings.

**Worked fixture:** Two replicas request 6 GiB each; the node has 16 GiB allocatable. The model loads in 75 seconds and the startup budget is 120 seconds. A third replica requires 18 GiB and cannot fit on this node.

**Expected result:** Two replicas schedule and become Ready after model verification; the third replica remains Pending with an Insufficient memory diagnosis. A startup budget shorter than measured cold start must be rejected.

**Verification tests:** Test exact placement boundaries, invalid resource inputs, startup timeout, concurrency memory exceeding limit, mutable image rejection, privileged container rejection, invalid HPA bounds, missing metrics and GPU scheduling without a device plugin.

**Debugging checklist:** Start with `kubectl describe pod` Events; inspect current and previous container logs; compare requests with node allocatable resources; check probe timing and container restart reason; inspect Service selectors and EndpointSlices; verify HPA metrics; check GPU device-plugin resources, labels and taints; confirm the cluster CNI enforces NetworkPolicy.

**Interview checks:** Explain why requests affect scheduling while limits affect runtime; distinguish startup, readiness and liveness; explain why HPA cannot create node capacity; describe the role of GPU extended resources, node selectors and tolerations.

**Submission evidence:** Include the simulator output, passing tests with one negative case, Deployment/Service/HPA/NetworkPolicy manifests, a resource-capacity calculation, and a 3–5 sentence explanation of one failure and its recovery.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
