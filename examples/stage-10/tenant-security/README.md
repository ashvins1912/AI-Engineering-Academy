# Stage 10 — Multi-tenant security lab

This lab uses synthetic tenant A/B data and local deterministic Python only. It makes no network calls, does not connect to a database, and does not execute user-supplied code.

## Run

```bash
python examples/stage-10/tenant-security/policy_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Invariants

1. Tenant identity comes from verified authentication plus an authoritative membership lookup.
2. Every repository operation scopes by tenant; use composite keys such as `(tenant_id, external_id)`.
3. PostgreSQL RLS is a second enforcement layer. Use a restricted non-owner role, enable and FORCE RLS, and set `app.tenant_id` transaction-locally inside the same transaction as the protected query.
4. Vector adapters push tenant and document ACL filters into the search operation before ranking/top-k.
5. Cache keys include canonical tenant, resource type and resource ID. Reads, writes and invalidation share one key builder.
6. Object IDs resolve through tenant-scoped metadata. Generate storage paths server-side; use short-lived signed URLs and re-check authorization at issuance.
7. Queue messages are untrusted serialized input. Workers revalidate actor membership, tenant and resource ownership before side effects.
8. Request and database context must be reset on success, rollback, timeout and exception.

## Production PostgreSQL pattern

See `rls_reference.sql`. Apply it only to a disposable database with a restricted application role. A table owner can normally bypass RLS unless FORCE ROW LEVEL SECURITY is enabled; superusers and BYPASSRLS roles remain privileged. The reference policy is not a complete migration or a substitute for integration tests with the actual role and connection pool.

## Failure lab

- Change the request tenant without adding membership: expect `TENANT_CONTEXT_MISMATCH`.
- Reuse `invoice-7` across tenants: each principal sees only its own value.
- Remove tenant from a cache key: reproduce a collision, then restore the canonical key builder.
- Apply vector filtering after top-k: demonstrate missing eligible results and restore pre-ranking filtering.
- Reuse a pooled connection across tenant A then B: verify transaction-local context is cleared after commit and rollback.
- Forge a queue job's tenant or resource: worker must deny before any side effect.

## Limits

The Python simulator is an executable teaching model, not a database, IAM policy or isolation boundary. Validate production behavior with PostgreSQL RLS integration tests using the real restricted role, vector-store ACL tests, object-store IAM tests, concurrency tests and security review.
