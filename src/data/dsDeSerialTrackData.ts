export type DsDeTrackRole = 'Senior Data Scientist' | 'Senior Data Engineer' | 'LLM Data Engineer'

export type DsDeDfdStep = {
  step: number
  nodeId: string
  title: string
  description: string
  payload: Record<string, unknown>
}

export type DsDeSimControl =
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

export type DsDeSimMetric = {
  label: string
  value: string
  detail: string
  status: 'optimal' | 'tradeoff' | 'breaking'
}

export type DsDeChartBar = {
  label: string
  value: number
  displayValue: string
  tone: 'primary' | 'positive' | 'warning' | 'danger'
}

export type DsDeSimResult = {
  health: 'optimal' | 'tradeoff' | 'breaking'
  headline: string
  explanation: string
  metrics: DsDeSimMetric[]
  chartTitle: string
  chartBars: DsDeChartBar[]
  curvePoints?: { x: number; yA: number; yB?: number }[]
  curveLabelA?: string
  curveLabelB?: string
}

export type DsDeMcq = {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export type DsDeSerialModule = {
  id: string
  chapterNumber: number
  role: DsDeTrackRole
  title: string
  subtitle: string
  estimatedMinutes: number
  prerequisites: string
  plainEnglish: string
  realWorldAnalogy: string
  keyConcepts: string[]
  withBestPractice: string
  withoutBestPractice: string
  mermaidDfd: string
  dfdNodeLabels: Record<string, string>
  dfdSteps: DsDeDfdStep[]
  simTitle: string
  simSubtitle: string
  simControls: DsDeSimControl[]
  computeSim: (values: Record<string, number | boolean>) => DsDeSimResult
  sandboxTitle: string
  sandboxChallenge: string
  sandboxHint: string
  executableCode: string
  productionBlueprintLabel: string
  productionBlueprint: string
  mcqs: DsDeMcq[]
}

const num = (v: number | boolean | undefined, fallback: number) =>
  typeof v === 'number' ? v : fallback
const bool = (v: number | boolean | undefined, fallback: boolean) =>
  typeof v === 'boolean' ? v : fallback

const normalPdf = (x: number, mean: number, std: number) =>
  (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2))

export const dsDeSerialModules: DsDeSerialModule[] = [
  // =========================================================================
  // MODULE 01 — STATISTICAL EXPERIMENTATION & A/B TESTING
  // =========================================================================
  {
    id: 'ds-ab-testing',
    chapterNumber: 1,
    role: 'Senior Data Scientist',
    title: 'Statistical Experimentation, A/B Testing & CUPED',
    subtitle: 'Power analysis, Sample Ratio Mismatch (SRM), peeking traps, and variance reduction',
    estimatedMinutes: 25,
    prerequisites: 'Basic probability & mean/variance',
    plainEnglish:
      'Shipping a model or UI change without a controlled experiment confuses seasonal noise with real impact. A/B testing randomly splits users, checks that the split is unbiased (SRM), collects enough samples for statistical power (usually 80%), avoids peeking early at p-values, and uses pre-experiment user history (CUPED) to cut required sample size by 30%–50%.',
    realWorldAnalogy:
      'Testing a new fertilizer on half a farm field: if you water the new side more (SRM bug) or declare victory after checking the plants every morning until one sunny day looks good (peeking trap), you fool yourself.',
    keyConcepts: [
      'Statistical Power (1 - β) & Minimum Detectable Effect (MDE)',
      'Two-Sample Z-Test, p-value & Confidence Intervals',
      'Peeking Problem (Type I False-Positive Inflation)',
      'Sample Ratio Mismatch (SRM) Chi-Square Gate',
      'CUPED (Controlled-experiment Using Pre-Experiment Data)'
    ],
    withBestPractice:
      'Fixed-horizon sample size or sequential alpha-spending + automated SRM check + CUPED covariate adjustment yields calibrated 5% false-positive rate and 35% faster experiment velocity.',
    withoutBestPractice:
      'Daily p-value peeking inflates false positives from 5% to 25%+, shipping neutral/harmful models while hidden SRM telemetry bugs silently corrupt variant metrics.',
    mermaidDfd: `flowchart LR
  U["Incoming Users"] --> HASH["Deterministic Hash Split 50/50"]
  HASH --> SRM{"SRM Chi-Square Guard (p > 0.001)"}
  SRM -->|Pass| MET["Log Exposure & Outcome Metrics"]
  SRM -->|Fail| HALT["Halt & Debug Assignment Bug"]
  MET --> CUPED["CUPED Pre-Experiment Variance Reduction"]
  CUPED --> TEST["Fixed-Horizon / Sequential Z-Test"]
  TEST --> DEC["Ship / Iterate / Rollback Decision"]`,
    dfdNodeLabels: {
      U: 'Incoming Users',
      HASH: 'Deterministic Split',
      SRM: 'SRM Guard',
      MET: 'Metric Logging',
      CUPED: 'CUPED Adjustment',
      TEST: 'Z-Test & Power',
      DEC: 'Ship Decision'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'HASH',
        title: 'Deterministic User Randomization',
        description: 'Hash(user_id + experiment_salt) assigns each user consistently to Control or Treatment without session flicker.',
        payload: { user_id: 'u_84921', salt: 'ranker_v4', bucket: 0.614, variant: 'treatment' }
      },
      {
        step: 2,
        nodeId: 'SRM',
        title: 'Sample Ratio Mismatch (SRM) Check',
        description: 'Before trusting any metric, verify observed split matches target 50/50 via Chi-Square test (p > 0.001).',
        payload: { control_n: 50112, treatment_n: 49888, expected: 50000, chi2_p: 0.479, status: 'PASS' }
      },
      {
        step: 3,
        nodeId: 'CUPED',
        title: 'CUPED Variance Reduction',
        description: 'Subtract θ*(X_pre - E[X_pre]) using pre-experiment user spend/clicks to cancel out natural user-to-user variance.',
        payload: { corr_r: 0.62, variance_reduction_pct: 38.4, effective_sample_multiplier: '1.62x' }
      },
      {
        step: 4,
        nodeId: 'TEST',
        title: 'Hypothesis Test & Confidence Interval',
        description: 'Evaluate lift, z-score, p-value, and 95% CI only after reaching pre-registered sample size (or sequential boundary).',
        payload: { lift_rel_pct: 4.2, z_score: 2.84, p_value: 0.0045, ci_95: '[+1.3%, +7.1%]', verdict: 'SHIP' }
      }
    ],
    simTitle: 'A/B Test Power, Peeking Trap & CUPED Simulator',
    simSubtitle: 'Tune MDE, baseline conversion, daily traffic, peeking frequency, and CUPED to see sample size and false-positive risk in real time.',
    simControls: [
      { id: 'baselinePct', label: 'Baseline Conversion Rate', type: 'slider', min: 1, max: 25, step: 0.5, unit: '%', defaultValue: 5 },
      { id: 'mdeRelPct', label: 'Min Detectable Relative Lift (MDE)', type: 'slider', min: 2, max: 25, step: 1, unit: '%', defaultValue: 8 },
      { id: 'dailyTraffic', label: 'Total Daily Experiment Users', type: 'slider', min: 2000, max: 100000, step: 2000, unit: 'users/d', defaultValue: 20000 },
      { id: 'peeks', label: 'Unadjusted Peeks at p-value', type: 'slider', min: 1, max: 14, step: 1, unit: 'checks', defaultValue: 1 },
      { id: 'useCuped', label: 'Enable CUPED Pre-Experiment Covariate (r = 0.60)', type: 'toggle', defaultValue: true }
    ],
    computeSim: vals => {
      const p0 = num(vals.baselinePct, 5) / 100
      const mdeRel = num(vals.mdeRelPct, 8) / 100
      const daily = num(vals.dailyTraffic, 20000)
      const peeks = num(vals.peeks, 1)
      const useCuped = bool(vals.useCuped, true)

      const p1 = p0 * (1 + mdeRel)
      const delta = Math.max(0.0001, p1 - p0)
      const zAlpha = 1.96
      const zBeta = 0.84 // 80% power
      const pooledVar = p0 * (1 - p0) + p1 * (1 - p1)
      const rawPerVariant = Math.ceil((Math.pow(zAlpha + zBeta, 2) * pooledVar) / Math.pow(delta, 2))
      const varianceFactor = useCuped ? 1 - 0.6 * 0.6 : 1 // 1 - r^2 = 0.64 (36% reduction)
      const adjPerVariant = Math.ceil(rawPerVariant * varianceFactor)
      const daysNeeded = Number(((adjPerVariant * 2) / daily).toFixed(1))

      // Effective Type I error inflation under naive repeated peeking (Armitage approximation)
      const effectiveFpr = Math.min(48, Number((5 * (1 + 0.62 * Math.log(peeks)) * (peeks > 1 ? 1.15 : 1)).toFixed(1)))

      const health: DsDeSimResult['health'] =
        effectiveFpr > 12 || daysNeeded > 45 ? 'breaking' : effectiveFpr > 6.5 || daysNeeded > 21 ? 'tradeoff' : 'optimal'

      // Curve comparing Null H0 vs Alternative H1 Z-distributions
      const ncp = Math.min(4.2, 2.8 * (useCuped ? 1.18 : 1.0))
      const curvePoints = Array.from({ length: 29 }, (_, idx) => {
        const z = -3.2 + idx * 0.32
        return {
          x: Number(z.toFixed(2)),
          yA: Number(normalPdf(z, 0, 1).toFixed(4)),
          yB: Number(normalPdf(z, ncp, 1).toFixed(4))
        }
      })

      return {
        health,
        headline:
          effectiveFpr > 12
            ? `Peeking Trap Active: True False-Positive Rate is ${effectiveFpr}% (not 5%)`
            : daysNeeded > 30
            ? `Underpowered Velocity: ${daysNeeded} days required to detect +${(mdeRel * 100).toFixed(0)}% lift`
            : `Well-Powered Experiment: Ready in ${daysNeeded} days with ${effectiveFpr}% calibrated α`,
        explanation: useCuped
          ? `CUPED (r = 0.60) cuts variance by 36%, shrinking required sample size from ${rawPerVariant.toLocaleString()} to ${adjPerVariant.toLocaleString()} users per variant.`
          : `Without CUPED you need ${rawPerVariant.toLocaleString()} users per variant. Turning on pre-experiment covariate adjustment cuts runtime by 36%.`,
        metrics: [
          {
            label: 'Sample / Variant',
            value: adjPerVariant.toLocaleString(),
            detail: useCuped ? 'CUPED −36% variance' : 'Standard fixed-horizon',
            status: adjPerVariant < 120000 ? 'optimal' : 'tradeoff'
          },
          {
            label: 'Experiment Runtime',
            value: `${daysNeeded} days`,
            detail: `at ${daily.toLocaleString()} users/day`,
            status: daysNeeded <= 14 ? 'optimal' : daysNeeded <= 30 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Effective False Positive',
            value: `${effectiveFpr}%`,
            detail: peeks === 1 ? 'Single pre-registered check' : `${peeks} unadjusted peeks`,
            status: effectiveFpr <= 5.5 ? 'optimal' : effectiveFpr <= 12 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Target Detectable Rate',
            value: `${(p1 * 100).toFixed(2)}%`,
            detail: `from ${(p0 * 100).toFixed(1)}% baseline`,
            status: 'optimal'
          }
        ],
        chartTitle: 'Null Distribution (H0) vs. Treatment Signal (H1) & Sample Comparison',
        chartBars: [
          { label: 'Raw Sample Needed', value: Math.min(100, (rawPerVariant / Math.max(rawPerVariant, 1)) * 100), displayValue: rawPerVariant.toLocaleString(), tone: 'warning' },
          { label: 'Active Sample Needed', value: Math.min(100, (adjPerVariant / Math.max(rawPerVariant, 1)) * 100), displayValue: adjPerVariant.toLocaleString(), tone: useCuped ? 'positive' : 'primary' },
          { label: 'Nominal α Target', value: 10, displayValue: '5.0%', tone: 'positive' },
          { label: 'Actual False Positive', value: Math.min(100, effectiveFpr * 2), displayValue: `${effectiveFpr}%`, tone: effectiveFpr > 10 ? 'danger' : effectiveFpr > 6 ? 'warning' : 'positive' }
        ],
        curvePoints,
        curveLabelA: 'Null H0 (No Lift)',
        curveLabelB: 'Alternative H1 (True Lift)'
      }
    },
    sandboxTitle: 'Live Sandbox: SRM Guard + Two-Sample Z-Test + CUPED',
    sandboxChallenge:
      'Run the experiment analyzer below. Notice how `USE_CUPED = true` lowers the standard error and tightens the confidence interval. Try changing `controlN` to `47000` to trigger the Sample Ratio Mismatch (SRM) safety gate!',
    sandboxHint: 'Set controlN = 50000 and treatmentN = 50000 to pass SRM, then toggle USE_CUPED to compare Z-scores.',
    executableCode: `// Serial Module 01 — Live A/B Test Analyzer with SRM Guard & CUPED
const controlN = 50000;
const treatmentN = 50000; // Try changing to 48000 to trigger an SRM failure!
const controlConv = 2500;   // 5.00%
const treatmentConv = 2645; // 5.29% (+5.8% relative lift)
const preExperimentCorr = 0.62;
const USE_CUPED = true;

// 1. Sample Ratio Mismatch (SRM) Chi-Square check (1 df, threshold 10.83 => p < 0.001)
const totalN = controlN + treatmentN;
const expected = totalN / 2;
const chi2 = Math.pow(controlN - expected, 2) / expected + Math.pow(treatmentN - expected, 2) / expected;
const srmPassed = chi2 < 10.83;

// 2. Conversion Rates & Pooled Standard Error
const pC = controlConv / controlN;
const pT = treatmentConv / treatmentN;
const liftAbs = pT - pC;
const liftRelPct = ((pT - pC) / pC) * 100;

const rawVar = (pC * (1 - pC)) / controlN + (pT * (1 - pT)) / treatmentN;
const cupedFactor = USE_CUPED ? (1 - preExperimentCorr * preExperimentCorr) : 1.0;
const se = Math.sqrt(rawVar * cupedFactor);
const zScore = liftAbs / se;

// Two-sided p-value approximation via Abramowitz & Stegun erfc
function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

console.log("[SRM Guard] chi2 =", chi2.toFixed(3), "| Status:", srmPassed ? "PASS" : "FAIL (Traffic Split Biased!)");
console.log("[Lift] Control =", (pC * 100).toFixed(2) + "% | Treatment =", (pT * 100).toFixed(2) + "% | Rel Lift = +" + liftRelPct.toFixed(2) + "%");
console.log("[Inference] CUPED =", USE_CUPED, "| Z-Score =", zScore.toFixed(3), "| p-value =", pValue.toFixed(5));

assert(srmPassed, "SRM Chi-Square check passed (chi2=" + chi2.toFixed(2) + " < 10.83)");
assert(pValue < 0.05, "Statistically significant at alpha=0.05 (p=" + pValue.toFixed(5) + ")");
assert(liftRelPct > 3.0, "Lift exceeds minimum business threshold (+3.0%)");

emitMetric("Z-Score", zScore.toFixed(2), USE_CUPED ? "CUPED Adjusted" : "Raw", zScore >= 1.96 ? "optimal" : "tradeoff");
emitMetric("Two-Sided p-value", pValue.toFixed(4), "α = 0.05", pValue < 0.05 ? "optimal" : "breaking");
emitMetric("Relative Lift", "+" + liftRelPct.toFixed(2) + "%", "Conversion", "optimal");
emitMetric("SRM Chi-Square", chi2.toFixed(2), srmPassed ? "Balanced" : "Biased Split", srmPassed ? "optimal" : "breaking");

emitArtifact("Experiment Readout", {
  srm_passed: srmPassed,
  cuped_variance_reduction_pct: USE_CUPED ? Number(((1 - cupedFactor) * 100).toFixed(1)) : 0,
  z_score: Number(zScore.toFixed(3)),
  p_value: Number(pValue.toFixed(5)),
  decision: srmPassed && pValue < 0.05 ? "SHIP_TREATMENT" : "HOLD_OR_INVESTIGATE"
});`,
    productionBlueprintLabel: 'Python (SciPy + CUPED)',
    productionBlueprint: `import numpy as np
from scipy.stats import chisquare, norm

def analyze_ab_with_cuped(y_ctrl, x_pre_ctrl, y_trt, x_pre_trt):
    # 1. Sample Ratio Mismatch (SRM) guard before touching outcomes
    _, srm_p = chisquare([len(y_ctrl), len(y_trt)])
    if srm_p < 0.001:
        raise RuntimeError(f"SRM detected (p={srm_p:.5f}) — halt readout and audit assignment!")

    # 2. Compute global CUPED theta = Cov(Y, X_pre) / Var(X_pre)
    y_all = np.concatenate([y_ctrl, y_trt])
    x_all = np.concatenate([x_pre_ctrl, x_pre_trt])
    theta = np.cov(y_all, x_all)[0, 1] / np.var(x_all, ddof=1)
    x_mean = np.mean(x_all)

    y_ctrl_adj = y_ctrl - theta * (x_pre_ctrl - x_mean)
    y_trt_adj  = y_trt  - theta * (x_pre_trt  - x_mean)

    # 3. Two-sample Z-test on variance-reduced outcomes
    diff = y_trt_adj.mean() - y_ctrl_adj.mean()
    se = np.sqrt(y_ctrl_adj.var(ddof=1)/len(y_ctrl) + y_trt_adj.var(ddof=1)/len(y_trt))
    z = diff / se
    p_val = 2 * (1 - norm.cdf(abs(z)))
    return {"diff": diff, "z": z, "p_value": p_val, "theta": theta}`,
    mcqs: [
      {
        id: 'ab-q1',
        question: 'Your 50/50 experiment shows 52,400 users in Control and 47,600 in Treatment, with Treatment winning by +9% (p = 0.0002). What should you do?',
        options: [
          'Ship Treatment immediately because p = 0.0002 is overwhelmingly significant',
          'Halt the decision and audit logging/assignment—this is a severe Sample Ratio Mismatch (SRM)',
          'Drop 4,800 random rows from Control so both sides equal 47,600 and ship',
          'Apply CUPED to correct the assignment imbalance'
        ],
        correctIndex: 1,
        explanation: 'A 52.4% vs 47.6% split has a massive Chi-Square SRM failure (p << 10^-50). Often bots, crashes, or client-side redirects drop users non-randomly in Treatment—making the remaining Treatment cohort artificially higher-converting.'
      },
      {
        id: 'ab-q2',
        question: 'Why does checking a standard p-value every morning for 14 days and stopping as soon as p < 0.05 break statistical guarantees?',
        options: [
          'It reduces statistical power to zero',
          'It violates the fixed-horizon assumption and inflates the true false-positive rate from 5% to ~20–25%',
          'It causes CUPED covariates to leak future data',
          'It only works for non-binary revenue metrics'
        ],
        correctIndex: 1,
        explanation: 'Repeated unadjusted peeking gives random noise 14 chances to cross the 0.05 threshold. Use either a pre-registered fixed horizon or sequential testing methods (alpha-spending / mSPRT).'
      }
    ]
  },

  // =========================================================================
  // MODULE 02 — CAUSAL INFERENCE & TIME-SERIES FORECASTING
  // =========================================================================
  {
    id: 'ds-causal-timeseries',
    chapterNumber: 2,
    role: 'Senior Data Scientist',
    title: 'Causal Inference (DiD) & Time-Series Forecasting',
    subtitle: 'Confounding traps, Difference-in-Differences, seasonality, and walk-forward validation',
    estimatedMinutes: 28,
    prerequisites: 'Module 01 (Experimentation) & Regression',
    plainEnglish:
      'When you cannot run a randomized A/B test (like a regional price change or macro policy), naive before-vs-after comparisons are ruined by confounding trends. Difference-in-Differences (DiD) isolates the true causal effect by comparing the treated group against a parallel control group. Similarly, forecasting future time-series data requires strict chronological Walk-Forward validation—never random K-fold shuffling, which leaks tomorrow into today.',
    realWorldAnalogy:
      'If ice cream sales and drowning both spike in July, banning ice cream will not prevent drowning (temperature is the confounder). And grading a weather forecaster by letting them peek at Tuesday’s temperature to predict Monday’s weather (random K-fold) makes a useless model look like a genius.',
    keyConcepts: [
      'Confounding Bias, DAGs & Simpson’s Paradox',
      'Difference-in-Differences (DiD) & Parallel Trends',
      'Stationarity, Trend, Seasonality & Autocorrelation',
      'Walk-Forward (Expanding/Rolling) Temporal Cross-Validation',
      'Pinball / Quantile Loss for Probabilistic Forecasts'
    ],
    withBestPractice:
      'Use DiD / Propensity Weighting for observational causal questions and strict walk-forward splits with gap buffers so validation MAPE mirrors real production forecast error.',
    withoutBestPractice:
      'Naive observational correlations misallocate millions in marketing spend, while random K-fold splits on time-series create 3×–5× optimistic validation accuracy that collapses in production.',
    mermaidDfd: `flowchart LR
  RAW["Time-Ordered Event Log (t = 1..T)"] --> SPLIT{"Temporal Split Guard"}
  SPLIT -->|Valid Walk-Forward| TR["Train Window (t <= T_cut)"]
  SPLIT -->|Bug: Random K-Fold| LEAK["Future Leakage! (t > T_cut in Train)"]
  TR --> FEAT["Lag & Rolling Features (Past Only)"]
  FEAT --> CAUSAL["DiD / Confounder Control"]
  CAUSAL --> FC["Multi-Horizon Forecast + Quantile Bands"]`,
    dfdNodeLabels: {
      RAW: 'Time-Ordered Events',
      SPLIT: 'Temporal Split Guard',
      TR: 'Past Train Window',
      LEAK: 'Future Leakage Bug',
      FEAT: 'Lag Features',
      CAUSAL: 'Causal DiD Control',
      FC: 'Forecast & Bands'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'RAW',
        title: 'Strict Event-Time Ordering',
        description: 'Sort all records by true event timestamp before any feature aggregation or splitting.',
        payload: { rows: 36500, start: '2025-01-01', end: '2026-11-01', freq: 'daily' }
      },
      {
        step: 2,
        nodeId: 'SPLIT',
        title: 'Walk-Forward Expanding Cutoffs',
        description: 'Train strictly on t <= T_cut, enforce an optional horizon gap, and evaluate on future t > T_cut.',
        payload: { fold: 3, train_range: 'Day 1..240', test_range: 'Day 241..270', random_shuffle: false }
      },
      {
        step: 3,
        nodeId: 'CAUSAL',
        title: 'Difference-in-Differences (DiD) Isolation',
        description: 'Subtract the untreated control region’s natural trend from the treated region’s delta to cancel macro seasonality.',
        payload: { treated_delta: '+18.5%', control_trend: '+11.0%', true_causal_did: '+7.5%' }
      },
      {
        step: 4,
        nodeId: 'FC',
        title: 'Probabilistic Quantile Forecast (P10 / P50 / P90)',
        description: 'Output prediction intervals via Pinball loss so inventory/capacity planners see uncertainty, not just point estimates.',
        payload: { horizon_day: 14, p10: 1420, p50: 1680, p90: 1940, walk_forward_mape: '6.4%' }
      }
    ],
    simTitle: 'Causal Confounding & Walk-Forward Leakage Simulator',
    simSubtitle: 'Toggle Random K-Fold vs. Walk-Forward validation and adjust macro confounder strength to watch how leakage and confounding distort reality.',
    simControls: [
      { id: 'trueCausalLift', label: 'True Causal Intervention Effect', type: 'slider', min: -5, max: 20, step: 1, unit: '%', defaultValue: 6 },
      { id: 'confounderTrend', label: 'Macro Confounder / Seasonal Trend', type: 'slider', min: 0, max: 30, step: 2, unit: '%', defaultValue: 14 },
      { id: 'horizonDays', label: 'Forecast Horizon', type: 'slider', min: 1, max: 30, step: 1, unit: 'days', defaultValue: 14 },
      { id: 'useWalkForward', label: 'Enforce Strict Walk-Forward Temporal Split (No Shuffle)', type: 'toggle', defaultValue: true }
    ],
    computeSim: vals => {
      const trueLift = num(vals.trueCausalLift, 6)
      const confounder = num(vals.confounderTrend, 14)
      const horizon = num(vals.horizonDays, 14)
      const walkForward = bool(vals.useWalkForward, true)

      const naiveEstimate = trueLift + confounder
      const didEstimate = Number((trueLift + 0.3).toFixed(1)) // tiny sampling noise
      const trueProdMape = Number((3.8 + horizon * 0.28 + confounder * 0.08).toFixed(1))
      const reportedValMape = walkForward ? trueProdMape : Number((trueProdMape * 0.32).toFixed(1))
      const illusionGap = Number((trueProdMape - reportedValMape).toFixed(1))

      const health: DsDeSimResult['health'] = !walkForward
        ? 'breaking'
        : confounder >= 18
        ? 'tradeoff'
        : 'optimal'

      // Time-series actual vs forecast curve
      const curvePoints = Array.from({ length: 24 }, (_, t) => {
        const seasonal = 50 + t * 1.4 + Math.sin(t * 0.7) * (8 + confounder * 0.35)
        const forecast = walkForward
          ? seasonal + (t > 15 ? (t - 15) * 0.9 * (horizon / 14) : 0.4)
          : seasonal + 0.3 // artificially hugs future curve because of leakage
        return {
          x: t + 1,
          yA: Number(seasonal.toFixed(1)),
          yB: Number(forecast.toFixed(1))
        }
      })

      return {
        health,
        headline: !walkForward
          ? `Severe Temporal Leakage: Random K-Fold reports ${reportedValMape}% MAPE, hiding ${trueProdMape}% real error`
          : `Valid Walk-Forward + DiD: Isolated +${didEstimate}% causal lift (vs. biased +${naiveEstimate}% naive)`,
        explanation: !walkForward
          ? `Randomly shuffling time-series rows lets the model interpolate between day t-1 and day t+1. Offline MAPE looks ${illusionGap} points better than production reality.`
          : `Difference-in-Differences cancels the +${confounder}% macro confounder, recovering the true +${trueLift}% causal lift while walk-forward validation tracks real horizon drift.`,
        metrics: [
          {
            label: 'Naive Before/After',
            value: `+${naiveEstimate}%`,
            detail: `Includes +${confounder}% confounder`,
            status: confounder > 10 ? 'breaking' : 'tradeoff'
          },
          {
            label: 'Causal DiD Estimate',
            value: `+${didEstimate}%`,
            detail: `True effect: +${trueLift}%`,
            status: 'optimal'
          },
          {
            label: 'Reported Val MAPE',
            value: `${reportedValMape}%`,
            detail: walkForward ? 'Honest Walk-Forward' : 'Leaked Random K-Fold',
            status: walkForward ? 'optimal' : 'breaking'
          },
          {
            label: 'True Production MAPE',
            value: `${trueProdMape}%`,
            detail: `${horizon}-day forecast horizon`,
            status: trueProdMape <= 10 ? 'optimal' : 'tradeoff'
          }
        ],
        chartTitle: 'Causal Bias & Forecast Error Gap Comparison',
        chartBars: [
          { label: 'True Causal Effect', value: Math.max(8, Math.min(100, (trueLift + 10) * 2.5)), displayValue: `+${trueLift}%`, tone: 'positive' },
          { label: 'Naive Correlational Lift', value: Math.max(8, Math.min(100, (naiveEstimate + 10) * 2.5)), displayValue: `+${naiveEstimate}%`, tone: confounder > 8 ? 'danger' : 'warning' },
          { label: 'Reported Offline MAPE', value: Math.min(100, reportedValMape * 4), displayValue: `${reportedValMape}%`, tone: walkForward ? 'primary' : 'danger' },
          { label: 'Real Production MAPE', value: Math.min(100, trueProdMape * 4), displayValue: `${trueProdMape}%`, tone: 'warning' }
        ],
        curvePoints,
        curveLabelA: 'Actual Time Series',
        curveLabelB: walkForward ? 'Walk-Forward Forecast' : 'Leaked Shuffled Fit'
      }
    },
    sandboxTitle: 'Live Sandbox: Difference-in-Differences (DiD) & Walk-Forward Audit',
    sandboxChallenge:
      'Execute the live causal DiD estimator and walk-forward time-series evaluator. Try flipping `USE_RANDOM_SHUFFLE = true` to see how future leakage artificially slashes MAE while failing the leakage assertion!',
    sandboxHint: 'Keep USE_RANDOM_SHUFFLE = false to pass temporal integrity assertions.',
    executableCode: `// Serial Module 02 — Causal Difference-in-Differences + Walk-Forward Forecast
const USE_RANDOM_SHUFFLE = false; // Set true to inject classic time-series leakage!

// Part A: Observational Regional Pricing Launch (Difference-in-Differences)
// Both cities enjoyed a +12% summer seasonal boom (confounder).
const treatedPre = 100.0, treatedPost = 118.5; // +18.5 naive jump
const controlPre = 96.0,  controlPost = 107.5; // +11.5 macro seasonal trend

const naiveLift = treatedPost - treatedPre;
const didCausalEffect = (treatedPost - treatedPre) - (controlPost - controlPre);

// Part B: Daily Demand Time Series (Trend + Weekly Seasonality)
const series = Array.from({ length: 40 }, (_, t) =>
  Number((100 + t * 1.8 + Math.sin((t * 2 * Math.PI) / 7) * 14).toFixed(2))
);

// Evaluate naive 1-step lag model on last 10 days (Walk-Forward) vs leaked future neighbor
let absErrSum = 0;
for (let t = 30; t < 40; t++) {
  const actual = series[t];
  // Walk-forward only sees past (t-7 same weekday + trend). Shuffled sees (t-1 + t+1)/2 (FUTURE LEAK!)
  const pred = USE_RANDOM_SHUFFLE
    ? ((series[t - 1] + (series[t + 1] ?? series[t])) / 2)
    : (series[t - 7] + 7 * 1.8);
  absErrSum += Math.abs(actual - pred);
}
const mae = Number((absErrSum / 10).toFixed(3));

console.log("[Causal DiD] Naive Before/After =", naiveLift.toFixed(2), "| Control Trend =", (controlPost - controlPre).toFixed(2));
console.log("[Causal DiD] Isolated True Causal Impact =", didCausalEffect.toFixed(2));
console.log("[Time-Series] Split Mode:", USE_RANDOM_SHUFFLE ? "RANDOM SHUFFLE (LEAKED)" : "STRICT WALK-FORWARD", "| MAE =", mae);

assert(!USE_RANDOM_SHUFFLE, "Temporal validation guard: no future timestamps inside training split");
assert(Math.abs(didCausalEffect - 7.0) < 0.5, "DiD successfully stripped the +11.5 macro seasonal confounder");
assert(mae < 2.0, "Seasonal lag-7 + drift walk-forward forecast achieved MAE=" + mae);

emitMetric("Causal DiD Effect", "+" + didCausalEffect.toFixed(1), "vs +" + naiveLift.toFixed(1) + " naive", "optimal");
emitMetric("Confounder Removed", "+" + (controlPost - controlPre).toFixed(1), "Macro trend", "optimal");
emitMetric("Walk-Forward MAE", mae.toFixed(2), "Last 10 days", mae < 2 ? "optimal" : "tradeoff");
emitMetric("Temporal Integrity", USE_RANDOM_SHUFFLE ? "LEAKED" : "CLEAN", "No future peek", USE_RANDOM_SHUFFLE ? "breaking" : "optimal");

emitArtifact("Causal & Forecast Audit", {
  did_causal_effect: Number(didCausalEffect.toFixed(2)),
  naive_biased_effect: Number(naiveLift.toFixed(2)),
  split_mode: USE_RANDOM_SHUFFLE ? "random_kfold_leaked" : "walk_forward",
  mae_units: mae
});`,
    productionBlueprintLabel: 'Python (Statsmodels DiD + TimeSeriesSplit)',
    productionBlueprint: `import statsmodels.formula.api as smf
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error

# 1. Difference-in-Differences OLS with interaction term (treated:post)
did_model = smf.ols("revenue ~ treated + post + treated:post", data=panel_df).fit(
    cov_type="cluster", cov_kwds={"groups": panel_df["region_id"]}
)
print("Causal DiD Estimate:", did_model.params["treated:post"])

# 2. Strict Walk-Forward Cross-Validation with horizon gap (never KFold(shuffle=True))
tscv = TimeSeriesSplit(n_splits=5, test_size=14, gap=2)
for fold, (train_idx, test_idx) in enumerate(tscv.split(X_time_ordered)):
    model.fit(X_time_ordered.iloc[train_idx], y.iloc[train_idx])
    preds = model.predict(X_time_ordered.iloc[test_idx])
    print(f"Fold {fold} Walk-Forward MAE:", mean_absolute_error(y.iloc[test_idx], preds))`,
    mcqs: [
      {
        id: 'causal-q1',
        question: 'What is the core assumption required for a Difference-in-Differences (DiD) causal estimate to be valid?',
        options: [
          'Treated and control groups must have the exact same baseline revenue level',
          'Parallel Trends: absent the intervention, treated and control groups would have followed the same trend over time',
          'The outcome variable must be strictly binary (0 or 1)',
          'At least 1 million users must be randomly assigned per day'
        ],
        correctIndex: 1,
        explanation: 'DiD allows different baseline levels (intercepts), because differencing removes fixed group differences—but it strictly requires parallel pre-intervention trends.'
      },
      {
        id: 'causal-q2',
        question: 'Why does standard 5-fold random cross-validation fail catastrophically on daily demand forecasting data?',
        options: [
          'It runs slower than expanding-window splits',
          'Lag and rolling features leak future neighboring days into training folds, massively underestimating production error',
          'Decision trees cannot accept date features',
          'It prevents using Pinball loss'
        ],
        correctIndex: 1,
        explanation: 'Random splitting places day t-1 and day t+1 in the training set while testing on day t, turning a hard forecasting problem into trivial interpolation.'
      }
    ]
  },

  // =========================================================================
  // MODULE 03 — FEATURE ENGINEERING, IMBALANCE, CALIBRATION & SHAP
  // =========================================================================
  {
    id: 'ds-features-shap-calibration',
    chapterNumber: 3,
    role: 'Senior Data Scientist',
    title: 'Feature Engineering, Class Imbalance, Calibration & SHAP',
    subtitle: 'Out-of-fold encoding, PR-AUC, cost-aware thresholds, Brier/ECE calibration, and TreeSHAP',
    estimatedMinutes: 30,
    prerequisites: 'Module 02 & Supervised ML (XGBoost / Logistic)',
    plainEnglish:
      'On tabular business data (fraud, churn, credit risk), 99% of events are normal. Accuracy is meaningless (predicting "no fraud" is 99% accurate and catches zero thieves). Senior Data Scientists optimize PR-AUC, tune decision thresholds to real dollar costs of false positives vs. false negatives, calibrate predicted probabilities (Platt/Isotonic) so "0.80" truly means 80% risk, and explain every decision with SHAP additive values.',
    realWorldAnalogy:
      'A smoke detector calibrated to dollar risk: setting the threshold too low wakes the neighborhood over burnt toast (high false-positive cost); setting it too high misses a real fire (catastrophic false-negative cost). SHAP tells firefighters exactly which room triggered the alarm.',
    keyConcepts: [
      'Out-of-Fold Target Encoding (Zero Target Leakage)',
      'PR-AUC vs. Accuracy Paradox on Rare Events (0.1%–2%)',
      'Cost-Sensitive Threshold Optimization ($ FN vs. $ FP)',
      'Probability Calibration (Isotonic, Platt, Brier Score, ECE)',
      'SHAP Values (Shapley Additive Explanations: base + Σφ_i = f(x))'
    ],
    withBestPractice:
      'Optimize threshold directly against expected business dollar loss, calibrate raw tree scores with Isotonic/Platt scaling on a held-out fold, and log top SHAP drivers for every high-stakes decision.',
    withoutBestPractice:
      'Using default 0.50 threshold on a 0.5% fraud dataset misses 80%+ of real fraud, while uncalibrated raw logits mislead downstream pricing and automated credit engines.',
    mermaidDfd: `flowchart LR
  RAW["Raw Tabular Txns (0.5% Fraud)"] --> OOF["Out-of-Fold Target & Rolling Encoders"]
  OOF --> GBDT["Gradient Boosted Trees (Raw Score)"]
  GBDT --> CAL["Isotonic / Platt Probability Calibrator"]
  CAL --> THR["Cost-Sensitive Threshold (t* = FP / (FP + FN))"]
  THR --> ACT["Approve / Step-Up MFA / Block"]
  GBDT --> SHAP["TreeSHAP Attribution Engine (Audit Log)"]`,
    dfdNodeLabels: {
      RAW: 'Imbalanced Txns',
      OOF: 'Out-of-Fold Features',
      GBDT: 'GBDT Model',
      CAL: 'Probability Calibrator',
      THR: 'Cost Threshold Gate',
      ACT: 'Decision Action',
      SHAP: 'TreeSHAP Audit'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'OOF',
        title: 'Leak-Free Out-of-Fold Encoding',
        description: 'Encode high-cardinality merchant_id using only training folds outside the target row plus smoothing prior.',
        payload: { merchant_id: 'm_904', global_prior: 0.005, oof_fraud_rate: 0.031, leakage: false }
      },
      {
        step: 2,
        nodeId: 'CAL',
        title: 'Probability Calibration (ECE & Brier)',
        description: 'Map overconfident raw tree scores onto true empirical probabilities via held-out Isotonic regression.',
        payload: { raw_score: 0.91, calibrated_prob: 0.64, ece_before: 0.142, ece_after: 0.018 }
      },
      {
        step: 3,
        nodeId: 'THR',
        title: 'Expected Dollar Cost Thresholding',
        description: 'Choose cutoff t* = Cost_FP / (Cost_FP + Cost_FN) instead of arbitrary 0.50.',
        payload: { cost_fp_usd: 15, cost_fn_usd: 450, optimal_threshold: 0.032, savings_per_100k: '$142,800' }
      },
      {
        step: 4,
        nodeId: 'SHAP',
        title: 'Exact TreeSHAP Explanation',
        description: 'Decompose prediction into base value + additive feature contributions for compliance and analyst review.',
        payload: { base_rate: 0.02, velocity_1h: '+0.34', new_device: '+0.22', geo_mismatch: '+0.11', final_prob: 0.69 }
      }
    ],
    simTitle: 'Imbalance Threshold Profit, Calibration & SHAP Simulator',
    simSubtitle: 'Adjust fraud prevalence, decision threshold, FN/FP dollar costs, and probability calibration to optimize real net business savings.',
    simControls: [
      { id: 'prevalencePct', label: 'Fraud Prevalence Rate', type: 'slider', min: 0.2, max: 5.0, step: 0.2, unit: '%', defaultValue: 1.0 },
      { id: 'threshold', label: 'Decision Cutoff Threshold', type: 'slider', min: 0.05, max: 0.85, step: 0.05, unit: 'prob', defaultValue: 0.2 },
      { id: 'fnCost', label: 'Missed Fraud Cost (False Negative)', type: 'slider', min: 100, max: 1200, step: 50, unit: '$', defaultValue: 500 },
      { id: 'fpCost', label: 'False Block / Review Cost (FP)', type: 'slider', min: 5, max: 80, step: 5, unit: '$', defaultValue: 20 },
      { id: 'calibrated', label: 'Apply Isotonic Probability Calibration', type: 'toggle', defaultValue: true }
    ],
    computeSim: vals => {
      const prev = num(vals.prevalencePct, 1.0) / 100
      const thr = num(vals.threshold, 0.2)
      const fnCost = num(vals.fnCost, 500)
      const fpCost = num(vals.fpCost, 20)
      const calibrated = bool(vals.calibrated, true)

      const totalTxns = 100000
      const positives = Math.round(totalTxns * prev)
      const negatives = totalTxns - positives

      // Smooth precision-recall curve behavior
      const recall = Math.max(0.08, Math.min(0.98, 1 / (1 + Math.exp((thr - 0.34) * 6.5))))
      const fpr = Math.max(0.0005, Math.min(0.35, Math.exp(-thr * 9.5) * 0.42))

      const tp = Math.round(positives * recall)
      const fn = positives - tp
      const fp = Math.round(negatives * fpr)
      const precision = tp / Math.max(1, tp + fp)

      const totalLoss = fn * fnCost + fp * fpCost
      const noModelLoss = positives * fnCost
      const netSaved = noModelLoss - totalLoss
      const theoreticalOptThr = Number((fpCost / (fpCost + fnCost)).toFixed(2))
      const ece = calibrated ? 0.016 : 0.138

      const health: DsDeSimResult['health'] =
        netSaved <= 0 || !calibrated ? 'breaking' : Math.abs(thr - Math.max(0.05, theoreticalOptThr * 3)) > 0.25 ? 'tradeoff' : 'optimal'

      return {
        health,
        headline:
          netSaved <= 0
            ? `Net Negative ROI ($${netSaved.toLocaleString()}): Threshold ${thr.toFixed(2)} creates too many costly blocks/misses`
            : !calibrated
            ? `Uncalibrated Probabilities (ECE ${ece.toFixed(3)}): Optimal cost threshold is distorted`
            : `Net Fraud Savings: +$${netSaved.toLocaleString()} per 100k txns (Recall ${(recall * 100).toFixed(0)}%, Precision ${(precision * 100).toFixed(1)}%)`,
        explanation: `Bayes-optimal cost cutoff is FP/(FP+FN) = $${fpCost}/($${fpCost}+$${fnCost}) = ${theoreticalOptThr}. Lowering the threshold catches more $${fnCost} frauds but triggers more $${fpCost} customer friction reviews.`,
        metrics: [
          {
            label: 'Net Savings / 100k',
            value: `${netSaved >= 0 ? '+' : '-'}$${Math.abs(netSaved).toLocaleString()}`,
            detail: `vs. $${noModelLoss.toLocaleString()} unguarded`,
            status: netSaved > noModelLoss * 0.45 ? 'optimal' : netSaved > 0 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Fraud Recall',
            value: `${(recall * 100).toFixed(1)}%`,
            detail: `${tp} caught / ${fn} missed`,
            status: recall >= 0.72 ? 'optimal' : recall >= 0.45 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Alert Precision',
            value: `${(precision * 100).toFixed(1)}%`,
            detail: `${fp.toLocaleString()} false blocks`,
            status: precision >= 0.25 ? 'optimal' : precision >= 0.1 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Calibration ECE',
            value: ece.toFixed(3),
            detail: calibrated ? 'Isotonic Calibrated' : 'Raw Uncalibrated',
            status: calibrated ? 'optimal' : 'breaking'
          }
        ],
        chartTitle: 'Live TreeSHAP Feature Attribution Waterfall (Sample Blocked Transaction)',
        chartBars: [
          { label: '1h Txn Velocity (+0.34)', value: 85, displayValue: '+0.340', tone: 'danger' },
          { label: 'New Device Hash (+0.21)', value: 53, displayValue: '+0.210', tone: 'warning' },
          { label: 'Geo-IP Mismatch (+0.14)', value: 35, displayValue: '+0.140', tone: 'warning' },
          { label: 'Account Age > 3y (−0.09)', value: 23, displayValue: '−0.090', tone: 'positive' }
        ]
      }
    },
    sandboxTitle: 'Live Sandbox: Cost Threshold Sweep + ECE Calibration + SHAP Verification',
    sandboxChallenge:
      'Run the fraud threshold optimizer below. It sweeps candidate cutoffs to minimize expected dollar loss, computes Expected Calibration Error (ECE), and verifies the SHAP local accuracy axiom (`base + sum(phi) === prediction`).',
    sandboxHint: 'Try changing `FN_COST` from 500 to 100 and watch the optimal threshold automatically shift upward!',
    executableCode: `// Serial Module 03 — Cost-Aware Threshold Optimizer, Calibration ECE & SHAP Axiom
const FN_COST = 500; // Cost of 1 missed fraud ($)
const FP_COST = 20;  // Cost of 1 false block ($)

// Scored validation transactions: { prob, actualFraud }
const scored = [
  { p: 0.02, y: 0 }, { p: 0.04, y: 0 }, { p: 0.07, y: 0 }, { p: 0.09, y: 0 },
  { p: 0.12, y: 0 }, { p: 0.16, y: 1 }, { p: 0.24, y: 0 }, { p: 0.31, y: 1 },
  { p: 0.44, y: 0 }, { p: 0.58, y: 1 }, { p: 0.72, y: 1 }, { p: 0.89, y: 1 }
];

// 1. Sweep thresholds to minimize dollar loss
let bestThr = 0.5, bestLoss = Infinity;
for (let thr = 0.05; thr <= 0.85; thr += 0.05) {
  let loss = 0;
  for (const row of scored) {
    const pred = row.p >= thr ? 1 : 0;
    if (pred === 1 && row.y === 0) loss += FP_COST;
    if (pred === 0 && row.y === 1) loss += FN_COST;
  }
  if (loss < bestLoss) { bestLoss = loss; bestThr = Number(thr.toFixed(2)); }
}

// 2. Compute Brier Score (proper calibration metric: lower is better)
const brier = scored.reduce((s, r) => s + Math.pow(r.p - r.y, 2), 0) / scored.length;

// 3. Verify SHAP Local Accuracy Axiom: baseValue + sum(shapValues) === modelPred
const baseValue = 0.08;
const shapValues = { velocity_1h: 0.34, new_device: 0.22, geo_mismatch: 0.14, tenure_3y: -0.06 };
const modelPred = 0.72;
const shapSum = Number((baseValue + Object.values(shapValues).reduce((a, b) => a + b, 0)).toFixed(4));

console.log("[Cost Optimizer] Optimal threshold =", bestThr, "| Min Expected Loss = $" + bestLoss);
console.log("[Calibration] Brier Score =", brier.toFixed(4));
console.log("[TreeSHAP Audit] Base(" + baseValue + ") + Sum(phi) =", shapSum, "vs Pred =", modelPred);

assert(bestThr < 0.50, "Cost-aware threshold (" + bestThr + ") beats naive 0.50 cutoff under asymmetric FN/FP costs");
assert(brier < 0.15, "Probabilities are reasonably calibrated (Brier=" + brier.toFixed(3) + " < 0.15)");
assert(Math.abs(shapSum - modelPred) < 1e-6, "SHAP local accuracy axiom holds exactly (sum = prediction)");

emitMetric("Optimal Cutoff", bestThr.toFixed(2), "Min $ loss", "optimal");
emitMetric("Min Validation Loss", "$" + bestLoss, "vs 0.50 cutoff", "optimal");
emitMetric("Brier Score", brier.toFixed(3), "Calibration", brier < 0.15 ? "optimal" : "tradeoff");
emitMetric("SHAP Additivity", shapSum.toFixed(2), "Exact match", "optimal");

emitArtifact("Threshold & SHAP Report", {
  optimal_threshold: bestThr,
  min_dollar_loss: bestLoss,
  brier_score: Number(brier.toFixed(4)),
  shap_breakdown: { base: baseValue, ...shapValues, reconstructed_prob: shapSum }
});`,
    productionBlueprintLabel: 'Python (XGBoost + Calibration + SHAP)',
    productionBlueprint: `import shap
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import average_precision_score, brier_score_loss

# 1. Train GBDT & wrap with held-out Isotonic Calibration
base_clf = XGBClassifier(n_estimators=300, max_depth=5, scale_pos_weight=20)
cal_clf = CalibratedClassifierCV(base_clf, method="isotonic", cv=5)
cal_clf.fit(X_train, y_train)

probs = cal_clf.predict_proba(X_val)[:, 1]
print("PR-AUC:", average_precision_score(y_val, probs))
print("Brier:", brier_score_loss(y_val, probs))

# 2. Cost-optimal decision cutoff: t* = FP / (FP + FN)
t_star = 20 / (20 + 500)
alerts = (probs >= t_star).astype(int)

# 3. Exact TreeSHAP attributions for audit logs
explainer = shap.TreeExplainer(cal_clf.calibrated_classifiers_[0].estimator)
shap_vals = explainer.shap_values(X_val[:50])`,
    mcqs: [
      {
        id: 'shap-q1',
        question: 'Your fraud dataset has 0.2% fraud. Model A achieves 99.8% accuracy by predicting "legit" on every row. Which metric properly evaluates rare-event ranking?',
        options: [
          'Standard Accuracy',
          'Precision-Recall AUC (PR-AUC / Average Precision) paired with cost-weighted recall',
          'R-squared (R²)',
          'Mean Absolute Error on class labels'
        ],
        correctIndex: 1,
        explanation: 'ROC-AUC and Accuracy are dominated by the massive True Negative pool on 0.2% rare events. PR-AUC focuses directly on how cleanly positives are ranked above false positives.'
      },
      {
        id: 'shap-q2',
        question: 'Why must target encoding of a high-cardinality column (e.g., zip_code or merchant_id) be computed out-of-fold?',
        options: [
          'To make the DataFrame fit in GPU VRAM',
          'Computing target mean on the full dataset leaks the row’s own label into its feature, causing severe overfitting',
          'Out-of-fold encoding eliminates the need for a test set',
          'XGBoost rejects numeric columns without smoothing'
        ],
        correctIndex: 1,
        explanation: 'If a rare category has 1 row and its label is 1, naive target encoding sets its feature to 1.0—memorizing the target directly and collapsing on unseen test rows.'
      }
    ]
  },

  // =========================================================================
  // MODULE 04 — ANALYTICAL SQL, LAKEHOUSE (ICEBERG/PARQUET) & DISTRIBUTED COMPUTE
  // =========================================================================
  {
    id: 'de-lakehouse-sql-spark',
    chapterNumber: 4,
    role: 'Senior Data Engineer',
    title: 'Analytical SQL, Lakehouse (Parquet/Iceberg) & Spark Skew',
    subtitle: 'Window functions, Medallion layers, partition pruning, small-file compaction, and skew salting',
    estimatedMinutes: 30,
    prerequisites: 'Relational tables & Python DataFrames',
    plainEnglish:
      'Pandas breaks around 5–10 GB of RAM. Modern Data Engineering stores petabytes cheaply on object storage (S3/GCS) in columnar Parquet files managed by open table formats like Apache Iceberg or Delta Lake (giving ACID transactions, time travel, and partition pruning). Queries run 10×–50× faster when files are compacted (~256 MB each), partitioned by date, Z-ordered on filter keys, and salted to avoid Spark shuffle skew.',
    realWorldAnalogy:
      'Searching a library where 10,000 books are sorted by year and subject with an index card catalog (compacted partitioned Iceberg) takes seconds—versus opening 500,000 loose sticky notes scattered across the floor (the Small-File Problem).',
    keyConcepts: [
      'Analytical SQL Window Functions (LAG, LEAD, QUALIFY, Rolling Frames)',
      'Medallion Architecture (Bronze Raw → Silver Clean → Gold Star Schema / SCD2)',
      'Columnar Parquet Compression + Predicate Pushdown',
      'Apache Iceberg / Delta Lake ACID Snapshots & Small-File Compaction',
      'DuckDB/Polars (Single-Node) vs. Spark/Ray Data (Distributed + Skew Salting)'
    ],
    withBestPractice:
      'Store Silver/Gold in compacted 256 MB Iceberg Parquet files with partition pruning and Z-ordering; use DuckDB/Polars under 100 GB and salted Spark/Ray joins at TB+ scale.',
    withoutBestPractice:
      'Dumping millions of tiny 50 KB JSON/Parquet files triggers catastrophic S3 metadata latency, full-table scans costing 20× more, and Spark OOM crashes from skewed join keys.',
    mermaidDfd: `flowchart LR
  SRC["Raw Event Drops (JSON/CSV)"] --> BRZ["Bronze Layer (Append-Only Raw)"]
  BRZ --> SLV["Silver Layer (Iceberg ACID, Dedup, Typed)"]
  SLV --> COMP["Compaction (256MB Parquet) & Z-Order"]
  COMP --> GLD["Gold Layer (Star Schema + SCD Type 2)"]
  GLD --> ENG{"Compute Router"}
  ENG -->|< 100GB| DUCK["DuckDB / Polars (Vectorized Single-Node)"]
  ENG -->|TB+ Scale| SPK["Apache Spark / Ray Data (Salted Shuffles)"]`,
    dfdNodeLabels: {
      SRC: 'Raw Drops',
      BRZ: 'Bronze Raw',
      SLV: 'Silver Iceberg',
      COMP: 'Compaction & Z-Order',
      GLD: 'Gold Star Schema',
      ENG: 'Compute Router',
      DUCK: 'DuckDB / Polars',
      SPK: 'Spark / Ray'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'BRZ',
        title: 'Immutable Bronze Landing',
        description: 'Persist raw payloads verbatim with ingest_ts and source_file so any downstream bug can be replayed cleanly.',
        payload: { layer: 'bronze', format: 'raw_parquet', rows: 42000000, mutable: false }
      },
      {
        step: 2,
        nodeId: 'SLV',
        title: 'Silver Iceberg ACID Merge & Deduplication',
        description: 'Enforce schema types, drop duplicates via SQL QUALIFY ROW_NUMBER() = 1, and commit atomically via Iceberg snapshot.',
        payload: { snapshot_id: 88291044, deduped_rows: 41890120, acid_isolated: true }
      },
      {
        step: 3,
        nodeId: 'COMP',
        title: 'Bin-Pack Compaction & Partition Pruning',
        description: 'Merge 48,000 tiny 2 MB files into 375 optimal 256 MB Parquet files with min/max column statistics.',
        payload: { files_before: 48000, files_after: 375, metadata_open_ms_saved: '94%' }
      },
      {
        step: 4,
        nodeId: 'GLD',
        title: 'Gold Dimensional Star Schema (SCD Type 2)',
        description: 'Publish analytics-ready facts and slowly changing dimensions with effective_from / effective_to history.',
        payload: { table: 'gold.dim_customer_scd2', active_rows: 1240000, historical_versions: 3890000 }
      }
    ],
    simTitle: 'Lakehouse Query Scan, Small-File & Partition Pruning Simulator',
    simSubtitle: 'Simulate a 50 TB analytics table to see how file size, partition pruning, and columnar Iceberg layout change latency and cloud warehouse cost.',
    simControls: [
      { id: 'tableTb', label: 'Total Table Volume', type: 'slider', min: 1, max: 100, step: 1, unit: 'TB', defaultValue: 20 },
      { id: 'avgFileMb', label: 'Average Parquet File Size', type: 'slider', min: 1, max: 512, step: 5, unit: 'MB', defaultValue: 256 },
      { id: 'prunePct', label: 'Partition + Column Pruning Eliminated', type: 'slider', min: 0, max: 98, step: 2, unit: '%', defaultValue: 92 },
      { id: 'columnarIceberg', label: 'Use Compacted Columnar Iceberg (vs. Raw JSON)', type: 'toggle', defaultValue: true }
    ],
    computeSim: vals => {
      const tableTb = num(vals.tableTb, 20)
      const fileMb = Math.max(1, num(vals.avgFileMb, 256))
      const prunePct = num(vals.prunePct, 92)
      const iceberg = bool(vals.columnarIceberg, true)

      const effectivePrune = iceberg ? prunePct / 100 : 0.05
      const compressionFactor = iceberg ? 0.25 : 1.0 // Parquet ~4x smaller than JSON
      const storedGb = tableTb * 1024 * compressionFactor
      const scannedGb = Math.max(0.5, Number((storedGb * (1 - effectivePrune)).toFixed(1)))
      const fileCountScanned = Math.max(1, Math.ceil((scannedGb * 1024) / fileMb))

      // Small file overhead: each S3 GET + Parquet footer read adds ~3.5ms across parallel workers
      const smallFilePenaltySec = Number(((fileCountScanned * 0.0035) / 16).toFixed(2))
      const ioScanSec = Number((scannedGb / 18).toFixed(2))
      const totalLatencySec = Number((smallFilePenaltySec + ioScanSec).toFixed(2))
      // Cloud serverless scan pricing ~$5 / TB scanned
      const queryCostUsd = Number(((scannedGb / 1024) * 5.0).toFixed(3))
      const monthlyCostUsd = Math.round(queryCostUsd * 1500) // 1,500 queries/month

      const health: DsDeSimResult['health'] =
        fileMb < 16 || !iceberg || totalLatencySec > 45
          ? 'breaking'
          : totalLatencySec > 12 || fileMb < 64
          ? 'tradeoff'
          : 'optimal'

      return {
        health,
        headline:
          !iceberg
            ? `Full Raw JSON Scan: ${scannedGb.toLocaleString()} GB scanned (${totalLatencySec}s, $${monthlyCostUsd.toLocaleString()}/mo)`
            : fileMb < 16
            ? `Small-File Problem Detected: ${fileCountScanned.toLocaleString()} tiny ${fileMb} MB files stall S3 metadata I/O`
            : `Optimized Iceberg Lakehouse: Scanned only ${scannedGb} GB in ${totalLatencySec}s ($${queryCostUsd}/query)`,
        explanation: `Columnar Parquet compression (4×) + ${Math.round(effectivePrune * 100)}% Iceberg partition/min-max pruning shrinks a ${tableTb} TB table down to ${scannedGb} GB scanned. Target 128–512 MB file compaction to eliminate S3 file-open overhead.`,
        metrics: [
          {
            label: 'Data Scanned',
            value: `${scannedGb.toLocaleString()} GB`,
            detail: `of ${(tableTb * 1024).toLocaleString()} GB logical`,
            status: scannedGb < 300 ? 'optimal' : scannedGb < 2000 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Files Opened',
            value: fileCountScanned.toLocaleString(),
            detail: `${fileMb} MB avg file`,
            status: fileCountScanned < 2000 ? 'optimal' : fileCountScanned < 15000 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Query Latency',
            value: `${totalLatencySec} s`,
            detail: `${smallFilePenaltySec}s metadata overhead`,
            status: totalLatencySec <= 10 ? 'optimal' : totalLatencySec <= 35 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Est. Monthly Scan Cost',
            value: `$${monthlyCostUsd.toLocaleString()}`,
            detail: 'at 1,500 queries / mo',
            status: monthlyCostUsd < 1500 ? 'optimal' : monthlyCostUsd < 8000 ? 'tradeoff' : 'breaking'
          }
        ],
        chartTitle: 'Scan & Storage Reduction Breakdown (Lower Is Faster & Cheaper)',
        chartBars: [
          { label: 'Raw Logical Volume', value: 100, displayValue: `${(tableTb * 1024).toLocaleString()} GB`, tone: 'danger' },
          { label: 'Parquet Stored Size', value: Math.round(compressionFactor * 100), displayValue: `${Math.round(storedGb).toLocaleString()} GB`, tone: 'warning' },
          { label: 'Actual Pruned Scan', value: Math.max(3, Math.round((scannedGb / (tableTb * 1024)) * 100)), displayValue: `${scannedGb} GB`, tone: iceberg ? 'positive' : 'danger' },
          { label: 'Small-File Penalty Share', value: Math.min(100, Math.round((smallFilePenaltySec / Math.max(0.1, totalLatencySec)) * 100)), displayValue: `${Math.round((smallFilePenaltySec / Math.max(0.1, totalLatencySec)) * 100)}% of latency`, tone: fileMb < 32 ? 'danger' : 'primary' }
        ]
      }
    },
    sandboxTitle: 'Live Sandbox: SQL Window Deduplication + Spark Skew Salting',
    sandboxChallenge:
      'Run the data engineering pipeline below. It executes an analytical window `QUALIFY ROW_NUMBER() = 1` deduplication + rolling 3-day average, and compares an **un-salted skewed Spark join** against a **salted join** across 4 partitions!',
    sandboxHint: 'Change `SALT_BUCKETS = 1` to watch Partition 0 choke with 85% of all rows (classic Spark straggler/OOM skew).',
    executableCode: `// Serial Module 04 — SQL Window Dedup + Spark Join Skew Salting Simulator
const SALT_BUCKETS = 4; // Set to 1 to inject catastrophic Spark data skew!

// 1. Bronze events with duplicate retry records
const bronzeOrders = [
  { order_id: "o1", user: "u_hot", day: 1, amt: 120, ingest_ts: 100 },
  { order_id: "o1", user: "u_hot", day: 1, amt: 120, ingest_ts: 105 }, // duplicate
  { order_id: "o2", user: "u_hot", day: 2, amt: 180, ingest_ts: 200 },
  { order_id: "o3", user: "u_hot", day: 3, amt: 240, ingest_ts: 300 },
  { order_id: "o4", user: "u_b",   day: 3, amt: 90,  ingest_ts: 310 }
];

// Analytical SQL: QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1
const latestByOrder = new Map();
for (const row of bronzeOrders) {
  const prev = latestByOrder.get(row.order_id);
  if (!prev || row.ingest_ts > prev.ingest_ts) latestByOrder.set(row.order_id, row);
}
const silverOrders = [...latestByOrder.values()];

// 2. Simulate Spark Shuffle across 4 executors (80% of traffic belongs to 1 whale tenant "u_hot")
const events = Array.from({ length: 1000 }, (_, i) => ({
  tenant: i < 800 ? "u_hot" : "u_" + (i % 10),
  salt: i % Math.max(1, SALT_BUCKETS)
}));

const partitions = [0, 0, 0, 0];
for (const ev of events) {
  const key = SALT_BUCKETS > 1 ? ev.tenant + "_" + ev.salt : ev.tenant;
  let hash = 0;
  for (let c = 0; c < key.length; c++) hash = (hash * 31 + key.charCodeAt(c)) >>> 0;
  partitions[hash % 4]++;
}

const maxPartition = Math.max(...partitions);
const avgPartition = events.length / 4;
const skewRatio = Number((maxPartition / avgPartition).toFixed(2));

console.log("[Silver Dedup] Bronze rows:", bronzeOrders.length, "=> Silver unique orders:", silverOrders.length);
console.log("[Spark Shuffle] Partition loads:", JSON.stringify(partitions), "| Skew Ratio (Max/Avg) =", skewRatio + "x");

assert(silverOrders.length === 4, "Bronze-to-Silver QUALIFY deduplication removed exact duplicate order o1");
assert(skewRatio < 1.6, "Salted Spark partitions are balanced (Skew=" + skewRatio + "x < 1.6x)");

emitMetric("Silver Unique Rows", String(silverOrders.length), "1 dup dropped", "optimal");
emitMetric("Max Executor Load", String(maxPartition), "out of 1,000 rows", maxPartition < 400 ? "optimal" : "breaking");
emitMetric("Spark Skew Ratio", skewRatio + "x", "Max / Avg", skewRatio < 1.6 ? "optimal" : "breaking");
emitMetric("Salt Buckets", String(SALT_BUCKETS), "Key spread", SALT_BUCKETS >= 4 ? "optimal" : "tradeoff");

emitArtifact("Medallion & Shuffle Profile", {
  silver_orders: silverOrders,
  executor_row_distribution: partitions,
  skew_ratio: skewRatio
});`,
    productionBlueprintLabel: 'SQL (DuckDB / Iceberg) + PySpark Salting',
    productionBlueprint: `-- 1. Silver Deduplication & Rolling 7-Day Window in DuckDB / Snowflake / BigQuery
WITH deduped AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) AS rn
  FROM bronze.orders
)
SELECT
  user_id,
  order_date,
  amount_usd,
  AVG(amount_usd) OVER (
    PARTITION BY user_id
    ORDER BY order_date
    RANGE BETWEEN INTERVAL 6 DAYS PRECEDING AND CURRENT ROW
  ) AS rolling_7d_avg_usd
FROM deduped
WHERE rn = 1;

-- 2. Iceberg Table Maintenance (Eliminate Small-File Problem)
CALL catalog.system.rewrite_data_files(
  table => 'silver.orders',
  strategy => 'sort',
  sort_order => 'zorder(tenant_id, order_date)',
  options => map('target-file-size-bytes', '268435456') -- 256 MB
);`,
    mcqs: [
      {
        id: 'de-lake-q1',
        question: 'A Spark job reads 500 GB of Parquet from S3 and spends 90% of its runtime stuck on 1 single task while 199 other tasks finished in 12 seconds. What is the root cause and fix?',
        options: [
          'The S3 bucket is out of storage; move to CSV',
          'Data Skew on a hot join/group key; fix with AQE skew join handling or key salting (0..K) / broadcast join',
          'Too few SQL CTEs; add more subqueries',
          'Disable Parquet compression'
        ],
        correctIndex: 1,
        explanation: 'A single whale key (e.g., NULL or a giant enterprise tenant) hashes to one Spark partition. Salting the hot key across K buckets or broadcasting the smaller dimension table eliminates the straggler.'
      },
      {
        id: 'de-lake-q2',
        question: 'Why does writing 100,000 tiny 100 KB Parquet files every hour into a Data Lake destroy analytical query performance?',
        options: [
          'Parquet cannot compress files under 1 MB',
          'Object-store list/open/footer-read metadata overhead dominates execution time; scheduled compaction into 128–512 MB files fixes it',
          'Iceberg refuses to query more than 1,000 files',
          'Tiny files break SQL window functions'
        ],
        correctIndex: 1,
        explanation: 'Each tiny file requires an object-store GET request and footer parse, turning seconds of columnar I/O into minutes of metadata stalls.'
      }
    ]
  },

  // =========================================================================
  // MODULE 05 — STREAMING CDC, WATERMARKS & POINT-IN-TIME FEATURE STORES
  // =========================================================================
  {
    id: 'de-streaming-cdc-feast',
    chapterNumber: 5,
    role: 'Senior Data Engineer',
    title: 'Streaming CDC, Event-Time Watermarks & Point-in-Time Feature Stores',
    subtitle: 'Debezium WAL CDC, Kafka partitions, late-arriving watermarks, and ASOF joins',
    estimatedMinutes: 28,
    prerequisites: 'Module 04 (Lakehouse & SQL Windows)',
    plainEnglish:
      'Batch nightly jobs leave ML fraud and recommendation features 24 hours stale. Real-time architectures capture database writes from the Write-Ahead Log (Debezium CDC), stream them through Kafka, and aggregate windows using Event-Time Watermarks (tolerating delayed mobile packets without holding state forever). For ML training, offline feature stores perform Point-in-Time (ASOF) joins so every historical training row sees ONLY the feature values known at that exact second—eliminating training-serving skew.',
    realWorldAnalogy:
      'A stock trader’s backtest: if your backtest joins Monday’s trade with Friday’s closing price (naive latest-value join), you invented a time machine. An ASOF join looks up the exact ticker price on the screen at 10:03:12 AM Monday.',
    keyConcepts: [
      'Change Data Capture (CDC / Debezium WAL) vs. Polling',
      'Event Time vs. Processing Time & Watermark Delay',
      'Tumbling, Sliding & Session Stream Windows',
      'Offline (Iceberg) + Online (Redis/Dynamo) Dual Feature Store',
      'Point-in-Time (ASOF) Join Preventing Temporal Feature Leakage'
    ],
    withBestPractice:
      'Set watermarks to P99 network delay + route ultra-late events to a side-output DLQ, and strictly generate ML training sets via ASOF point-in-time joins.',
    withoutBestPractice:
      'Naive joins pull future user attributes into historical training rows (massive offline-to-online AUC drop), while zero-watermark streams silently drop out-of-order mobile events.',
    mermaidDfd: `flowchart LR
  DB["Production OLTP DB (WAL Log)"] --> CDC["Debezium CDC Connector"]
  CDC --> KFK["Kafka Partitioned Topic (key = user_id)"]
  KFK --> FLK["Stream Engine (Event-Time Watermark + Window)"]
  FLK --> ONL["Online Feature Store (Redis < 5ms)"]
  FLK --> OFF["Offline Feature History (Iceberg Snapshots)"]
  OFF --> ASOF["Point-in-Time ASOF Join (Zero Leakage Training Set)"]`,
    dfdNodeLabels: {
      DB: 'OLTP WAL',
      CDC: 'Debezium CDC',
      KFK: 'Kafka Partitions',
      FLK: 'Watermark Processor',
      ONL: 'Online Redis',
      OFF: 'Offline Iceberg',
      ASOF: 'ASOF Training Join'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'CDC',
        title: 'Log-Based Change Data Capture',
        description: 'Read Postgres/MySQL Write-Ahead Log directly—zero polling load on OLTP and captures hard deletes (tombstones).',
        payload: { op: 'UPDATE', table: 'accounts', user_id: 'u_77', balance: 420.5, lsn: '0/1A8F420' }
      },
      {
        step: 2,
        nodeId: 'FLK',
        title: 'Event-Time Watermark Gate',
        description: 'Advance watermark = max_event_time - grace_delay. Events older than watermark go to late-data side output.',
        payload: { max_event_ts: '10:05:30', grace_sec: 15, watermark: '10:05:15', late_dropped_pct: 0.4 }
      },
      {
        step: 3,
        nodeId: 'ONL',
        title: 'Dual Sink: Online Low-Latency + Offline History',
        description: 'Latest feature vector updates Redis (<5ms serving) while every timestamped change appends to Iceberg.',
        payload: { redis_key: 'feat:u_77', p99_ms: 2.8, iceberg_appended: true }
      },
      {
        step: 4,
        nodeId: 'ASOF',
        title: 'Point-in-Time ASOF Historical Join',
        description: 'For each label at t_label, fetch the latest feature row where t_feature <= t_label (never t_feature > t_label).',
        payload: { label_ts: '10:00:00', matched_feat_ts: '09:58:12', future_row_ignored: '10:04:00', skew: '0.0%' }
      }
    ],
    simTitle: 'Streaming Watermark & Point-in-Time Feature Store Simulator',
    simSubtitle: 'Balance watermark grace delay against P99 network jitter, and toggle strict ASOF joins to see late-data drops and training-serving skew.',
    simControls: [
      { id: 'watermarkSec', label: 'Watermark Grace Delay', type: 'slider', min: 0, max: 60, step: 2, unit: 'sec', defaultValue: 16 },
      { id: 'jitterP99Sec', label: 'Mobile/Network P99 Event Delay', type: 'slider', min: 2, max: 50, step: 2, unit: 'sec', defaultValue: 14 },
      { id: 'eventsPerSec', label: 'CDC Stream Throughput', type: 'slider', min: 1000, max: 50000, step: 1000, unit: 'ev/s', defaultValue: 12000 },
      { id: 'useAsofJoin', label: 'Enforce Strict Point-in-Time (ASOF) Training Join', type: 'toggle', defaultValue: true }
    ],
    computeSim: vals => {
      const wm = num(vals.watermarkSec, 16)
      const jitter = num(vals.jitterP99Sec, 14)
      const eps = num(vals.eventsPerSec, 12000)
      const useAsof = bool(vals.useAsofJoin, true)

      const ratio = wm / Math.max(1, jitter)
      const lateDropPct =
        wm === 0
          ? 24.0
          : ratio >= 1.2
          ? 0.3
          : ratio >= 0.9
          ? 1.4
          : Number(Math.min(35, Math.max(2.5, (1 - ratio) * 28)).toFixed(1))

      const windowLatencySec = wm + 5 // +5s micro-window emit overhead
      const stateRamGb = Number(((eps * Math.max(2, wm) * 0.45) / (1024 * 1024) * 1.4).toFixed(2))
      const trainServeSkewDrop = useAsof ? 0.004 : 0.145 // AUC drop in production

      const health: DsDeSimResult['health'] =
        !useAsof || lateDropPct > 8 ? 'breaking' : lateDropPct > 2 || windowLatencySec > 45 ? 'tradeoff' : 'optimal'

      return {
        health,
        headline: !useAsof
          ? `Training-Serving Skew Alert: Naive Join causes −${(trainServeSkewDrop * 100).toFixed(1)} pts AUC crash in production`
          : lateDropPct > 5
          ? `Watermark Too Tight (${wm}s < ${jitter}s P99 Jitter): Dropping ${lateDropPct}% of delayed real events`
          : `Healthy CDC Stream & Feature Store: ${lateDropPct}% late drop, ${windowLatencySec}s freshness, zero ASOF leakage`,
        explanation: `Setting watermark slightly above P99 network jitter (${jitter}s) captures ~99% of out-of-order events while bounding window state RAM to ${stateRamGb} GB. Strict ASOF joins guarantee offline training matches live Redis serving.`,
        metrics: [
          {
            label: 'Late Events Dropped',
            value: `${lateDropPct}%`,
            detail: `WM ${wm}s vs P99 ${jitter}s`,
            status: lateDropPct <= 1.5 ? 'optimal' : lateDropPct <= 6 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Window Result Freshness',
            value: `${windowLatencySec} s`,
            detail: 'End-to-end emit lag',
            status: windowLatencySec <= 25 ? 'optimal' : windowLatencySec <= 45 ? 'tradeoff' : 'breaking'
          },
          {
            label: 'Flink State Store RAM',
            value: `${stateRamGb} GB`,
            detail: `at ${eps.toLocaleString()} ev/s`,
            status: stateRamGb < 0.8 ? 'optimal' : 'tradeoff'
          },
          {
            label: 'Prod AUC Skew Drop',
            value: `−${(trainServeSkewDrop * 100).toFixed(1)} pts`,
            detail: useAsof ? 'ASOF Point-in-Time' : 'Leaked Latest Join',
            status: useAsof ? 'optimal' : 'breaking'
          }
        ],
        chartTitle: 'Latency vs. Completeness & Feature Integrity',
        chartBars: [
          { label: 'Event Completeness Captured', value: Math.max(5, Math.round(100 - lateDropPct)), displayValue: `${(100 - lateDropPct).toFixed(1)}%`, tone: lateDropPct <= 2 ? 'positive' : 'danger' },
          { label: 'Watermark Buffer Coverage', value: Math.min(100, Math.round((wm / Math.max(1, jitter)) * 80)), displayValue: `${wm}s / ${jitter}s P99`, tone: wm >= jitter ? 'primary' : 'warning' },
          { label: 'Offline/Online Parity', value: useAsof ? 99 : 42, displayValue: useAsof ? '99.6% Parity' : '42% (Skewed!)', tone: useAsof ? 'positive' : 'danger' }
        ]
      }
    },
    sandboxTitle: 'Live Sandbox: Point-in-Time ASOF Join & Watermark Late-Event Filter',
    sandboxChallenge:
      'Execute the real Point-in-Time `ASOF` join and Event-Time Watermark processor below. Flip `USE_ASOF_JOIN = false` to observe future credit-limit changes leaking into an earlier loan application!',
    sandboxHint: 'Set `WATERMARK_GRACE_SEC = 15` and `USE_ASOF_JOIN = true` to pass every production assertion.',
    executableCode: `// Serial Module 05 — Point-in-Time ASOF Feature Join & Streaming Watermark
const USE_ASOF_JOIN = true;     // Flip to false to inject temporal leakage!
const WATERMARK_GRACE_SEC = 15; // Try setting to 2 to watch delayed mobile events get dropped!

// 1. Historical Feature Store Changelog for user u_42
const featureHistory = [
  { user: "u_42", ts: 100, credit_score: 640 },
  { user: "u_42", ts: 200, credit_score: 710 },
  { user: "u_42", ts: 350, credit_score: 520 } // Happened AFTER loan application!
];

// Training label: loan applied at t = 250
const labelEvent = { user: "u_42", label_ts: 250, defaulted: 0 };

let joinedFeature;
if (USE_ASOF_JOIN) {
  // Strict ASOF: latest feature where ts <= label_ts
  const valid = featureHistory.filter(f => f.user === labelEvent.user && f.ts <= labelEvent.label_ts);
  joinedFeature = valid.sort((a, b) => b.ts - a.ts)[0];
} else {
  // BUG: Naive join grabs latest table snapshot (ts = 350 > label_ts = 250!)
  joinedFeature = featureHistory[featureHistory.length - 1];
}

// 2. Out-of-order Kafka Event Stream with Event-Time Watermark
const streamEvents = [
  { id: "e1", eventTs: 1000 },
  { id: "e2", eventTs: 1012 },
  { id: "e3", eventTs: 1020 }, // Max eventTs becomes 1020
  { id: "e4_delayed", eventTs: 1008 } // Arrived 12s late
];

let maxEventTs = 0;
let accepted = 0, dropped = 0;
for (const ev of streamEvents) {
  const watermark = maxEventTs - WATERMARK_GRACE_SEC;
  if (ev.eventTs < watermark) {
    dropped++;
  } else {
    accepted++;
    if (ev.eventTs > maxEventTs) maxEventTs = ev.eventTs;
  }
}

console.log("[ASOF Join] Label ts=" + labelEvent.label_ts + " matched feature ts=" + joinedFeature.ts + " (credit_score=" + joinedFeature.credit_score + ")");
console.log("[Watermark] Grace=" + WATERMARK_GRACE_SEC + "s | Accepted=" + accepted + " | Dropped Late=" + dropped);

assert(joinedFeature.ts <= labelEvent.label_ts, "No time-travel leakage: feature_ts (" + joinedFeature.ts + ") <= label_ts (" + labelEvent.label_ts + ")");
assert(joinedFeature.credit_score === 710, "Exact historical credit_score=710 recovered for t=250");
assert(dropped === 0, "Delayed 12s mobile event was safely accepted within watermark grace window");

emitMetric("Matched Feature TS", "t=" + joinedFeature.ts, "Label t=" + labelEvent.label_ts, joinedFeature.ts <= labelEvent.label_ts ? "optimal" : "breaking");
emitMetric("Credit Score Joined", String(joinedFeature.credit_score), USE_ASOF_JOIN ? "True Historical" : "Leaked Future", joinedFeature.credit_score === 710 ? "optimal" : "breaking");
emitMetric("Stream Events Kept", accepted + "/" + streamEvents.length, dropped + " dropped", dropped === 0 ? "optimal" : "breaking");
emitMetric("Watermark Grace", WATERMARK_GRACE_SEC + "s", "Out-of-order window", "optimal");

emitArtifact("Feature Store & Stream Audit", {
  asof_enabled: USE_ASOF_JOIN,
  joined_record: { ...labelEvent, ...joinedFeature },
  watermark_grace_sec: WATERMARK_GRACE_SEC,
  stream_accepted: accepted,
  stream_dropped: dropped
});`,
    productionBlueprintLabel: 'SQL (ASOF Join) + Flink Watermark SQL',
    productionBlueprint: `-- 1. Point-in-Time ASOF Join (DuckDB / Snowflake / Feast Offline Store)
SELECT
  l.user_id,
  l.label_ts,
  l.defaulted,
  f.credit_score,
  f.feature_ts
FROM ml.loan_labels l
ASOF JOIN feature_store.user_credit_history f
  ON l.user_id = f.user_id
 AND l.label_ts >= f.feature_ts;

-- 2. Apache Flink SQL Event-Time Watermark (15s Out-of-Order Tolerance)
CREATE TABLE cdc_transactions (
  user_id STRING,
  amount_usd DOUBLE,
  event_time TIMESTAMP(3),
  WATERMARK FOR event_time AS event_time - INTERVAL '15' SECOND
) WITH ('connector' = 'kafka', 'topic' = 'pg.public.txns');`,
    mcqs: [
      {
        id: 'de-cdc-q1',
        question: 'Why does Debezium log-based CDC beat running `SELECT * FROM orders WHERE updated_at > last_run` every 5 minutes?',
        options: [
          'SQL SELECT cannot read timestamps',
          'Log-based CDC avoids heavy OLTP read queries, captures hard DELETEs as tombstones, and preserves exact commit order with millisecond latency',
          'Debezium automatically trains an XGBoost model',
          'Polling is illegal in PostgreSQL'
        ],
        correctIndex: 1,
        explanation: 'Timestamp polling misses hard deletes, misses rapid multi-updates between polls, and places heavy index scan load on production transactional databases.'
      },
      {
        id: 'de-cdc-q2',
        question: 'A churn model scores 0.94 AUC offline but drops to 0.61 AUC on day 1 in production. You discover the training SQL joined `users.current_plan` instead of a point-in-time snapshot. What happened?',
        options: [
          'The Kafka topic had too many partitions',
          'Temporal feature leakage: users who churned later had their plan updated to "free/canceled", leaking the answer into historical training rows',
          'The watermark grace period was too long',
          'Redis memory was uncompacted'
        ],
        correctIndex: 1,
        explanation: 'Joining mutable current-state tables into historical training labels leaks post-outcome state changes. Always use an ASOF point-in-time join against versioned feature history.'
      }
    ]
  },

  // =========================================================================
  // MODULE 06 — DATA DRIFT, DATA CONTRACTS & LLM CORPUS ENGINEERING
  // =========================================================================
  {
    id: 'de-drift-llm-data',
    chapterNumber: 6,
    role: 'LLM Data Engineer',
    title: 'Data Drift (PSI), Data Contracts & LLM Corpus Engineering',
    subtitle: 'Population Stability Index, fail-closed contracts, MinHash LSH dedup, and CDC RAG sync',
    estimatedMinutes: 30,
    prerequisites: 'Modules 01–05',
    plainEnglish:
      'Models and LLMs silently rot when incoming data shifts or when training/RAG corpora are full of near-duplicate boilerplate and PII. Senior AI Data Engineers combine three shields: (1) Fail-closed Data Contracts at ingestion, (2) Statistical Drift monitors like Population Stability Index (PSI) alerting before accuracy collapses, and (3) Web-scale LLM data pipelines using MinHash LSH fuzzy deduplication + quality filters + CDC-driven incremental RAG index updates with GDPR tombstones.',
    realWorldAnalogy:
      'A restaurant kitchen: Data Contracts check deliveries at the back door so spoiled ingredients never enter; PSI Drift monitors notice when customer orders suddenly shift from hot soup to salads; MinHash LSH stops your cookbook from printing the same copied recipe 400 times.',
    keyConcepts: [
      'Population Stability Index (PSI: <0.10 Stable, 0.10–0.25 Monitor, >0.25 Action)',
      'Fail-Closed Data Contracts (Schema, Null-Rate, Domain Constraints)',
      'Exact + Fuzzy Deduplication (MinHash LSH Jaccard Similarity)',
      'LLM Quality / Perplexity Filtering & PII Redaction',
      'CDC-Driven Incremental RAG Vector Sync & Tombstone Deletes'
    ],
    withBestPractice:
      'Deduplicate pretraining & RAG corpora with MinHash LSH (30%–50% compute savings + lower memorization), enforce schema contracts in CI, and alert on PSI > 0.25.',
    withoutBestPractice:
      'Silent upstream schema changes inject NULLs into production features, duplicate web scrapes waste millions in GPU training FLOPs, and stale RAG vectors serve deleted/revoked policies.',
    mermaidDfd: `flowchart LR
  IN["Raw Web / Enterprise Docs & Features"] --> CON{"Fail-Closed Data Contract"}
  CON -->|Violation| DLQ["Quarantine DLQ + Pager Alert"]
  CON -->|Valid| PII["PII Redaction & Quality Filter"]
  PII --> LSH["MinHash LSH Fuzzy Deduplication"]
  LSH --> PSI["PSI / KS Distribution Drift Monitor"]
  PSI --> SINK["Clean LLM Corpus + Incremental CDC RAG Index"]`,
    dfdNodeLabels: {
      IN: 'Raw Corpus & Features',
      CON: 'Data Contract Gate',
      DLQ: 'Quarantine DLQ',
      PII: 'PII & Quality Filter',
      LSH: 'MinHash LSH Dedup',
      PSI: 'PSI Drift Monitor',
      SINK: 'LLM & RAG Sink'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'CON',
        title: 'Fail-Closed Schema & Domain Contract',
        description: 'Validate types, non-null rates, allowed enums, and freshness SLAs before rows touch downstream models.',
        payload: { contract: 'orders_v3', null_rate_pct: 0.02, schema_match: true, action: 'ADMIT' }
      },
      {
        step: 2,
        nodeId: 'LSH',
        title: 'MinHash LSH Fuzzy Deduplication',
        description: 'Convert documents to k-shingles, hash into MinHash signatures, and collapse near-duplicates (Jaccard >= 0.80).',
        payload: { raw_docs: 10000000, duplicates_removed: 3800000, gpu_compute_saved_pct: 38 }
      },
      {
        step: 3,
        nodeId: 'PSI',
        title: 'Population Stability Index (PSI) Drift Check',
        description: 'Compare live feature distribution bins against training baseline: PSI = Σ (Actual% - Expected%) * ln(Actual% / Expected%).',
        payload: { feature: 'avg_order_usd', psi: 0.072, status: 'STABLE (< 0.10)' }
      },
      {
        step: 4,
        nodeId: 'SINK',
        title: 'CDC-Driven Incremental RAG & Tombstones',
        description: 'Upsert only changed document chunks and hard-delete revoked/GDPR tombstones from vector & BM25 indexes.',
        payload: { upserted_chunks: 412, tombstones_purged: 19, index_lag_sec: 4.2 }
      }
    ],
    simTitle: 'PSI Distribution Drift & LLM MinHash Corpus Simulator',
    simSubtitle: 'Shift production data distribution and tune MinHash deduplication + quality filtering to inspect PSI drift severity and GPU training savings.',
    simControls: [
      { id: 'meanShiftSigma', label: 'Production Distribution Shift', type: 'slider', min: 0, max: 2.2, step: 0.1, unit: 'σ', defaultValue: 0.4 },
      { id: 'rawDupPct', label: 'Raw Corpus Near-Duplicate Rate', type: 'slider', min: 5, max: 65, step: 5, unit: '%', defaultValue: 35 },
      { id: 'qualityCutoff', label: 'Quality Classifier Strictness', type: 'slider', min: 0, max: 50, step: 5, unit: '% cut', defaultValue: 20 },
      { id: 'enableMinHash', label: 'Enable MinHash LSH Fuzzy Deduplication', type: 'toggle', defaultValue: true }
    ],
    computeSim: vals => {
      const shift = num(vals.meanShiftSigma, 0.4)
      const dupPct = num(vals.rawDupPct, 35)
      const qualCut = num(vals.qualityCutoff, 20)
      const useLsh = bool(vals.enableMinHash, true)

      // Compute true numeric PSI across 10 binned buckets of N(0,1) vs N(shift,1)
      let psi = 0
      const edges = [-3, -2.2, -1.5, -0.9, -0.4, 0, 0.4, 0.9, 1.5, 2.2, 3.5]
      const expectedBins: number[] = []
      const actualBins: number[] = []
      for (let i = 0; i < edges.length - 1; i++) {
        const mid = (edges[i] + edges[i + 1]) / 2
        const w = edges[i + 1] - edges[i]
        expectedBins.push(Math.max(0.001, normalPdf(mid, 0, 1) * w))
        actualBins.push(Math.max(0.001, normalPdf(mid, shift, 1) * w))
      }
      const sumE = expectedBins.reduce((a, b) => a + b, 0)
      const sumA = actualBins.reduce((a, b) => a + b, 0)
      for (let i = 0; i < expectedBins.length; i++) {
        const e = expectedBins[i] / sumE
        const a = actualBins[i] / sumA
        psi += (a - e) * Math.log(a / e)
      }
      psi = Number(psi.toFixed(3))

      const psiStatus: DsDeSimMetric['status'] = psi < 0.1 ? 'optimal' : psi < 0.25 ? 'tradeoff' : 'breaking'
      const dupRemoved = useLsh ? Math.round(dupPct * 0.92) : 0
      const retainedCleanPct = Math.max(15, Math.round((100 - dupRemoved) * (1 - qualCut / 100)))
      const gpuBudgetSavedPct = Math.round(100 - retainedCleanPct)
      const memorizationRisk = useLsh ? 'Low (Deduped)' : dupPct >= 30 ? 'High (Verbatim Leakage)' : 'Moderate'

      const health: DsDeSimResult['health'] =
        psi >= 0.25 || !useLsh ? 'breaking' : psi >= 0.1 ? 'tradeoff' : 'optimal'

      const curvePoints = Array.from({ length: 29 }, (_, idx) => {
        const x = -3.0 + idx * 0.25
        return {
          x: Number(x.toFixed(2)),
          yA: Number(normalPdf(x, 0, 1).toFixed(4)),
          yB: Number(normalPdf(x, shift, 1).toFixed(4))
        }
      })

      return {
        health,
        headline:
          psi >= 0.25
            ? `Major Distribution Drift (PSI = ${psi}): Trigger Retraining & Root-Cause Investigation`
            : !useLsh
            ? `Un-Deduplicated LLM Corpus: Wasting ~${dupPct}% GPU FLOPs on duplicate tokens`
            : `Drift Under Control (PSI = ${psi}) & Clean LLM Corpus (${gpuBudgetSavedPct}% Compute Saved)`,
        explanation: `PSI compares training baseline N(0,1) against live N(${shift.toFixed(1)},1). Meanwhile, MinHash LSH collapses ${dupRemoved}% near-duplicate docs before tokenization, cutting GPU cost and preventing verbatim PII/copyright memorization.`,
        metrics: [
          {
            label: 'Live PSI Drift Score',
            value: psi.toFixed(3),
            detail: psi < 0.1 ? 'Stable (<0.10)' : psi < 0.25 ? 'Monitor (0.10–0.25)' : 'Severe (>0.25)',
            status: psiStatus
          },
          {
            label: 'Clean Tokens Retained',
            value: `${retainedCleanPct}%`,
            detail: `${dupRemoved}% dups + ${qualCut}% low-quality cut`,
            status: useLsh ? 'optimal' : 'tradeoff'
          },
          {
            label: 'Pretraining FLOPs Saved',
            value: `${gpuBudgetSavedPct}%`,
            detail: 'Smaller, higher-signal epochs',
            status: useLsh ? 'optimal' : 'breaking'
          },
          {
            label: 'Memorization Risk',
            value: useLsh ? 'Low' : 'Elevated',
            detail: memorizationRisk,
            status: useLsh ? 'optimal' : 'breaking'
          }
        ],
        chartTitle: 'Baseline vs. Shifted Production Distribution (PSI) & Corpus Yield',
        chartBars: [
          { label: 'PSI Drift Level (0.25 = Alert)', value: Math.min(100, Math.round((psi / 0.4) * 100)), displayValue: `PSI ${psi.toFixed(3)}`, tone: psi >= 0.25 ? 'danger' : psi >= 0.1 ? 'warning' : 'positive' },
          { label: 'Duplicates Purged by LSH', value: dupRemoved, displayValue: `${dupRemoved}%`, tone: useLsh ? 'positive' : 'danger' },
          { label: 'Clean High-Signal Corpus', value: retainedCleanPct, displayValue: `${retainedCleanPct}%`, tone: 'primary' }
        ],
        curvePoints,
        curveLabelA: 'Training Baseline Distribution',
        curveLabelB: `Live Production (+${shift.toFixed(1)}σ)`
      }
    },
    sandboxTitle: 'Live Sandbox: PSI Drift Calculator + Jaccard Shingle Dedup + Data Contract',
    sandboxChallenge:
      'Run the full AI Data Quality Gate below. It computes exact Population Stability Index (PSI), performs 3-shingle Jaccard fuzzy deduplication on an LLM corpus, and enforces a fail-closed Data Contract!',
    sandboxHint: 'Change `liveBins` to `[0.04, 0.10, 0.18, 0.30, 0.38]` to watch the PSI drift alert trigger immediately.',
    executableCode: `// Serial Module 06 — PSI Statistical Drift + Fuzzy Shingle Dedup + Data Contract
// 1. Population Stability Index (PSI) across 5 quantile buckets
const baselineBins = [0.20, 0.20, 0.20, 0.20, 0.20];
const liveBins     = [0.18, 0.22, 0.21, 0.19, 0.20]; // Try shifting heavily to trigger PSI > 0.25!

let psi = 0;
for (let i = 0; i < baselineBins.length; i++) {
  const e = Math.max(1e-6, baselineBins[i]);
  const a = Math.max(1e-6, liveBins[i]);
  psi += (a - e) * Math.log(a / e);
}
psi = Number(psi.toFixed(4));
const driftSeverity = psi < 0.10 ? "STABLE" : psi < 0.25 ? "MONITOR" : "CRITICAL_DRIFT";

// 2. Fuzzy 3-Word Shingle Jaccard Deduplication (MinHash LSH foundation)
const corpus = [
  { id: "d1", text: "apache iceberg provides acid transactions and partition pruning on object storage" },
  { id: "d2", text: "apache iceberg provides acid transactions and partition pruning on cloud storage" }, // near-dup!
  { id: "d3", text: "cuped uses pre experiment covariates to reduce ab test variance cleanly" }
];

function shingles(str) {
  const w = str.toLowerCase().split(/\\s+/);
  const s = new Set();
  for (let i = 0; i <= w.length - 3; i++) s.add(w.slice(i, i + 3).join(" "));
  return s;
}
function jaccard(setA, setB) {
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  return inter / (setA.size + setB.size - inter);
}

const kept = [];
const droppedDups = [];
for (const doc of corpus) {
  const sh = shingles(doc.text);
  const isDup = kept.some(k => jaccard(k.sh, sh) >= 0.70);
  if (isDup) droppedDups.push(doc.id);
  else kept.push({ id: doc.id, sh });
}

// 3. Fail-Closed Schema Data Contract Gate
const batchSample = [
  { user_id: "u1", amount: 42.5, currency: "USD" },
  { user_id: "u2", amount: 18.0, currency: "EUR" }
];
const contractValid = batchSample.every(r => typeof r.user_id === "string" && r.amount > 0 && ["USD", "EUR"].includes(r.currency));

console.log("[PSI Drift] PSI =", psi, "| Severity =", driftSeverity);
console.log("[LLM Dedup] Kept =", kept.map(k => k.id).join(", "), "| Dropped Near-Dups =", droppedDups.join(", "));
console.log("[Data Contract] Validation =", contractValid ? "PASS" : "FAIL_CLOSED");

assert(psi < 0.25, "Production feature drift within acceptable PSI threshold (" + psi + " < 0.25)");
assert(droppedDups.includes("d2"), "Fuzzy shingle dedup caught near-duplicate document d2");
assert(contractValid, "Fail-closed Data Contract passed schema & domain checks");

emitMetric("PSI Drift Score", psi.toFixed(4), driftSeverity, psi < 0.1 ? "optimal" : psi < 0.25 ? "tradeoff" : "breaking");
emitMetric("Near-Dups Purged", String(droppedDups.length), "Jaccard >= 0.70", droppedDups.length > 0 ? "optimal" : "tradeoff");
emitMetric("Clean Docs Kept", kept.length + "/" + corpus.length, "Ready for index", "optimal");
emitMetric("Data Contract", contractValid ? "PASS" : "QUARANTINE", "Fail-closed", contractValid ? "optimal" : "breaking");

emitArtifact("AI Data Quality Gate Output", {
  psi_score: psi,
  drift_severity: driftSeverity,
  kept_doc_ids: kept.map(k => k.id),
  dropped_near_dups: droppedDups,
  contract_passed: contractValid
});`,
    productionBlueprintLabel: 'Python (MinHash LSH + PSI + Pydantic Contract)',
    productionBlueprint: `import numpy as np
from datasketch import MinHash, MinHashLSH
from pydantic import BaseModel, Field

# 1. Fail-Closed Ingestion Data Contract
class OrderEventContract(BaseModel):
    user_id: str = Field(min_length=2)
    amount_usd: float = Field(gt=0, lt=100_000)
    currency: str = Field(pattern="^(USD|EUR|GBP)$")

# 2. Web-Scale Fuzzy Deduplication via MinHash LSH (O(N) instead of O(N^2))
lsh = MinHashLSH(threshold=0.80, num_perm=128)
unique_docs = []
for doc_id, text in raw_corpus:
    m = MinHash(num_perm=128)
    tokens = text.lower().split()
    for i in range(max(1, len(tokens) - 4)):
        m.update(" ".join(tokens[i:i+5]).encode("utf8"))
    if not lsh.query(m):
        lsh.insert(doc_id, m)
        unique_docs.append((doc_id, text))

# 3. Population Stability Index (PSI) Drift Gate
def compute_psi(expected_pct: np.ndarray, actual_pct: np.ndarray) -> float:
    e = np.clip(expected_pct, 1e-6, 1.0)
    a = np.clip(actual_pct, 1e-6, 1.0)
    return float(np.sum((a - e) * np.log(a / e)))`,
    mcqs: [
      {
        id: 'drift-q1',
        question: 'Your automated production monitor reports a Population Stability Index (PSI) of 0.34 on the primary credit-utilization feature. What does this signify?',
        options: [
          'The model gained 34% accuracy',
          'Significant distribution shift (>0.25): inspect upstream schema/data bugs immediately and prepare model retraining',
          'Everything is normal; PSI alerts only start at 5.0',
          'Exact 34% duplicate rows in the database'
        ],
        correctIndex: 1,
        explanation: 'Standard industry PSI thresholds are <0.10 (no significant shift), 0.10–0.25 (moderate shift—investigate), and >0.25 (major population shift—retrain or fix broken upstream pipeline).'
      },
      {
        id: 'drift-q2',
        question: 'Why do frontier LLM teams use MinHash LSH instead of simple SHA-256 exact hashing to deduplicate web pretraining and RAG corpora?',
        options: [
          'SHA-256 is too slow for text',
          'Web pages often share 95% identical content with tiny timestamp/banner edits; MinHash LSH catches fuzzy near-duplicates in near-linear time',
          'MinHash encrypts PII automatically',
          'SHA-256 only works on images'
        ],
        correctIndex: 1,
        explanation: 'Exact hashing misses copies that differ by a single header date or navigation footer. MinHash LSH estimates Jaccard shingle similarity at scale without O(N²) pairwise comparisons.'
      }
    ]
  }
]
