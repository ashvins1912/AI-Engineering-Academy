# Stage 12 Topic 9 — Advanced Production Practicum

## Run locally

```bash
python examples/stage-12/advanced_practicum/practicum_acceptance.py
python -m unittest discover -s examples/stage-12 -p 'test_advanced_practicum.py' -v
```

The acceptance runner executes a fixed list of repository-owned, deterministic demos for Topics 1–8 and the Stage 11 capstone. It captures exit status and bounded output, creates synthetic evidence references, and evaluates a fail-closed release gate.

## Required evidence

Every capability record binds:
- Capability identifier.
- Passing/failed execution result.
- Local evidence reference derived from captured output.
- One candidate tenant.
- One immutable practicum release version.

The release gate requires all ten capability checks, rejects duplicate and unexpected capabilities, rejects missing or failed evidence, and blocks cross-tenant or stale-version records. Any unresolved high or critical finding blocks release.

## Safety and limitations

- Only fixed repository-owned scripts are executed; no shell expansion or user-provided command is accepted.
- Every subprocess has a finite timeout and captured output.
- No network, hosted model, production data, GPU, cloud provisioning or deployment is used.
- Local evidence references are not cryptographic attestations or a production evidence registry.
- This practicum verifies integration of deterministic teaching demos; it is not a live distributed service mesh, production load test, protocol certification or compliance assessment.
- Production requires authenticated service identities, signed attestations, durable state, secrets management, observability, network controls, measured SLOs, incident response and independent security review.
