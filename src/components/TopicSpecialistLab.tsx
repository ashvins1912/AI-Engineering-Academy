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
import Stage10MasteryLab from './Stage10MasteryLab'
import ArchitectureFlow from './ArchitectureFlow'
import AgenticInterviewStudio from './AgenticInterviewStudio'

type Props = { stage:number; topicId:string }

/** Reuses the academy's existing stage-specific simulators inside the selected lesson. */
export default function TopicSpecialistLab({stage,topicId}:Props) {
  if(stage===6) {
    switch(topicId) {
      case 'agent-loop': return <><AgentLoopVisualizer/><AgentLoopLessonDetails/></>
      case 'planning': return <><PlanningVisualizer/><PlanningLessonDetails/></>
      case 'memory': return <><MemoryVisualizer/><MemoryLessonDetails/></>
      case 'state': return <><DurableStateVisualizer/><DurableStateLessonDetails/></>
      case 'human-loop': return <><HumanLoopVisualizer/><HumanLoopLessonDetails/></>
      case 'patterns': return <><AgentPatternsVisualizer/><AgentPatternsLessonDetails/></>
      case 'langgraph': return <><GraphOrchestrationVisualizer/><GraphOrchestrationLessonDetails/></>
      case 'frameworks': return <><FrameworkComparisonVisualizer/><FrameworkComparisonLessonDetails/></>
      case 'agent-eval': return <><AgentEvaluationVisualizer/><AgentEvaluationLessonDetails/></>
    }
  }
  if(stage===7) {
    switch(topicId) {
      case 'mcp-architecture': return <><MCPArchitectureVisualizer/><MCPArchitectureLessonDetails/></>
      case 'mcp-primitives': return <><MCPPrimitivesVisualizer/><MCPPrimitivesLessonDetails/></>
      case 'mcp-advanced': return <><MCPAdvancedVisualizer/><MCPAdvancedLessonDetails/></>
      case 'mcp-transport': return <><MCPTransportsVisualizer/><MCPTransportsLessonDetails/></>
      case 'mcp-security': return <><MCPSecurityVisualizer/><MCPSecurityLessonDetails/></>
      case 'a2a': return <><A2AVisualizer/><A2ALessonDetails/></>
      case 'ibm-acp': return <><IBMACPMigrationVisualizer/><IBMACPLessonDetails/></>
      case 'client-acp': return <><AgentClientProtocolVisualizer/><AgentClientProtocolLessonDetails/></>
      case 'tooling': return <><ToolIntegrationVisualizer/><ToolIntegrationLessonDetails/></>
    }
  }
  if(stage===8) {
    switch(topicId) {
      case 'workflow-patterns': return <><WorkflowPatternsVisualizer/><WorkflowPatternsLessonDetails/></>
      case 'event-driven': return <><EventDrivenVisualizer/><EventDrivenLessonDetails/></>
      case 'durable': return <><DurableWorkflowVisualizer/><DurableWorkflowLessonDetails/></>
      case 'automation-tools': return <><AutomationPlatformVisualizer/><AutomationPlatformLessonDetails/></>
    }
  }
  if(stage===9) {
    switch(topicId) {
      case 'experiment': return <><ExperimentTrackingVisualizer/><ExperimentTrackingLessonDetails/></>
      case 'registry': return <><ModelRegistryVisualizer/><ModelRegistryLessonDetails/></>
      case 'eval-ci': return <><EvaluationCIVisualizer/><EvaluationCILessonDetails/></>
      case 'data-pipeline': return <><DataPipelineVisualizer/><DataPipelineLessonDetails/></>
      case 'containers': return <><ContainerVisualizer/><ContainerLessonDetails/></>
      case 'cicd': return <><CICDVisualizer/><CICDLessonDetails/></>
      case 'infra': return <><IaCVisualizer/><IaCLessonDetails/></>
    }
  }
  if(stage===10 && ['prompt-injection','tool-security','tenant-security','supply-chain','tracing','slos','cost','incidents'].includes(topicId)) return <Stage10MasteryLab topicId={topicId}/>
  if(stage===11 && ['capstone-design','capstone-build','capstone-delivery'].includes(topicId)) return <ArchitectureFlow/>
  if(stage===12 && ['agent-orchestration','protocol-interop','advanced-retrieval','evaluation-scale','ai-red-team','inference-performance','multimodal-systems','enterprise-governance','advanced-practicum'].includes(topicId)) return <AgenticInterviewStudio/>
  return null
}
