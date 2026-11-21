# Stage 10 — AI supply-chain security lab

This lab runs offline with synthetic bytes and synthetic vulnerability identifiers. It makes no network calls, does not install dependencies and does not load or execute model files.

## Run

```bash
python examples/stage-10/supply-chain/policy_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Release invariants

- Pin model weights, tokenizer, dataset snapshots, embedding model, prompt bundle, vector index snapshot, container image, source commit, CI actions and transitive dependencies to immutable digests or reviewed commits.
- Verify digest, signature identity and provenance independently. The attestation subject digest must match the exact artifact bytes.
- Generate an SBOM for software and a model/data artifact inventory for AI assets; record source, version, owner, license, digest and review state.
- Unknown or incompatible license terms are held for review. Public availability does not imply commercial or training rights.
- Critical/high known dependency vulnerabilities block promotion by default. Exceptions require an owner, rationale, scope, expiry and audit record.
- Isolate builds, pin actions and dependencies, use short-lived least-privilege credentials and keep release secrets away from untrusted pull-request code.
- Prefer safe tensor formats such as safetensors when supported. Treat pickle-based model artifacts as executable-risk inputs and inspect them in isolation.
- Scan logs and artifacts for secrets. On exposure, fail the build, revoke/rotate credentials and investigate all accessible copies.
- Promote the same signed artifact digests from test to staging to production; never rebuild from mutable tags between environments.

## Decision semantics

- `ALLOW`: all required integrity, source, signature, provenance, license and dependency checks pass.
- `REJECT`: digest mismatch, untrusted source, unverified signature/provenance or high/critical vulnerability.
- `HOLD`: unknown/prohibited license, incomplete inventory or unpinned dependency needs review.

## Production tools and evidence

Use a real SBOM generator (SPDX or CycloneDX), a trusted signing/verifying workflow (Sigstore/Cosign), authenticated build provenance (SLSA-compatible attestations), dependency and container scanners, model artifact review, immutable registries and deployment-by-digest. Protect signing identities and transparency-log verification. The Python simulator demonstrates policy outcomes only; it is not a signing service, scanner or secure build environment.
