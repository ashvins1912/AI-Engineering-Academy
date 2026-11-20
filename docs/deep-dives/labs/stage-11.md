# Stage 11 — Individual lesson lab pack: Enterprise Capstone & Architecture

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## capstone-design — Create context, container and data-flow diagrams plus a threat model for a multi-tenant assistant.

**Implementation task:** Roles admin/member; PDF corpus; vector store; model API; scoped read-only and mutating tools.

**Worked fixture:** Trust boundaries, tenant data paths, privileged actions and abuse cases are explicit.

**Expected result:** Review every external boundary, identity propagation path and data retention assumption.

**Verification tests:** Which architecture decisions need ADRs, and how do you record alternatives?

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** undefined

**Submission evidence:** Include implementation and architecture artifacts, a successful run, passing positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## capstone-build — Build a vertical slice from upload through parsing, indexing, retrieval and cited answer, with a bounded agent tool.

**Implementation task:** One policy PDF, two tenants, one no-answer query and one malicious document.

**Worked fixture:** Citations resolve to source page/chunk; tenant isolation holds; malicious content cannot authorize tools.

**Expected result:** Run integration, ACL, citation verification, injection and idempotency tests.

**Verification tests:** How do you prove evidence lineage and tenant isolation end to end?

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** undefined

**Submission evidence:** Include implementation and architecture artifacts, a successful run, passing positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## capstone-delivery — Release through CI gates, staged rollout, SLO monitoring and a rollback exercise.

**Implementation task:** Candidate release has evaluation report; previous release is known-good and artifacts are versioned.

**Worked fixture:** Promotion occurs only after gates; rollback restores compatible model, prompt and index versions.

**Expected result:** Test failed migration, canary regression, backup restore and rollback compatibility.

**Verification tests:** What must a release manifest contain to make rollback reproducible?

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** undefined

**Submission evidence:** Include implementation and architecture artifacts, a successful run, passing positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected behavior is reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
