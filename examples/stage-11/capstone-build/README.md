# Stage 11 — Enterprise RAG/agent vertical slice

This local reference implementation is deterministic and offline. It uses synthetic tenants, documents and order records. It does not call an LLM, database, vector service, MCP server or external API.

## Run

```bash
python examples/stage-11/capstone-build/capstone_app.py
python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v
```

## What the vertical slice proves

- Server-side membership resolves principal and tenant; caller-supplied roles are not accepted.
- Retrieval filters tenant and document ACL before ranking and top-k.
- Citations identify document ID, immutable version, source page, chunk and tenant.
- Missing authorized evidence returns `ABSTAIN_NO_EVIDENCE`.
- Retrieved instructions and model/agent proposals are untrusted and do not grant tool permissions.
- Tool execution checks tenant membership, role, capability allowlist and resource ownership.
- Mutations require a separate tenant-admin approver and an approval bound to the exact proposal fingerprint.
- Idempotency is scoped by tenant, actor and key; a retry returns the original result.
- Audit records store a query digest and safe decision metadata, not raw query text.

## Production replacement map

| Local simulator | Production adapter |
|---|---|
| In-memory membership directory | OIDC identity plus authoritative tenant membership service |
| In-memory document store | Object storage + PostgreSQL metadata with RLS |
| Lexical retrieval | PostgreSQL/vector or hybrid search with tenant/ACL predicates pushed into the query |
| Extractive answer | Model gateway with grounded prompt, citation verifier and evaluation/safety gates |
| In-memory approval service | Durable approval workflow with authenticated approver, expiry and revocation |
| In-memory idempotency ledger | Transactional database record/outbox with uniqueness and concurrency control |
| In-memory audit list | Append-only audit store and redacted OpenTelemetry events |

## Important production invariants

1. Keep tenant and ACL filtering inside the retrieval query before ranking; never retrieve global top-k and filter afterward.
2. Bind citation references to immutable source version/page/chunk IDs and verify before returning.
3. Model output is a proposal, not an authorization decision. The policy enforcement point rechecks principal, tenant, capability, resource, arguments, budget and approval.
4. Bind approval to the exact operation and verify the approver still has the required role.
5. Persist idempotency and side effect atomically; an in-memory dictionary is only a teaching fixture.
6. Record safe audit metadata and digests; do not log prompts, documents, tokens or tool payloads by default.
7. Add integration tests for PostgreSQL RLS, vector filters, object ACLs, queue replay, concurrent approvals, provider outage and release rollback.

## Suggested build sequence

Contracts → identity/membership → document lineage → ACL retrieval → citation/abstention → typed agent proposal → policy/approval → idempotency → audit/trace/cost → integration and adversarial tests.
