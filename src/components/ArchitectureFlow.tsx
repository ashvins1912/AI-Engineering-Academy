import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'

type FlowStep = {
  title: string
  owner: string
  protocol: string
  data: string
  action: string
  output: string
  packet: Record<string, unknown>
}

const steps: FlowStep[] = [
  {
    title: 'User request',
    owner: 'Client UI',
    protocol: 'HTTPS / SSE',
    data: 'Prompt text, authenticated session ID, and optional file or code context.',
    action: 'The user asks a question or types code. User text is treated strictly as untrusted data—never as admin permission.',
    output: 'Signed request envelope',
    packet: { session_id: 'chat_904', prompt: 'Check invoice INV-402 refund eligibility', stream: true }
  },
  {
    title: 'Gateway & identity',
    owner: 'API gateway',
    protocol: 'JWT + Guardrail',
    data: 'Session token, verified user identity, tenant ID, and rate-limit bucket.',
    action: 'Verifies who the user is, enforces quotas, and scans for prompt-injection attacks before touching any model or database.',
    output: 'Trusted tenant context',
    packet: { tenant: 'acme_corp', role: 'support_lead', injection_scan: 'SAFE', rate_limit_ok: true }
  },
  {
    title: 'Policy & memory',
    owner: 'Orchestrator',
    protocol: 'RBAC + State',
    data: 'Verified identity, recent chat turns, rolling summary, and step/token budget.',
    action: 'Checks allowed actions (deny by default), loads bounded conversation memory, and plans which subsystems to call.',
    output: 'Bounded execution plan',
    packet: { memory_turns_kept: 6, max_steps: 5, allowed_protocols: ['RAG', 'MCP', 'ACP'] }
  },
  {
    title: 'RAG retrieval',
    owner: 'Knowledge service',
    protocol: 'Hybrid RAG',
    data: 'Tenant-scoped query with strict ACL metadata filter.',
    action: 'Searches BM25 keywords + Vector Embeddings, reranks Top-20 down to Top-4 high-signal paragraphs with exact citations.',
    output: 'Cited evidence chunks',
    packet: { search: 'BM25 + HNSW', reranked_top_k: 4, top_source: 'refund_policy.pdf#p12' }
  },
  {
    title: 'MCP tool call',
    owner: 'MCP server',
    protocol: 'MCP JSON-RPC',
    data: 'Typed tool name (`get_invoice`) and schema-validated JSON arguments.',
    action: 'Connects the AI to live databases, GitHub, or APIs via one universal USB-C style protocol with centralized auth and audit logs.',
    output: 'Verified live tool result',
    packet: { jsonrpc: '2.0', method: 'tools/call', tool: 'get_invoice', result: { amount: 490, days_ago: 9 } }
  },
  {
    title: 'ACP agent handoff',
    owner: 'Specialist agent',
    protocol: 'ACP / A2A',
    data: 'Signed task envelope + correlation ID sent from Triage Agent to Compliance Agent.',
    action: 'Lets independent specialist agents collaborate across clear security boundaries without turning one giant prompt into chaos.',
    output: 'Structured agent decision',
    packet: { protocol: 'ACP/1.0', target: 'compliance-agent', decision: 'APPROVED_WITHIN_14D' }
  },
  {
    title: 'Transformer inference',
    owner: 'Model / vLLM',
    protocol: 'GQA + KV Cache',
    data: 'System rules + KV Prefix Cache + RAG citations + MCP/ACP verified results.',
    action: 'Transformer runs parallel Prefill, reuses warm KV Cache blocks (PagedAttention), and generates grounded output tokens.',
    output: 'Token stream + proposal',
    packet: { engine: 'vLLM', kv_prefix_hit: true, ttft_ms: 190, decode_tok_s: 84 }
  },
  {
    title: 'Approval & checkpoint',
    owner: 'Harness verifier',
    protocol: 'Idempotent Gate',
    data: 'Proposed side-effect action, exact parameters, risk level, and idempotency key.',
    action: 'Validates JSON schema and pauses for human approval on high-risk actions, checkpointing state before acknowledging success.',
    output: 'Audited durable state',
    packet: { schema_valid: true, idempotency_key: 'idem_402', human_approval: 'AUTO_UNDER_1000' }
  },
  {
    title: 'SSE stream & telemetry',
    owner: 'API + observability',
    protocol: 'SSE + OpenTelemetry',
    data: 'Grounded cited answer, token latency, cost metrics, and redacted trace ID.',
    action: 'Streams each token live to the browser (`text/event-stream`) while recording TTFT, faithfulness, and drift telemetry.',
    output: 'Live user response',
    packet: { citations: ['refund_policy.pdf#p12', 'INV-402'], e2e_ms: 465, faithfulness: 0.99 }
  }
]

export default function ArchitectureFlow() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const step = steps[active]

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setActive(prev => (prev + 1) % steps.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [playing])

  return (
    <section className="architecture-flow">
      <div className="architecture-flow-head">
        <div>
          <div className="bc-meta-line">
            <span>Animated End-to-End AI Data Flow</span>
            <span aria-hidden="true">·</span>
            <span>RAG · MCP · ACP · Transformer / vLLM</span>
          </div>
          <h2>How data flows end to end inside modern AI systems</h2>
          <p>
            Press <strong>Animate Data Flow</strong> or click any stage to watch a real request
            travel through Identity, Memory, Hybrid RAG, MCP Tools, ACP Multi-Agent Handoff,
            Transformer/vLLM Inference, and live SSE Streaming.
          </p>
        </div>
        <div className="bais-af-head-actions">
          <button
            type="button"
            className="bc-btn-primary"
            onClick={() => setPlaying(p => !p)}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? 'Pause Flow' : 'Animate Data Flow'}</span>
          </button>
          <span className="architecture-count bc-tabular">
            Step {active + 1} / {steps.length}
          </span>
        </div>
      </div>

      <div className="architecture-track" aria-label="Production AI request flow">
        {steps.map((item, index) => (
          <button
            key={item.title}
            type="button"
            className={`architecture-node ${index === active ? 'active' : ''} ${
              index < active ? 'visited' : ''
            }`}
            onClick={() => {
              setPlaying(false)
              setActive(index)
            }}
            aria-current={index === active ? 'step' : undefined}
          >
            <span className="architecture-node-number bc-tabular">
              {String(index + 1).padStart(2, '0')} · {item.protocol}
            </span>
            <strong>{item.title}</strong>
            <small>{item.owner}</small>
          </button>
        ))}
      </div>

      <div className="architecture-detail" key={active}>
        <div className="architecture-detail-top">
          <span>Active boundary · {step.protocol}</span>
          <strong>{step.title}</strong>
        </div>
        <div className="architecture-detail-grid">
          <div>
            <small>Data entering</small>
            <p>{step.data}</p>
          </div>
          <div>
            <small>What happens (simple English)</small>
            <p>{step.action}</p>
          </div>
          <div>
            <small>Live packet crossing boundary</small>
            <pre className="bais-af-packet">{JSON.stringify(step.packet, null, 2)}</pre>
          </div>
        </div>
        <div className="architecture-controls">
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setActive(v => Math.max(0, v - 1))
            }}
            disabled={active === 0}
          >
            <ArrowLeft size={14} />
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setActive(0)
            }}
          >
            <RotateCcw size={13} />
            Replay
          </button>
          <button
            type="button"
            className="next"
            onClick={() => {
              setPlaying(false)
              setActive(v => Math.min(steps.length - 1, v + 1))
            }}
            disabled={active === steps.length - 1}
          >
            Next step
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}
