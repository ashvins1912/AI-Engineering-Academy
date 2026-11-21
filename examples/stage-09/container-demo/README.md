# Hardened inference container lab

This dependency-free service is a teaching target for image construction and runtime hardening. It is not a production model server.

## Build and run

```bash
docker build -t academy-inference:local .
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --cap-drop ALL --security-opt no-new-privileges -p 8080:8080 academy-inference:local
```

Or use `docker compose up --build` to apply the local CPU, memory, PID and filesystem limits.

## Smoke tests

```bash
curl -fsS http://localhost:8080/health/live
curl -fsS http://localhost:8080/health/ready
curl -fsS -X POST http://localhost:8080/predict -H 'Content-Type: application/json' -d '{"features":[1,2,3]}'
```

## Security checks

- The runtime user is UID/GID 10001 and is not root.
- The builder stage is separate; only application source and model artifact are copied to runtime.
- The root filesystem can be read-only; no application writes are required.
- Compose drops Linux capabilities, blocks privilege escalation, and bounds memory, CPU and PIDs.
- Request body size is bounded and JSON feature types/count are validated.
- The image does not contain credentials. Inject runtime secrets from a secret manager, never from Dockerfile ARG/ENV or build logs.
- Pin base images by digest in a release pipeline, generate an SBOM, scan OS and language dependencies, and sign the immutable image digest before promotion.

## Limitations

The example uses Python's standard library and a tiny linear score only to demonstrate container lifecycle and security. Production inference needs model-specific runtime dependencies, startup/readiness policy, authentication, concurrency limits, structured telemetry, graceful request draining, model artifact verification and performance/load testing. Do not use this toy endpoint for real customer data.
