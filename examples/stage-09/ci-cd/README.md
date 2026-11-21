# CI/CD and release promotion lab

These are instructional templates, not active workflows in this repository.

## CI pipeline

`ci.yml` demonstrates the order of gates:

1. Run release policy unit tests.
2. Build one immutable candidate image from the tested commit.
3. Smoke test readiness, liveness, prediction and non-root runtime identity.
4. Generate an SBOM for that exact image.
5. Scan OS and language packages for critical/high vulnerabilities.
6. Upload SBOM evidence with the source commit.

A production pipeline should also verify model artifact digest, prompt/feature registry compatibility, golden-set evaluation, secret scanning, license policy, image signature and SLSA build provenance.

## Promotion model

Promote the same image digest rather than rebuilding per environment:

- Development: automated checks and integration tests.
- Staging: release-manager approval, load test, data/model compatibility and canary.
- Production: independent approval, small traffic ramp, SLO monitoring and automatic rollback.
- Rollback: restore the previous known-good digest and preserve audit evidence.

The manual promotion template has an explicit false-by-default opt-in and a GitHub Environment gate. It deliberately stops at policy/evidence verification and does not deploy or provision resources.

## Important distinction

CI validates source and candidate artifacts. CD changes an environment. Building and testing a candidate does not authorize production promotion. Keep build, approval, artifact signing and deployment identities separate.
