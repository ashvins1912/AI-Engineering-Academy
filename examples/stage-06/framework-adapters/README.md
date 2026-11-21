# Framework adapter recipes (optional integration lab)

The Stage 6 comparison harness deliberately has **no third-party agent-framework dependency**. It can run in CI and on a small laptop. This document shows how to map real framework applications into the same FrameworkAdapter contract without letting the framework own domain policy.

## Common boundary

Every candidate receives the same typed task and a gateway, not raw database/provider clients:

\`\`\`python
class FrameworkAdapter(Protocol):
    name: str
    def run(self, request: dict, tools: SafeToolGateway) -> AgentResult: ...
\`\`\`

The application owns authenticated tenant identity, tool allow-lists, input validation, quotas, approval, idempotency, audit and durable business state. An adapter may ask for a tool; the gateway decides whether it can execute. A model-generated tenant ID is never an identity credential.

## Six framework mappings

| Framework | Native abstraction to map | Adapter responsibility | Best-fit signal |
|---|---|---|---|
| OpenAI Agents SDK | Agent instructions, tools, handoffs, guardrails and tracing | Convert registered function tools to gateway calls; normalize run output, handoff events and trace | Direct agent/tool orchestration in the OpenAI ecosystem |
| CrewAI | Agents, tasks, crews and flows | Map each role to a bounded capability; pass only task-scoped context; collect task outputs and delegation trace | Specialist teams and role-oriented workflow |
| LlamaIndex | Data connectors, indexes, retrievers, query engines and agents | Normalize retrieval nodes/citations and route data tools through the gateway | Knowledge-heavy applications and retrieval |
| Haystack | Components, pipelines, routers and agent components | Wrap component/pipeline execution; normalize document references and pipeline trace | Explicit composable search/RAG pipelines |
| PydanticAI | Typed agent dependencies, tools and validated outputs | Inject gateway through dependencies; validate output schema and map usage/trace metadata | Typed Python contracts and testability |
| Microsoft Semantic Kernel | Plugins, kernel functions and orchestration | Register thin plugin functions that delegate to the gateway; normalize invocation metadata | Enterprise plugin/function integrations and Microsoft ecosystem |

These are workload-fit signals, not a universal ranking. Check the version-specific API, supported languages, licensing and feature maturity before choosing a candidate.

## Integration sequence

1. Pin one framework package version and lock the transitive dependency set.
2. Build an adapter that implements FrameworkAdapter; keep its prompts and framework objects inside the adapter.
3. Expose only gateway-backed tools. Never pass database sessions, cloud credentials or unrestricted HTTP clients to the agent.
4. Convert framework outputs into AgentResult(answer, tool_calls, citations, approval_required, trace).
5. Preserve source identifiers with citations; do not invent citations from generated prose.
6. Run the same fixture and golden cases through every adapter.
7. Export redacted traces and measure task success, invalid tool calls, grounding, approval behavior, p50/p95 latency, tokens/cost and developer effort.
8. Store framework version, model, prompt hash, tool schema hash, fixture hash and runtime configuration with each run.

## Example adapter boundary

This is the application-facing shape; replace the marked call with the pinned SDK's documented invocation API. Keeping the SDK call in one method makes upgrades and migration reviewable.

\`\`\`python
class CandidateAdapter:
    name = "candidate-framework"

    def __init__(self, framework_agent):
        self.agent = framework_agent

    def run(self, request, tools):
        # Register only wrappers that call tools["order_lookup"], etc.
        # Invoke the pinned framework runtime with task-scoped input.
        framework_run = self.agent.run(
            input=request["question"],
            dependencies={"safe_tools": tools},
        )
        return AgentResult(
            answer=framework_run.output,
            tool_calls=normalize_tool_calls(framework_run),
            citations=normalize_citations(framework_run),
            approval_required=framework_run.approval_required,
            trace=normalize_trace(framework_run),
        )
\`\`\`

The method names above are adapter pseudocode, not a promise that every framework exposes the same API. Use the official reference for the exact SDK call.

## Required conformance tests

- Unknown tool and cross-tenant arguments are rejected **before** the domain function runs.
- Tool-call count and execution deadline are bounded.
- Adapter-reported tool calls match calls observed by the gateway.
- High-impact actions return an approval requirement and cannot execute before approval.
- Citation IDs resolve to real sources in the fixture.
- Trace export redacts secrets, personal data and credentials.
- Duplicate side-effect requests use the same idempotency key.
- Adapter output survives serialization into the framework-neutral result schema.

## Official documentation

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [CrewAI](https://docs.crewai.com/)
- [LlamaIndex](https://docs.llamaindex.ai/)
- [Haystack](https://docs.haystack.deepset.ai/)
- [PydanticAI](https://ai.pydantic.dev/)
- [Microsoft Semantic Kernel](https://learn.microsoft.com/en-us/semantic-kernel/overview/)

## Operational warning

Do not install all six frameworks into the Academy's default runtime just to compare them. Their dependency graphs, model/provider integrations and release cadence differ. Use optional isolated environments or containers for real SDK adapters, pin exact versions and keep the deterministic contract tests in the base CI. This avoids bloating the learner app and keeps the comparison reproducible.
