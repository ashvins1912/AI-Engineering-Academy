import { useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

const steps = [
  { title: 'User request', owner: 'Client', data: 'Question, authenticated session and request metadata', action: 'The application receives a task. User input is data, not permission to perform every requested action.', output: 'Request envelope' },
  { title: 'Gateway and identity', owner: 'API gateway', data: 'Session token, verified principal, tenant and scopes', action: 'Validate identity, rate limits and tenant context. Never trust a tenant ID or role invented by the model.', output: 'Trusted request context' },
  { title: 'Policy decision', owner: 'Authorization service', data: 'Principal + action + resource + context', action: 'Check whether this user may perform this action on this resource. Deny by default and record the decision.', output: 'Allow / deny decision' },
  { title: 'Orchestration and state', owner: 'Agent runtime', data: 'Task, typed state, step budget and checkpoint', action: 'Choose a bounded workflow, load durable state and enforce time, token, tool and retry limits.', output: 'Validated next step' },
  { title: 'Retrieval and evidence', owner: 'Knowledge service', data: 'Tenant-scoped query and access filters', action: 'Retrieve authorized documents, rank evidence and preserve source/page provenance. Abstain when evidence is weak.', output: 'Ranked evidence with provenance' },
  { title: 'Model inference', owner: 'Model gateway', data: 'Task instructions, bounded context and evidence', action: 'Generate a structured proposal. Model output is untrusted until schema and policy validation pass.', output: 'Structured proposal' },
  { title: 'Tool and approval gate', owner: 'Tool adapter + human', data: 'Proposed tool, exact arguments, risk and approval token', action: 'Validate arguments and authorization. High-impact actions pause for human approval bound to the exact arguments.', output: 'Approved action or safe denial' },
  { title: 'Execution and checkpoint', owner: 'Tool + durable store', data: 'Idempotency key, tool call and result', action: 'Execute with timeout and idempotency, persist the outcome and checkpoint before acknowledging durable progress.', output: 'Recorded result' },
  { title: 'Response and observability', owner: 'API + telemetry', data: 'Grounded response, audit reference and redacted trace', action: 'Return the answer or abstention. Emit latency, quality, cost and security signals without leaking sensitive content.', output: 'User response + trace' }
]

export default function ArchitectureFlow() {
  const [active, setActive] = useState(0)
  const step = steps[active]
  return <section className="architecture-flow">
    <div className="architecture-flow-head">
      <div><div className="bc-meta-line"><span>End-to-End Mental Model</span><span aria-hidden="true">·</span><span>9 Production Trust Boundaries</span></div><h2>How a production AI request flows end to end</h2><p>Step through identity, policy, retrieval, model inference, tools, durable state, and observability. Select any node to inspect the data crossing that boundary.</p></div>
      <span className="architecture-count bc-tabular">Step {active + 1} / {steps.length}</span>
    </div>
    <div className="architecture-track" aria-label="Production AI request flow">
      {steps.map((item, index) => <button key={item.title} className={`architecture-node ${index === active ? 'active' : ''} ${index < active ? 'visited' : ''}`} onClick={() => setActive(index)} aria-current={index === active ? 'step' : undefined}>
        <span className="architecture-node-number bc-tabular">{String(index + 1).padStart(2,'0')}</span><strong>{item.title}</strong><small>{item.owner}</small>
      </button>)}
    </div>
    <div className="architecture-detail" key={active}>
      <div className="architecture-detail-top"><span>Active data-flow boundary</span><strong>{step.title}</strong></div>
      <div className="architecture-detail-grid">
        <div><small>Data entering</small><p>{step.data}</p></div>
        <div><small>What happens</small><p>{step.action}</p></div>
        <div><small>Output / next hop</small><p>{step.output}</p></div>
      </div>
      <div className="architecture-controls">
        <button onClick={() => setActive(v => Math.max(0, v - 1))} disabled={active === 0}><ArrowLeft size={14}/>Previous</button>
        <button onClick={() => setActive(0)}><RotateCcw size={13}/>Replay</button>
        <button className="next" onClick={() => setActive(v => Math.min(steps.length - 1, v + 1))} disabled={active === steps.length - 1}>Next step<ArrowRight size={14}/></button>
      </div>
    </div>
  </section>
}
