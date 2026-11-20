# Stage 11 — Individual lesson lab pack: Enterprise Capstone & Architecture

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## capstone-design — Architecture and threat model

**Implementation task:** Architecture and threat model

**Worked fixture:** Create context/container/data-flow diagrams and threat model for multi-tenant assistant.

**Expected result:** Roles admin/member, PDF corpus, vector store, model API, scoped tools.

**Verification tests:** Trust boundaries, tenant data paths and key abuse cases are explicit.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Review every external boundary and privileged action.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## capstone-build — Build RAG and agent services

**Implementation task:** Build RAG and agent services

**Worked fixture:** Build vertical slice upload→parse→index→retrieve→cite with bounded agent tool.

**Expected result:** One policy PDF, two tenants, one no-answer query and one malicious document.

**Verification tests:** Citations resolve to page/chunk; tenant isolation holds; malicious content cannot authorize tools.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Run integration, ACL, citation and injection tests.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## capstone-delivery — Deploy and operate

**Implementation task:** Deploy and operate

**Worked fixture:** Release through CI gate, staged rollout, SLO monitoring and rollback drill.

**Expected result:** Candidate release with evaluation report and known-good previous version.

**Verification tests:** Promotion occurs only after gates; rollback restores compatible model/prompt/index bundle.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Test failed migration, canary regression and restore from backup.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
