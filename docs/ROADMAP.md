# Implementation roadmap

## Milestone 0 — Repository foundation
- [x] Independent project scaffold and product definition
- [x] Curriculum taxonomy and lesson blueprints
- [x] Initial responsive curriculum explorer
- [ ] Confirm GitHub repository visibility and create remote repository
- [ ] Add CI and branch protection after repository creation

## Milestone 1 — Curriculum engine
- Curriculum schema validation and content versioning
- Prerequisite graph and search
- Lesson reader with reusable section renderer
- Content completeness checks preventing placeholder lessons

## Milestone 2 — Identity and learner persistence
- Authentication integration
- PostgreSQL schema and migrations
- Account-backed lesson progress and mastery
- Cross-device resume and idempotent writes
- Authorization and data-isolation tests

## Milestone 3 — Interactive learning labs
- Math/gradient descent visualizers
- ML numerical playgrounds
- Neural network forward/backprop visualizer
- [x] Classical ML workbench (regression, trees, KNN/SVM, clustering)
- [x] CNN convolution and pooling visualizer
- [x] RNN/LSTM sequence-state trace
- [x] Regularization and multiclass evaluation labs
- [x] Overfitting/generalization experiment
- [x] Tokenization, vocabulary and embedding inspector (illustrative tokenizer)
- [x] Q/K/V scaled dot-product attention with causal mask
- [x] Multi-head attention and transformer-block flow
- [x] Autoregressive decoding controls (temperature and top-k)
- [x] RAG ingestion and chunking explorer
- [x] Dense, sparse and hybrid retrieval comparison
- [x] Reranking and evidence context assembly
- [x] GraphRAG entity and relation explorer
- [x] Visual RAG page/table evidence schematic
- [x] RAG evaluation metric workbench
- Agent execution trace simulator
- MCP/A2A protocol inspector
- Workflow and deployment simulators

## Milestone 4 — Safe execution
- Isolated job runner with CPU/memory/time/network limits
- No shell access from the web/API process
- Per-user quotas, cancellation and cleanup
- Static fixtures and mock providers by default

## Milestone 5 — RAG and agent practical projects
- [ ] Connect real document parsers and OCR while preserving page/region provenance
- [ ] Implement production embeddings, BM25 and vector index adapters
- [ ] Integrate a real reranker and reproducible golden-set evaluation
- [ ] Add multimodal image/page embeddings and true Visual RAG retrieval
- [ ] Add tenant-aware ACL filtering and deletion/versioning tests
- Tool adapters, MCP server/client labs and A2A interoperability lab
- Durable workflow and human approval exercises

## Milestone 6 — LLMOps and production engineering
- Evaluation gates in CI
- Model/prompt/dataset versioning
- Container builds and deployment walkthroughs
- Tracing, metrics, SLOs, cost and incident exercises

## Milestone 7 — Capstone and quality
- Enterprise knowledge/operations capstone
- End-to-end security review
- Load and failure testing
- Accessibility, mobile and performance audit
- Deployment smoke tests

## Constraints
Use free/local development paths first. No infrastructure provisioning, paid services or upgrades without explicit approval.
