# Production AI Engineering Playbooks

These playbooks extend the 84-lesson curriculum with end-to-end, tool-based engineering practice. They are designed to be run locally first, then deployed only when the learner explicitly chooses an approved environment.

## Learning sequence

| Playbook | Build | Main tools | Exit evidence |
|---|---|---|---|
| [Production RAG](01-production-rag-qdrant-langsmith.md) | Secure, evaluated knowledge assistant | Qdrant, LangSmith, Guardrails AI | Retrieval benchmark, trace review, ACL tests |
| [Multi-agent systems](02-multi-agent-langgraph.md) | Bounded research workflow | LangGraph, LangSmith, FastMCP | State graph, checkpoint/replay test, failure matrix |
| [Fine-tuning](03-fine-tuning-lora-qlora.md) | Domain adapter with a release gate | Transformers, PEFT, TRL | Dataset card, baseline comparison, adapter manifest |
| [AWS deployment](04-aws-deployment.md) | Containerized AI API with safe rollout | ECR, ECS Fargate, IAM, CloudWatch | Deployment diagram, CI evidence, rollback drill |

## How every lab should be studied

1. **Predict:** draw the expected data/control flow before running code.
2. **Build the smallest vertical slice:** one input, one output, one test.
3. **Observe:** inspect structured logs, traces, intermediate payloads and metrics.
4. **Break it deliberately:** inject one failure at a time.
5. **Diagnose:** identify the failing boundary before changing code.
6. **Fix and prove:** add a regression test and compare before/after metrics.
7. **Harden:** add authorization, limits, retries, idempotency and operational ownership.
8. **Reflect:** record the trade-off and the condition under which a simpler design is better.

## Visual debugging convention

- **Green path:** expected successful flow.
- **Amber branch:** degraded but recoverable flow (retry, fallback, abstain).
- **Red branch:** security, data-integrity or policy violation; stop and fail closed.
- **Blue boundary:** external service or trust boundary.

These colors are semantic labels in diagrams, not claims that a system can automatically detect every failure.

## Environment and cost policy

- Start with local Docker Compose and small public/synthetic fixtures.
- Use local Qdrant or a disposable development collection before considering managed services.
- LangSmith tracing may send prompts, inputs, outputs and metadata to an external service. Use synthetic data or configure redaction and approved retention before enabling it.
- Do not upload confidential customer documents, secrets, production traces or personal data to learning environments.
- AWS deployment labs are plans and reproducible configuration exercises. They do not create AWS resources. Learners must inspect pricing, budgets, region, IAM permissions and teardown steps before provisioning.
- Fine-tuning is optional and compute-dependent. CPU-only learners can complete data preparation, adapter configuration review, evaluation and model-card exercises without pretending a training run occurred.

## Definition of done

A lab is not complete because the happy path works. It is complete when the learner can show:
- a successful trace and a failed trace;
- a test that reproduces the failure;
- the correction and a regression test;
- a quality, latency, cost or safety measurement;
- a rollback, abstention or safe-stop path;
- a short architecture decision record explaining why this tool was selected.

## Official references

- LangGraph: https://docs.langchain.com/oss/python/langgraph/overview
- LangSmith: https://docs.smith.langchain.com/
- Qdrant: https://qdrant.tech/documentation/
- Guardrails AI: https://guardrailsai.com/docs
- FastMCP: https://gofastmcp.com/
- Hugging Face PEFT: https://huggingface.co/docs/peft/
- AWS ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html
- AWS ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html
