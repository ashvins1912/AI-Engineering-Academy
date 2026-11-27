import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, FlaskConical, X } from 'lucide-react'
import MathLabs from './MathLabs'
import Stage1MasteryLabs from './Stage1MasteryLabs'
import MLLabs from './MLLabs'
import Stage2MasteryLabs from './Stage2MasteryLabs'
import Stage3MasteryLabs from './Stage3MasteryLabs'
import TransformerLabs from './TransformerLabs'
import Stage4MasteryLabs from './Stage4MasteryLabs'
import RAGLabs from './RAGLabs'
import Stage5MasteryLabs from './Stage5MasteryLabs'
import AgentLoopVisualizer from './AgentLoopVisualizer'
import AgentLoopLessonDetails from './AgentLoopLessonDetails'
import PlanningVisualizer from './PlanningVisualizer'
import PlanningLessonDetails from './PlanningLessonDetails'
import MemoryVisualizer from './MemoryVisualizer'
import MemoryLessonDetails from './MemoryLessonDetails'
import DurableStateVisualizer from './DurableStateVisualizer'
import DurableStateLessonDetails from './DurableStateLessonDetails'
import HumanLoopVisualizer from './HumanLoopVisualizer'
import HumanLoopLessonDetails from './HumanLoopLessonDetails'
import AgentPatternsVisualizer from './AgentPatternsVisualizer'
import AgentPatternsLessonDetails from './AgentPatternsLessonDetails'
import GraphOrchestrationVisualizer from './GraphOrchestrationVisualizer'
import GraphOrchestrationLessonDetails from './GraphOrchestrationLessonDetails'
import FrameworkComparisonVisualizer from './FrameworkComparisonVisualizer'
import FrameworkComparisonLessonDetails from './FrameworkComparisonLessonDetails'
import AgentEvaluationVisualizer from './AgentEvaluationVisualizer'
import AgentEvaluationLessonDetails from './AgentEvaluationLessonDetails'
import MCPArchitectureVisualizer from './MCPArchitectureVisualizer'
import MCPArchitectureLessonDetails from './MCPArchitectureLessonDetails'
import MCPPrimitivesVisualizer from './MCPPrimitivesVisualizer'
import MCPPrimitivesLessonDetails from './MCPPrimitivesLessonDetails'
import MCPAdvancedVisualizer from './MCPAdvancedVisualizer'
import MCPAdvancedLessonDetails from './MCPAdvancedLessonDetails'
import MCPSecurityVisualizer from './MCPSecurityVisualizer'
import MCPSecurityLessonDetails from './MCPSecurityLessonDetails'
import MCPTransportsVisualizer from './MCPTransportsVisualizer'
import MCPTransportsLessonDetails from './MCPTransportsLessonDetails'
import MCPObservabilityVisualizer from './MCPObservabilityVisualizer'
import MCPObservabilityLessonDetails from './MCPObservabilityLessonDetails'
import A2AVisualizer from './A2AVisualizer'
import A2ALessonDetails from './A2ALessonDetails'
import IBMACPMigrationVisualizer from './IBMACPMigrationVisualizer'
import IBMACPLessonDetails from './IBMACPLessonDetails'
import AgentClientProtocolVisualizer from './AgentClientProtocolVisualizer'
import AgentClientProtocolLessonDetails from './AgentClientProtocolLessonDetails'
import ToolIntegrationVisualizer from './ToolIntegrationVisualizer'
import ToolIntegrationLessonDetails from './ToolIntegrationLessonDetails'
import WorkflowPatternsVisualizer from './WorkflowPatternsVisualizer'
import WorkflowPatternsLessonDetails from './WorkflowPatternsLessonDetails'
import EventDrivenVisualizer from './EventDrivenVisualizer'
import EventDrivenLessonDetails from './EventDrivenLessonDetails'
import DurableWorkflowVisualizer from './DurableWorkflowVisualizer'
import DurableWorkflowLessonDetails from './DurableWorkflowLessonDetails'
import AutomationPlatformVisualizer from './AutomationPlatformVisualizer'
import AutomationPlatformLessonDetails from './AutomationPlatformLessonDetails'
import ExperimentTrackingVisualizer from './ExperimentTrackingVisualizer'
import ExperimentTrackingLessonDetails from './ExperimentTrackingLessonDetails'
import ModelRegistryVisualizer from './ModelRegistryVisualizer'
import ModelRegistryLessonDetails from './ModelRegistryLessonDetails'
import EvaluationCIVisualizer from './EvaluationCIVisualizer'
import EvaluationCILessonDetails from './EvaluationCILessonDetails'
import DataPipelineVisualizer from './DataPipelineVisualizer'
import DataPipelineLessonDetails from './DataPipelineLessonDetails'
import ContainerVisualizer from './ContainerVisualizer'
import ContainerLessonDetails from './ContainerLessonDetails'
import CICDVisualizer from './CICDVisualizer'
import CICDLessonDetails from './CICDLessonDetails'
import IaCVisualizer from './IaCVisualizer'
import IaCLessonDetails from './IaCLessonDetails'

type StageLabEntry = {
  id: string
  label: string
  summary: string
  render: () => ReactNode
}

const STAGE_LABS: Record<string, StageLabEntry[]> = {
  'stage-1': [
    {
      id: 'stage1-suite',
      label: '7 Foundations Mastery Gates & Math Labs',
      summary: 'Step-by-step numerical animations, failure labs, vectors, calculus, and Python mastery checks.',
      render: () => (
        <>
          <Stage1MasteryLabs />
          <MathLabs />
        </>
      )
    }
  ],
  'stage-2': [
    {
      id: 'stage2-suite',
      label: '7 Classical ML Gates & Workbench',
      summary: 'Editable regression, tree, clustering, PCA, and evaluation metric experiments.',
      render: () => (
        <>
          <Stage2MasteryLabs />
          <MLLabs />
        </>
      )
    }
  ],
  'stage-3': [
    {
      id: 'stage3-suite',
      label: '7 Deep Learning Gates & Neural Lab',
      summary: 'Interactive forward/backward traces, optimizers, CNN/RNN walkthroughs, and generalization checks.',
      render: () => (
        <>
          <Stage3MasteryLabs />
          <MLLabs initialTab="network" />
        </>
      )
    }
  ],
  'stage-4': [
    {
      id: 'stage4-suite',
      label: '8 Transformer & LLM Gates + Workbench',
      summary: 'Tokenization, embeddings, Q/K/V, causal masking, multi-head attention, decoding, and LLM engineering.',
      render: () => (
        <>
          <Stage4MasteryLabs />
          <TransformerLabs />
        </>
      )
    }
  ],
  'stage-5': [
    {
      id: 'stage5-suite',
      label: '12 RAG Gates & 7 Workbenches',
      summary: 'Ingestion, chunking, hybrid retrieval, reranking, GraphRAG, Visual RAG, and retrieval evaluation.',
      render: () => (
        <>
          <Stage5MasteryLabs />
          <RAGLabs />
        </>
      )
    }
  ],
  'stage-6': [
    {
      id: 'agent-loop',
      label: '01. Agent Loop',
      summary: 'Animated tool-using agent decisions, policy checks, observations, budgets, and stop conditions.',
      render: () => <><AgentLoopVisualizer /><AgentLoopLessonDetails /></>
    },
    {
      id: 'planning',
      label: '02. Planning DAG',
      summary: 'Build a dependency DAG, compute critical path priority, execute safely, and replan after failure.',
      render: () => <><PlanningVisualizer /><PlanningLessonDetails /></>
    },
    {
      id: 'memory',
      label: '03. Agent Memory',
      summary: 'Working, episodic, and semantic memory with scoped retrieval, provenance, token budgets, and expiry.',
      render: () => <><MemoryVisualizer /><MemoryLessonDetails /></>
    },
    {
      id: 'durable-state',
      label: '04. Durable State',
      summary: 'State machines, crash recovery, side-effect deduplication, worker fencing, and pause/resume.',
      render: () => <><DurableStateVisualizer /><DurableStateLessonDetails /></>
    },
    {
      id: 'human-loop',
      label: '05. Human-in-the-Loop',
      summary: 'Approval gates, reviewer identity, separation of duties, exact action binding, quorum, and audit.',
      render: () => <><HumanLoopVisualizer /><HumanLoopLessonDetails /></>
    },
    {
      id: 'agent-patterns',
      label: '06. Agent Patterns',
      summary: 'Compare router, supervisor-worker, parallel, hierarchical, reflection, and event-driven topologies.',
      render: () => <><AgentPatternsVisualizer /><AgentPatternsLessonDetails /></>
    },
    {
      id: 'graph-orchestration',
      label: '07. Graph Runtime',
      summary: 'Nodes, conditional edges, reducers, checkpoints, interrupts, and resumable graph execution.',
      render: () => <><GraphOrchestrationVisualizer /><GraphOrchestrationLessonDetails /></>
    },
    {
      id: 'framework-comparison',
      label: '08. Framework Benchmark',
      summary: 'Compare Agents SDK, CrewAI, LlamaIndex, Haystack, PydanticAI, and Semantic Kernel on one task.',
      render: () => <><FrameworkComparisonVisualizer /><FrameworkComparisonLessonDetails /></>
    },
    {
      id: 'agent-evaluation',
      label: '09. Agent Evaluation',
      summary: 'Evaluate task success, tool accuracy, citations, trajectories, safety, latency, and cost gates.',
      render: () => <><AgentEvaluationVisualizer /><AgentEvaluationLessonDetails /></>
    }
  ],
  'stage-7': [
    {
      id: 'mcp-arch',
      label: '01. MCP Architecture',
      summary: 'Host/client/server boundaries, stateless JSON-RPC, capability discovery, consent, and safe tool calls.',
      render: () => <><MCPArchitectureVisualizer /><MCPArchitectureLessonDetails /></>
    },
    {
      id: 'mcp-primitives',
      label: '02. MCP Primitives',
      summary: 'Tools, read-only resources, URI templates, and prompts with independent schemas and auth rules.',
      render: () => <><MCPPrimitivesVisualizer /><MCPPrimitivesLessonDetails /></>
    },
    {
      id: 'mcp-advanced',
      label: '03. MCP Advanced',
      summary: 'Stateless multi-round input flows, signed requestState, Tasks extension, progress, and cancellation.',
      render: () => <><MCPAdvancedVisualizer /><MCPAdvancedLessonDetails /></>
    },
    {
      id: 'mcp-transports',
      label: '04. MCP Transports',
      summary: 'Compare STDIO and Streamable HTTP, prevent DNS rebinding, and scale stateless replicas.',
      render: () => <><MCPTransportsVisualizer /><MCPTransportsLessonDetails /></>
    },
    {
      id: 'mcp-security',
      label: '05. MCP Security',
      summary: 'OAuth 2.1, PRM discovery, issuer/audience validation, per-tool scopes, step-up, and tenant auth.',
      render: () => <><MCPSecurityVisualizer /><MCPSecurityLessonDetails /></>
    },
    {
      id: 'mcp-observability',
      label: '06. MCP Observability',
      summary: 'Redacted traces, p50/p95 latency, safe retries, circuit breakers, and idempotent reconciliation.',
      render: () => <><MCPObservabilityVisualizer /><MCPObservabilityLessonDetails /></>
    },
    {
      id: 'a2a',
      label: '07. A2A Protocol',
      summary: 'Discover agents, validate Agent Cards, negotiate interfaces, delegate tasks, and verify artifacts.',
      render: () => <><A2AVisualizer /><A2ALessonDetails /></>
    },
    {
      id: 'ibm-acp',
      label: '08. ACP → A2A Migration',
      summary: 'Legacy HTTP/SSE protocol history, semantic mapping, compatibility adapters, and safe cutover.',
      render: () => <><IBMACPMigrationVisualizer /><IBMACPLessonDetails /></>
    },
    {
      id: 'client-acp',
      label: '09. Agent Client Protocol',
      summary: 'IDE ↔ coding agent capability negotiation, streamed tool calls, permission gates, and sandboxing.',
      render: () => <><AgentClientProtocolVisualizer /><AgentClientProtocolLessonDetails /></>
    },
    {
      id: 'tool-integration',
      label: '10. Tool Engineering',
      summary: 'Typed tool contracts, tenant auth, rate limits, idempotency, circuit breakers, and redacted logs.',
      render: () => <><ToolIntegrationVisualizer /><ToolIntegrationLessonDetails /></>
    }
  ],
  'stage-8': [
    {
      id: 'workflow-patterns',
      label: '01. Workflow Patterns',
      summary: 'Sequential, parallel, branching, fan-out/fan-in, map-reduce, and saga workflows with recovery.',
      render: () => <><WorkflowPatternsVisualizer /><WorkflowPatternsLessonDetails /></>
    },
    {
      id: 'event-driven',
      label: '02. Event-Driven',
      summary: 'Queues, webhooks, transactional outbox/inbox, ordering, bounded retries, DLQ, and schedules.',
      render: () => <><EventDrivenVisualizer /><EventDrivenLessonDetails /></>
    },
    {
      id: 'durable-workflows',
      label: '03. Durable Engines',
      summary: 'Compare Temporal, Prefect, Airflow, and Dagster; replay, heartbeats, leases, fencing, and signals.',
      render: () => <><DurableWorkflowVisualizer /><DurableWorkflowLessonDetails /></>
    },
    {
      id: 'automation-platform',
      label: '04. Automation Platforms',
      summary: 'n8n workflows, scoped API connectors, isolated browser automation, approvals, and audit trails.',
      render: () => <><AutomationPlatformVisualizer /><AutomationPlatformLessonDetails /></>
    }
  ],
  'stage-9': [
    {
      id: 'experiment-tracking',
      label: '01. Experiment Tracking',
      summary: 'MLflow/W&B-style runs, immutable parameters, dataset manifests, metric histories, and artifacts.',
      render: () => <><ExperimentTrackingVisualizer /><ExperimentTrackingLessonDetails /></>
    },
    {
      id: 'model-registry',
      label: '02. Model Registry',
      summary: 'Immutable model and prompt versions, release bundles, approvals, aliases, and instant rollback.',
      render: () => <><ModelRegistryVisualizer /><ModelRegistryLessonDetails /></>
    },
    {
      id: 'evaluation-ci',
      label: '03. Evaluation in CI',
      summary: 'Golden-set benchmarks, candidate vs. baseline comparisons, and hard regression release gates.',
      render: () => <><EvaluationCIVisualizer /><EvaluationCILessonDetails /></>
    },
    {
      id: 'data-pipeline',
      label: '04. Data & Features',
      summary: 'Contract-first, leakage-safe reproducible datasets with lineage, feature parity, and drift checks.',
      render: () => <><DataPipelineVisualizer /><DataPipelineLessonDetails /></>
    },
    {
      id: 'containers',
      label: '05. Containers',
      summary: 'Multi-stage inference images, non-root execution, resource limits, health checks, and SBOMs.',
      render: () => <><ContainerVisualizer /><ContainerLessonDetails /></>
    },
    {
      id: 'cicd',
      label: '06. CI/CD Gates',
      summary: 'Tests, AI evals, security scans, provenance, immutable digest promotion, canary, and rollback.',
      render: () => <><CICDVisualizer /><CICDLessonDetails /></>
    },
    {
      id: 'iac',
      label: '07. Terraform IaC',
      summary: 'Private inference infrastructure, protected state, workload identity, policy checks, and FinOps.',
      render: () => <><IaCVisualizer /><IaCLessonDetails /></>
    }
  ]
}

export default function StageLabsDrawer({ stageId }: { stageId: string }) {
  const labs = STAGE_LABS[stageId] ?? []
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [activeLabId, setActiveLabId] = useState<string | null>(null)

  useEffect(() => {
    setLauncherOpen(false)
    setActiveLabId(null)
  }, [stageId])

  if (labs.length === 0) return null

  const activeLab = labs.find(l => l.id === activeLabId) ?? null

  return (
    <div className="ux-stage-labs">
      <div className="ux-stage-labs-bar">
        <div className="ux-stage-labs-copy">
          <FlaskConical size={16} />
          <div>
            <strong>
              Stage Interactive Labs{' '}
              <span className="bc-tabular">({labs.length} {labs.length === 1 ? 'workbench' : 'mastery labs'})</span>
            </strong>
            <p>
              {labs.length === 1
                ? labs[0].summary
                : 'Launch any specialist visualizer for this stage without leaving the module list.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="ux-stage-labs-toggle"
          aria-expanded={launcherOpen || Boolean(activeLab)}
          onClick={() => {
            if (labs.length === 1) {
              setActiveLabId(curr => (curr ? null : labs[0].id))
            } else {
              setLauncherOpen(open => {
                if (open) setActiveLabId(null)
                return !open
              })
            }
          }}
        >
          <span>
            {labs.length === 1
              ? activeLab
                ? 'Hide Workbench'
                : 'Open Workbench'
              : launcherOpen
                ? 'Hide Lab Picker'
                : 'Choose Lab'}
          </span>
          {launcherOpen || activeLab ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {labs.length > 1 && launcherOpen && (
        <div className="ux-stage-labs-picker" role="tablist" aria-label="Stage mastery labs">
          {labs.map(lab => (
            <button
              key={lab.id}
              type="button"
              role="tab"
              aria-selected={activeLabId === lab.id}
              className={activeLabId === lab.id ? 'active' : ''}
              onClick={() => setActiveLabId(curr => (curr === lab.id ? null : lab.id))}
            >
              {lab.label}
            </button>
          ))}
        </div>
      )}

      {activeLab && (
        <div className="ux-stage-labs-canvas">
          <div className="ux-stage-labs-canvas-head">
            <div>
              <strong>{activeLab.label}</strong>
              <p>{activeLab.summary}</p>
            </div>
            <button
              type="button"
              className="bc-btn-ghost"
              onClick={() => setActiveLabId(null)}
              aria-label="Close active lab"
            >
              <X size={14} />
              <span>Close Lab</span>
            </button>
          </div>
          {activeLab.render()}
        </div>
      )}
    </div>
  )
}
