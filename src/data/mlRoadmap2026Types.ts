export type RoadmapPhase = 'foundations' | 'classical-ml' | 'deep-vision-nlp' | 'genai-rl' | 'mlops-projects'

export type RoadmapTopic = {
  id: string
  title: string
  explanation: string
  analogy: string
  technicalDetail: string
  productionPitfall: string
  pythonSnippet: string
}

export type RoadmapDfdStep = {
  step: number
  nodeId: string
  title: string
  description: string
  payload: Record<string, unknown>
}

export type RoadmapSimControl =
  | {
      id: string
      label: string
      type: 'slider'
      min: number
      max: number
      step: number
      unit: string
      defaultValue: number
    }
  | {
      id: string
      label: string
      type: 'toggle'
      defaultValue: boolean
    }

export type RoadmapSimOutput = {
  health: 'optimal' | 'tradeoff' | 'breaking'
  headline: string
  explanation: string
  kpis: { label: string; value: string; sub: string; status: 'optimal' | 'tradeoff' | 'breaking' }[]
  bars: { label: string; pct: number; display: string; tone: 'primary' | 'positive' | 'warning' | 'danger' }[]
}

export type RoadmapTrack = {
  id: string
  number: number
  phase: RoadmapPhase
  phaseLabel: string
  title: string
  summary: string
  architectAuditNote: string
  topics: RoadmapTopic[]
  mermaidDfd: string
  dfdNodeLabels: Record<string, string>
  dfdSteps: RoadmapDfdStep[]
  simTitle: string
  simSubtitle: string
  simControls: RoadmapSimControl[]
  runSim: (vals: Record<string, number | boolean>) => RoadmapSimOutput
  playgroundTitle: string
  playgroundTask: string
  executableCode: string
  pythonReference: string
}

export const nVal = (v: number | boolean | undefined, fallback: number) =>
  typeof v === 'number' ? v : fallback

export const bVal = (v: number | boolean | undefined, fallback: boolean) =>
  typeof v === 'boolean' ? v : fallback
