# Tool authorization and sandboxing lab

This is a deterministic policy simulator. It does **not** execute arbitrary code, open sockets, create containers or claim to be a production sandbox.

## Run

```bash
python examples/stage-10/tool-security/policy_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Security contract

1. Model tool calls are untrusted proposals.
2. Normalize arguments and reject unknown fields before authorization.
3. Derive principal and tenant from verified authentication; load resource ownership from authoritative storage.
4. Evaluate tool, action, scope, resource, approval, expiry and budget in a policy decision point.
5. Enforce the decision immediately before adapter invocation. Bind it to canonical arguments.
6. Use short-lived, revocable capabilities with minimum scope.
7. Run untrusted code only in an OS-enforced sandbox: non-root identity, read-only base, ephemeral workspace, no host mounts or sockets, network deny-by-default, CPU/memory/process/time limits, syscall restrictions and cancellation.
8. Validate every redirect and DNS result for network tools. Block loopback, private, link-local and metadata destinations unless a reviewed exception exists.
9. Use durable idempotency for side effects and audit safe decision metadata.

## Production checklist

- Separate PDP from PEP; ensure every tool path uses the PEP.
- Re-check ownership atomically at the data layer to reduce TOCTOU races.
- Hash canonical arguments into the decision; re-authorize after mutation.
- Reject traversal, symlink escapes, special files and paths outside the assigned workspace.
- Apply egress controls outside the process as well as in application code.
- Revoke capabilities, pin policy versions and fail closed on policy or audit failure.
- Never log secrets, bearer tokens or raw private prompts by default.

## Failure labs

- Remove `reports:read`: the read must fail with `MISSING_SCOPE`.
- Change the resource tenant: the request must fail with `TENANT_MISMATCH`.
- Change the argument resource after authorization: the request must be normalized and authorized again.
- Replay an idempotency key with the same digest: return the original result; use a different digest: deny.
- Resolve an allowlisted hostname to loopback: deny the connection.
- Exceed CPU, memory, process or wall-clock budgets: terminate the worker in the real OS boundary.

## Important limitation

The path, network and budget helpers are teaching simulations. Production deployments need OS-level isolation and egress enforcement (for example, hardened containers or microVMs, namespaces, cgroups, seccomp/AppArmor and network policy), security review, patching and escape testing.
