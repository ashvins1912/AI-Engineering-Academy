# Stage 12 Topic 5 — AI Red Teaming and Adversarial Validation

## Run locally

```bash
python examples/stage-12/red_team/red_team_engine.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The runner uses synthetic tenants, synthetic canary strings and local policy checks. It does not call a model, execute payload code, access real tools, scan a network or use production data.

## Threat surfaces covered

- Direct and indirect prompt injection, including instructions embedded in retrieved evidence.
- RAG poisoning and trust-boundary confusion.
- Cross-tenant tool/resource access and tool argument tampering.
- Approval replay, expiry and binding mismatch.
- Secret-canary exfiltration and output redaction.
- Token/cost exhaustion and untrusted artifact digest tampering.

## Control invariants

1. Retrieved text is untrusted evidence and cannot grant tool authority.
2. Tool calls require a verified principal, exact allowlisted action, schema-valid arguments, tenant ownership and scope.
3. Mutations require a short-lived approval bound to the exact request digest and consumed once.
4. Output canaries are redacted and recorded as a blocked exfiltration attempt.
5. Token and cost budgets are enforced before execution.
6. Model/artifact bytes must match both expected and trusted digests.
7. Critical/high attacks that are not contained block the red-team gate regardless of average pass rate.

## Production gap analysis

The simulator teaches policy logic, not production security certification. Production controls need atomic approval consumption, signed provenance/attestations, durable audit, secret management, OS/runtime isolation, real identity verification, database-enforced tenant isolation, network egress policy, fuzzing and independent penetration testing. Regex injection detection is only a telemetry heuristic; the primary control is keeping retrieved content outside the trusted instruction and authorization channels.
