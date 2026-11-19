# Target architecture

## Logical components
- Web app: React/TypeScript curriculum, labs, mastery dashboard.
- API: Express/TypeScript authentication integration, curriculum read APIs, progress and assessment APIs.
- Persistence: PostgreSQL for users, enrollments, mastery, attempts, projects and audit events. pgvector is optional for retrieval labs, not required for learner progress.
- AI lab service: Python/FastAPI for model-facing experiments, isolated from the core API.
- Worker: asynchronous ingestion, evaluation and long-running workflows.
- Object storage: lesson assets and learner project artifacts.
- Observability: OpenTelemetry traces, structured logs, metrics and evaluation records.

## Request flow
Browser -> API gateway -> authentication/authorization -> application service -> database.
AI lab requests are dispatched to a dedicated lab service or isolated job runner. Never execute arbitrary learner code in the API process.

## Data ownership
- `users`: identity mapping to the existing identity provider.
- `learner_profiles`: preferences and learning goals.
- `curriculum_versions`, `stages`, `modules`, `lessons`: versioned content.
- `lesson_progress`: per-user completion and status.
- `mastery_records`: per-user, per-skill proficiency and evidence.
- `assessment_attempts`: score, rubric, attempt metadata and version.
- `lab_submissions`: source reference, result, execution metadata.
- `projects`, `project_submissions`: portfolio evidence.
- `audit_events`: security-sensitive actions.

## Design rules
- Server is authoritative for progress and mastery.
- Use optimistic concurrency or idempotency keys for progress mutations.
- Keep content version and assessment version on every result.
- Use tenant/user scoping in every query.
- Do not store raw provider API keys in learner records.
