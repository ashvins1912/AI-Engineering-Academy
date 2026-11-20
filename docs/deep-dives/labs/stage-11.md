# Stage 11 — Individual lesson lab pack: Enterprise Capstone & Architecture

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## capstone-design — Create context/container/data-flow diagrams and threat model for multi-tenant assistant.

**Implementation task:** Roles admin/member, PDF corpus, vector store, model API, scoped tools.

**Worked fixture:** Trust boundaries, tenant data paths and key abuse cases are explicit.

**Expected result:** Review every external boundary and privileged action.

**Verification tests:** Which architecture decisions need ADRs and why?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## capstone-build — Build vertical slice upload→parse→index→retrieve→cite with bounded agent tool.

**Implementation task:** One policy PDF, two tenants, one no-answer query and one malicious document.

**Worked fixture:** Citations resolve to page/chunk; tenant isolation holds; malicious content cannot authorize tools.

**Expected result:** Run integration, ACL, citation and injection tests.

**Verification tests:** How do you prove evidence lineage end-to-end?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## capstone-delivery — Release through CI gate, staged rollout, SLO monitoring and rollback drill.

**Implementation task:** Candidate release with evaluation report and known-good previous version.

**Worked fixture:** Promotion occurs only after gates; rollback restores compatible model/prompt/index bundle.

**Expected result:** Test failed migration, canary regression and restore from backup.

**Verification tests:** What must a release manifest contain for reproducible rollback?

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
