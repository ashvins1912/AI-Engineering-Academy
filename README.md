# AI Engineering Academy

A standalone, project-first learning platform for AI engineering: foundations, ML, deep learning, transformers, RAG/Visual RAG/GraphRAG, agents, MCP, A2A/ACP, automation, LLMOps, DevOps, security and production deployment.

## Product principles
- Teach concepts with intuition, numerical walkthroughs, diagrams and runnable labs.
- Progress from implementation-from-scratch to framework-assisted production patterns.
- Evaluate retrieval, agent behavior, quality, latency, reliability and cost—not just whether a demo runs.
- Keep learner progress account-backed; browser storage is only a temporary UI cache.
- Make every external action permissioned, observable, auditable and recoverable.
- Run the learning platform cheaply by default. No paid infrastructure is provisioned by this project.

## Repository status
This is an independent project with an implemented curriculum explorer and interactive Phase 3/4/5/6 learning workbenches. It remains an educational frontend: production authentication, account-backed mastery, model-provider integrations, sandboxed code execution and deployment secrets must be implemented before public production use.

## Planned stack
- Frontend: React, TypeScript, Vite
- API: Node.js, TypeScript, Express
- Persistence: PostgreSQL (learner accounts, mastery, submissions) with optional pgvector for labs
- AI lab service: Python, FastAPI (isolated service; optional in early milestones)
- Local development: Docker Compose
- CI: GitHub Actions
- Observability: OpenTelemetry-compatible traces and structured logs

## Quick start
```bash
npm install
npm run dev
```

The current UI is a curriculum explorer and lesson-detail engine backed by typed local seed data. It supports topic search, expandable modules, lesson objectives, prerequisites, worked examples, step-by-step workflows, exercises, assessment criteria, production notes, bookmarks and browser-local completion progress. It does not claim account persistence until the API and database milestones are completed.

## Current implementation status
- Phase 1 foundation: curriculum navigation, search, responsive layout, lesson detail view, browser-local bookmarks and completion state.
- Phase 2 baseline: 11 stages, 84 lesson blueprints, reusable lesson contract and curriculum validation script.
- Every lesson detail view now includes a guided implementation workbench: selectable workflow steps, isolated environment setup, a stage-appropriate starter implementation, run command and expected observation, debugging prompts, production checklist, official references and independent practice criteria. Key topics also have dedicated numerical/code examples. This is a consistent hands-on baseline; it does not claim that all 84 lessons already contain a fully bespoke, end-to-end project implementation.
- Phase 3 interactive labs: vector/matrix calculator, Monte Carlo π estimator, animated gradient descent visualizer, SGD/momentum/Adam comparison and Python data-processing mini-lab.
- Phase 4 classical ML workbench: linear/logistic regression, decision-tree impurity, KNN, an educational linear SVM solver, K-means and neural-network forward/backprop/optimizer traces.
- Phase 4 deep-learning architecture labs: step-through CNN convolution/feature maps/max pooling; scalar RNN/LSTM-style sequence-state tracing; dropout/L2/batch-normalization demonstrations; softmax and multiclass precision/recall/F1; and illustrative underfit/overfit training-validation curves with checkpoint selection.
- Phase 4 lesson deep dives now include numerical examples and workflows for CNNs, recurrent models, classification metrics and generalization.
- Phase 5 transformer workbench: toy tokenization/vocabulary IDs, embedding lookup with positional vectors, scaled dot-product Q/K/V attention, causal masking, two-head attention, transformer-block residual/normalization/MLP flow, and autoregressive decoding with temperature/top-k/top-p.
- Phase 5 lesson deep dives include numerical examples for tokenization, embeddings, multi-head attention, decoder-only generation and sampling. The implementation workbench adds transformer-stage setup and model execution guidance.
- Phase 6 RAG workbench: browser-local PDF.js text extraction, Mammoth DOCX raw-text extraction, adjustable chunking and overlap, dense/sparse/hybrid retrieval comparison, candidate reranking and evidence-context assembly, GraphRAG entity traversal, schematic page-level Visual RAG, and retrieval/answer evaluation concepts.
- Phase 6 lesson deep dives: ingestion, vector indexes, retrieval/RRF, grounded generation, reranking, GraphRAG, Visual RAG and RAG evaluation. Each Phase 6 lesson now opens the shared implementation workbench with RAG-specific environment setup, retrieval code, debugging and production security checks.
- PDF/DOCX ingestion accepts PDF and DOCX files up to 10 MB each, caps PDFs at 50 pages and extracted text at 500,000 characters, validates basic file signatures, and keeps extracted text in browser memory only. PDF page boundaries are retained; DOCX tables are flattened to text. Scanned PDFs are not OCRed.
- Phase 6 retrieval lab scores are intentionally transparent teaching simulations: hashed-term vectors are not trained embeddings, lexical overlap is not production BM25, reranking is a heuristic cross-encoder-style score, the page viewer is schematic (no OCR is run), and benchmark values are illustrative—not measured model performance.
- These labs are deterministic, client-side teaching visualizations. The recurrent cell, regularization controls and generalization curves are intentionally simplified demonstrations, not trained production models. The 2→2→1 network remains a fixed-weight backpropagation trace. The Phase 5 tokenizer uses a tiny illustrative vocabulary and merge rule; embeddings/projections are fixed teaching values, and decoding is deterministic filtered argmax rather than a full LLM sampler. These labs explain computation and are not model-provider integrations.
- Run `npm run validate:curriculum`, `npm run validate:phase3`, `npm run validate:phase4`, `npm run validate:phase5`, `npm run validate:phase6` and `npm run validate:documents` to run curriculum and numerical sanity checks.
- Full build/typecheck remains unverified: React, React DOM, Lucide, PDF.js, Mammoth and their type packages could not be installed in this environment, and npm registry access/cache was unavailable. A temporary declaration-based syntax smoke check is not equivalent to a build against the real dependencies.

## Documentation
- `docs/PRODUCT_SCOPE.md` — product definition and acceptance criteria
- `docs/ARCHITECTURE.md` — target architecture and trust boundaries
- `docs/CURRICULUM.md` — full learning path
- `docs/LEARNING_STANDARD.md` — mandatory lesson structure
- `docs/ROADMAP.md` — incremental implementation plan
- `docs/SECURITY.md` — safety and security requirements
- `docs/DEPLOYMENT.md` — low-cost deployment strategy
- `curriculum/curriculum.json` — machine-readable stage/module index

## Important terminology
- MCP means Model Context Protocol.
- A2A is the agent-to-agent interoperability protocol.
- ACP is ambiguous: this curriculum distinguishes IBM/BeeAI Agent Communication Protocol (historical/evolving interoperability context) from the Agent Client Protocol used by coding agents and IDEs.
- Visual RAG (sometimes written V-RAG) means retrieval over visual content such as page images, diagrams, charts and screenshots. If a named research system uses the acronym VRAG differently, teach it as a separate named approach rather than conflating terminology.


## Phase 6 server-side ingestion API foundation
- `backend/` adds a FastAPI document API for server-side PDF/DOCX parsing, scanned-PDF OCR (Poppler + Tesseract), sentence-transformer embeddings (`all-MiniLM-L6-v2`), pgvector cosine search, explicit Okapi BM25 scoring and reciprocal-rank fusion.
- The API validates signed JWTs and derives user/tenant identity only from trusted claims. PostgreSQL row-level security is enabled and forced in the migration; the API sets transaction-local `app.tenant_id`, while every query also includes tenant scope.
- Endpoints: `POST /v1/documents`, `GET /v1/documents`, `DELETE /v1/documents/{id}`, `POST /v1/search`, and tenant-admin `GET /v1/admin/tenant-health`. Health endpoints are `/health/live` and `/health/ready`.
- Local setup: see `backend/README.md` and `backend/docker-compose.yml`. The embedding model is CPU-capable but memory intensive; this API is not suitable for a 512 MB free service with inline OCR/embedding. Keep model inference and parsing in bounded workers or run locally until capacity is approved.
- This is a backend implementation foundation, **not yet production-certified or deployed**. Remaining gates include actual identity-provider/JWKS integration, cross-tenant integration tests with the restricted DB role, asynchronous OCR/embedding workers, private object storage, malware scanning, distributed rate limits/quotas, observability, backups and load/security testing.
- The existing browser uploader remains a local teaching path; it is not connected to the authenticated API because the Academy frontend has no configured identity integration. Do not send real documents to this API until identity, privacy and retention controls are integrated.



## Deep-dive curriculum

The complete topic-first guides for all 11 stages and 84 lesson topics are indexed in [docs/deep-dives](docs/deep-dives/README.md). Every lesson also has an individual lab specification in the companion stage lab packs: implementation task, worked fixture, expected result, verification tests, debugging checklist, interview checks and submission evidence. The lesson workbench links to both its stage theory guide and lab pack. These are practical specifications and acceptance criteria; some topics still need expanded fully worked reference solutions and automated code runners are intentionally not part of the Academy.


## Production engineering playbooks

The next layer turns the curriculum into tool-based implementation practice: [Production AI Engineering Playbooks](docs/production-playbooks/README.md). It includes end-to-end RAG with Qdrant, LangSmith and Guardrails AI; multi-agent workflows with LangGraph and FastMCP; PEFT fine-tuning with LoRA/QLoRA; and an AWS ECR/ECS Fargate deployment path. Each playbook includes architecture diagrams, when-to-use decisions, implementation tasks, test fixtures, failure diagnosis, recovery paths, evaluation criteria and improvement plans. These are learning guides; AWS resources are not provisioned and model training is not claimed unless a learner runs it.


## Agentic AI interview preparation

The [Agentic AI Interview Studio](docs/interview-prep/README.md) connects Stages 6–11 to a structured five-round interview path: agent fundamentals, system design, multi-agent coordination, evaluation/debugging and production architecture. It includes scenario prompts, expected answer structure, interviewer follow-ups, scoring rubrics, failure drills and a capstone mock interview. The in-app studio is a self-practice aid; rubric selections and draft answers are saved in browser storage, not account-level mastery.


## Senior architect curriculum review

The detailed [Senior Architect Review](docs/CURRICULUM_ARCHITECT_REVIEW.md) scores all 84 topics individually, documents the current content gaps, and defines the target Academy architecture, end-to-end AI request DFD, visual animation contract, student self-rating rubric and prioritized improvement plan. The lesson detail view now includes a student reflection panel for readability, learning ease, understanding, implementation confidence, visual usefulness, difficulty, proficiency level, implementation evidence and challenges. Reflections are currently saved in browser storage; account-level sync is not yet connected.

The home page also includes a step-through production AI request flow, covering identity, authorization, orchestration, retrieval, model inference, approval, tool execution, durable state and observability.
