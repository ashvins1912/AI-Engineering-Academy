# Deployment strategy

## Local-first development
- `npm install && npm run dev` for the initial web curriculum explorer.
- Add API and database services in later milestones.
- Use Docker Compose for local PostgreSQL and optional supporting services.
- Keep sample data and local provider mocks available so the core curriculum works without paid APIs.

## Render Free compatibility
A free-tier deployment must be designed around cold starts, limited memory, ephemeral filesystems and service sleep. Do not assume a long-running worker, GPU, durable local disk or always-on background process is available.

Recommended learning-platform deployment:
- Static frontend on a static hosting target.
- Lightweight API service only when account persistence is introduced.
- Managed database free tier only after checking its current limits and durability.
- Run expensive model inference locally or use explicitly configured external providers; never silently trigger paid usage.
- Avoid bundling large ML libraries into the web API.
- Use scheduled or user-triggered jobs only when supported by the selected host.

## Production gates
- Health/readiness endpoints.
- Environment validation at startup.
- CORS allowlist and secure cookies/token handling.
- Database migrations and backups.
- CI build and tests.
- Deployment smoke test.
- Rollback instructions.
- Cost and quota visibility.

No hosting resources are provisioned by this scaffold.


## Phase 6 ingestion API (local-first)
The optional backend lives in `backend/`. It requires Python 3.11, PostgreSQL with pgvector, Tesseract and Poppler. See `backend/README.md` and `backend/docker-compose.yml`. Sentence-transformer model weights download on first use and are memory intensive; for a 512 MB service, do not colocate model loading, OCR and API serving. Move OCR/embedding to bounded worker capacity or run locally. No cloud resources are provisioned by this repository.

