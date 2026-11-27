export type StageId =
  | 'foundations-python-data'
  | 'math-intuition'
  | 'ml-deep-learning'
  | 'genai-rag'
  | 'durable-multi-agent'
  | 'inference-llmops'

export interface AnalogyMapping {
  realWorld: string
  aiConcept: string
  whyItMatters: string
}

export interface SimpleEnglishSection {
  plainExplanation: string
  analogyTitle: string
  analogyStory: string
  analogyMappings: AnalogyMapping[]
  codeLanguage: 'python'
  codeTitle: string
  codeSnippet: string
}

export interface ArchitectureFlowSection {
  diagramType: 'flowchart' | 'sequenceDiagram'
  mermaidSyntax: string
  flowCaption: string
  nodeLabels: Record<string, string>
}

export interface AnimationFrame {
  step_number: number
  highlight_node: string
  visual_state_description: string
  sample_data_payload: Record<string, unknown>
}

export interface SimulatorControl {
  id: string
  label: string
  type: 'slider' | 'toggle'
  min?: number
  max?: number
  step?: number
  defaultValue: number | boolean
  unit?: string
  minLabel?: string
  maxLabel?: string
  helperText: string
}

export interface SimulatorFormulaRule {
  metric: string
  formula: string
  plainMeaning: string
}

export interface SimulatorResult {
  simulatedOutput: string
  accuracyScore: number // 0 to 100
  latencyMs: number
  tokenCostUsd: number
  tokenEstimate: number
  healthStatus: 'optimal' | 'tradeoff' | 'breaking'
  healthLabel: string
  healthReason: string
}

export interface SimulatorConfigSection {
  summary: string
  controls: SimulatorControl[]
  formulaRules: SimulatorFormulaRule[]
}

export interface CodingChallenge {
  title: string
  prompt: string
  starterCode: string
  expectedInput: string
  expectedOutput: string
  hint: string
  solutionCode: string
  requiredTokens: string[]
  verificationNote: string
}

export interface TroubleshootingQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface HandsOnPracticeSection {
  codingChallenge: CodingChallenge
  troubleshootingQuiz: [TroubleshootingQuestion, TroubleshootingQuestion]
}

export interface BeginnerCurriculumTopic {
  id: string
  stageId: StageId
  stageNumber: number
  stageTitle: string
  topicNumber: string
  title: string
  tagline: string
  estimatedMinutes: number
  simpleEnglish: SimpleEnglishSection
  architectureFlow: ArchitectureFlowSection
  animationTimeline: AnimationFrame[]
  simulatorConfig: SimulatorConfigSection
  handsOnPractice: HandsOnPracticeSection
}

export interface BeginnerCurriculumStage {
  id: StageId
  stageNumber: number
  title: string
  subtitle: string
}
