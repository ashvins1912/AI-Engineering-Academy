export type ConsoleLine = {
  level: 'log' | 'warn' | 'error'
  text: string
  atMs: number
}

export type LabAssertion = {
  passed: boolean
  label: string
}

export type LabMetric = {
  label: string
  value: string
  unit?: string
  status?: 'optimal' | 'tradeoff' | 'breaking'
}

export type LabArtifact = {
  title: string
  data: unknown
}

export type SandboxRunResult = {
  ok: boolean
  durationMs: number
  timedOut: boolean
  errorMessage?: string
  logs: ConsoleLine[]
  assertions: LabAssertion[]
  metrics: LabMetric[]
  artifacts: LabArtifact[]
}

const TIMEOUT_MS = 2500

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (typeof arg === 'number' || typeof arg === 'boolean' || arg === null || arg === undefined) {
    return String(arg)
  }
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/**
 * Executes learner-edited JavaScript architectural lab code inside an isolated
 * Blob Web Worker with strict timeout enforcement and captured stdout, metrics,
 * structured artifacts, and architect invariant assertions.
 */
export function runInVirtualSandbox(
  code: string,
  env: Record<string, string | number | boolean>
): Promise<SandboxRunResult> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    return Promise.resolve(runInlineFallback(code, env))
  }

  return new Promise(resolve => {
    const workerSource = `
      self.onmessage = function(event) {
        const { code, env } = event.data;
        const start = performance.now();
        const logs = [];
        const assertions = [];
        const metrics = [];
        const artifacts = [];

        const fmt = (arg) => {
          if (typeof arg === 'string') return arg;
          if (typeof arg === 'number' || typeof arg === 'boolean' || arg === null || arg === undefined) return String(arg);
          try { return JSON.stringify(arg); } catch { return String(arg); }
        };

        const pushLog = (level, args) => {
          if (logs.length >= 160) return;
          logs.push({
            level,
            text: Array.from(args).map(fmt).join(' '),
            atMs: Number((performance.now() - start).toFixed(2))
          });
        };

        const sandboxConsole = {
          log: (...args) => pushLog('log', args),
          info: (...args) => pushLog('log', args),
          warn: (...args) => pushLog('warn', args),
          error: (...args) => pushLog('error', args)
        };

        const assert = (condition, label) => {
          const passed = Boolean(condition);
          assertions.push({ passed, label: String(label) });
          if (!passed) {
            pushLog('error', ['[ASSERT FAIL] ' + label]);
          }
        };

        const emitMetric = (label, value, unit, status) => {
          metrics.push({
            label: String(label),
            value: String(value),
            unit: unit ? String(unit) : undefined,
            status: status || 'optimal'
          });
        };

        const emitArtifact = (title, data) => {
          try {
            artifacts.push({ title: String(title), data: JSON.parse(JSON.stringify(data)) });
          } catch {
            artifacts.push({ title: String(title), data: String(data) });
          }
        };

        try {
          const runner = new Function('console', 'ENV', 'assert', 'emitMetric', 'emitArtifact', '"use strict";\\n' + code);
          runner(sandboxConsole, Object.freeze(Object.assign({}, env)), assert, emitMetric, emitArtifact);
          const durationMs = Number((performance.now() - start).toFixed(2));
          const allPassed = assertions.every(a => a.passed);
          self.postMessage({
            ok: allPassed,
            durationMs,
            timedOut: false,
            logs,
            assertions,
            metrics,
            artifacts
          });
        } catch (err) {
          const durationMs = Number((performance.now() - start).toFixed(2));
          const msg = err && err.message ? err.message : String(err);
          pushLog('error', ['RuntimeError: ' + msg]);
          self.postMessage({
            ok: false,
            durationMs,
            timedOut: false,
            errorMessage: msg,
            logs,
            assertions,
            metrics,
            artifacts
          });
        }
      };
    `

    const blob = new Blob([workerSource], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    let settled = false
    const worker = new Worker(workerUrl)

    const cleanup = () => {
      URL.revokeObjectURL(workerUrl)
      worker.terminate()
    }

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve({
        ok: false,
        durationMs: TIMEOUT_MS,
        timedOut: true,
        errorMessage: `Execution aborted after ${TIMEOUT_MS}ms timeout guard (check for infinite loops).`,
        logs: [
          {
            level: 'error',
            text: `TimeoutError: Sandbox terminated worker after ${TIMEOUT_MS}ms.`,
            atMs: TIMEOUT_MS
          }
        ],
        assertions: [],
        metrics: [],
        artifacts: []
      })
    }, TIMEOUT_MS)

    worker.onmessage = (event: MessageEvent<SandboxRunResult>) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cleanup()
      resolve(event.data)
    }

    worker.onerror = event => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      cleanup()
      resolve({
        ok: false,
        durationMs: 0,
        timedOut: false,
        errorMessage: event.message || 'Sandbox worker error.',
        logs: [{ level: 'error', text: event.message || 'Sandbox worker error.', atMs: 0 }],
        assertions: [],
        metrics: [],
        artifacts: []
      })
    }

    worker.postMessage({ code, env })
  })
}

function runInlineFallback(
  code: string,
  env: Record<string, string | number | boolean>
): SandboxRunResult {
  const start = performance.now()
  const logs: ConsoleLine[] = []
  const assertions: LabAssertion[] = []
  const metrics: LabMetric[] = []
  const artifacts: LabArtifact[] = []

  const pushLog = (level: 'log' | 'warn' | 'error', args: unknown[]) => {
    logs.push({
      level,
      text: args.map(formatArg).join(' '),
      atMs: Number((performance.now() - start).toFixed(2))
    })
  }

  const sandboxConsole = {
    log: (...args: unknown[]) => pushLog('log', args),
    info: (...args: unknown[]) => pushLog('log', args),
    warn: (...args: unknown[]) => pushLog('warn', args),
    error: (...args: unknown[]) => pushLog('error', args)
  }

  const assert = (condition: unknown, label: string) => {
    const passed = Boolean(condition)
    assertions.push({ passed, label })
    if (!passed) pushLog('error', [`[ASSERT FAIL] ${label}`])
  }

  const emitMetric = (
    label: string,
    value: string | number,
    unit?: string,
    status: 'optimal' | 'tradeoff' | 'breaking' = 'optimal'
  ) => {
    metrics.push({ label, value: String(value), unit, status })
  }

  const emitArtifact = (title: string, data: unknown) => {
    artifacts.push({ title, data })
  }

  try {
    const fn = new Function('console', 'ENV', 'assert', 'emitMetric', 'emitArtifact', `"use strict";\n${code}`)
    fn(sandboxConsole, Object.freeze({ ...env }), assert, emitMetric, emitArtifact)
    return {
      ok: assertions.every(a => a.passed),
      durationMs: Number((performance.now() - start).toFixed(2)),
      timedOut: false,
      logs,
      assertions,
      metrics,
      artifacts
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    pushLog('error', [`RuntimeError: ${msg}`])
    return {
      ok: false,
      durationMs: Number((performance.now() - start).toFixed(2)),
      timedOut: false,
      errorMessage: msg,
      logs,
      assertions,
      metrics,
      artifacts
    }
  }
}
