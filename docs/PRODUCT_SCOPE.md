# Product scope

## Mission
Teach end-to-end AI engineering through explanatory depth, runnable experiments, implementation and production operations.

## Audiences
- Software engineers transitioning into AI engineering.
- ML practitioners learning LLM systems and agentic workflows.
- Platform engineers operating AI services.

## Core product areas
1. Structured curriculum and prerequisite graph.
2. Lesson reader with diagrams, worked calculations and code.
3. Interactive labs with safe execution boundaries.
4. Topic-level mastery and assessment.
5. Projects and portfolio evidence.
6. Account-backed progress and cross-device continuity.
7. Admin/content versioning and curriculum validation.

## Explicit non-goals for the first milestone
- Unrestricted arbitrary code execution in the API process.
- Automatic paid cloud provisioning.
- Unbounded autonomous agents.
- Storing provider secrets in the browser.
- Treating browser local storage as the source of truth for learner mastery.

## Acceptance criteria
- Every module has explicit learning outcomes and prerequisites.
- Every lesson follows `docs/LEARNING_STANDARD.md`.
- Labs have deterministic fixtures and expected outputs.
- Progress writes are authenticated, authorized and idempotent.
- Tenant/user ownership is enforced server-side.
- CI validates curriculum schema, TypeScript and production build.
