import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Play, RefreshCw, ShieldCheck } from 'lucide-react'

type CodeRun = {
  id: string
  status: string
  runtime_id: string
  lesson_id: string
  stdout?: string
  stderr?: string
  exit_code?: number | null
  duration_ms?: number | null
  test_results?: Array<{ name?: string; passed?: boolean; message?: string }>
  error_code?: string | null
}

declare global {
  interface Window {
    /** Host applications may inject a short-lived token provider; tokens are never persisted by this component. */
    __ACADEMY_AUTH__?: { getAccessToken: () => Promise<string | null> }
  }
}

const API_BASE_URL = (import.meta.env.VITE_CODE_RUNS_API_URL ?? '').replace(/\/+$/, '')
const API_URL_IS_SAFE = (() => {
  if (!API_BASE_URL) return false
  try {
    const url = new URL(API_BASE_URL)
    return (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
      && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password
  } catch { return false }
})()
const MAX_SOURCE_BYTES = 32 * 1024
const TERMINAL_STATES = new Set(['succeeded', 'failed', 'timed_out', 'resource_limited'])

function safeLessonId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120)
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

const RUN_STATES = new Set(['submitting', 'queued', 'running', 'succeeded', 'failed', 'timed_out', 'resource_limited'])

function parseCodeRun(value: unknown): CodeRun {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The code-run service returned an invalid response. Retry this same submission.')
  }
  const result = value as Record<string, unknown>
  if (
    typeof result.id !== 'string' || !result.id ||
    typeof result.status !== 'string' || !RUN_STATES.has(result.status) ||
    typeof result.runtime_id !== 'string' || typeof result.lesson_id !== 'string'
  ) {
    throw new Error('The code-run service returned an incomplete run record. Retry this same submission.')
  }
  for (const field of ['stdout', 'stderr', 'error_code'] as const) {
    if (result[field] !== undefined && result[field] !== null && typeof result[field] !== 'string') {
      throw new Error('The code-run service returned an invalid result payload.')
    }
  }
  for (const field of ['exit_code', 'duration_ms'] as const) {
    if (result[field] !== undefined && result[field] !== null && typeof result[field] !== 'number') {
      throw new Error('The code-run service returned an invalid result payload.')
    }
  }
  if (result.test_results !== undefined && !Array.isArray(result.test_results)) {
    throw new Error('The code-run service returned invalid test results.')
  }
  return result as unknown as CodeRun
}

export function CodeRunPlayground({ lessonId, lessonTitle, starterSource }: {
  lessonId: string
  lessonTitle: string
  starterSource: string
}) {
  const [source, setSource] = useState(starterSource)
  const [run, setRun] = useState<CodeRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [sourceLocked, setSourceLocked] = useState(false)
  const [retryAllowed, setRetryAllowed] = useState(false)
  const idempotencyKey = useRef<string | null>(null)
  const lessonKey = useMemo(() => safeLessonId(lessonId), [lessonId])
  const authAvailable = typeof window !== 'undefined' && typeof window.__ACADEMY_AUTH__?.getAccessToken === 'function'
  const configured = Boolean(API_URL_IS_SAFE && authAvailable)

  useEffect(() => {
    setSource(starterSource)
    setRun(null)
    setMessage('')
    setSourceLocked(false)
    setRetryAllowed(false)
    idempotencyKey.current = null
  }, [starterSource, lessonKey])

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await window.__ACADEMY_AUTH__?.getAccessToken()
    if (!token) throw new Error('Your session has expired. Sign in again to run code.')
    const controller = new AbortController()
    const timeoutMs = init?.method === 'POST' ? 25_000 : 8_000
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...init?.headers,
        },
        credentials: 'omit',
        cache: 'no-store',
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  const submit = useCallback(async (retry: boolean) => {
    if (!configured || busy) return
    const bytes = new TextEncoder().encode(source).length
    if (!source.trim()) { setMessage('Add some Python code before running.'); return }
    if (bytes > MAX_SOURCE_BYTES) { setMessage('Code is larger than the 32 KiB submission limit.'); return }
    if (!lessonKey) { setMessage('This lesson does not have a valid runner lesson ID yet.'); return }

    if (!retry || !idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
    const key = idempotencyKey.current
    setBusy(true)
    setSourceLocked(true)
    setRetryAllowed(false)
    setMessage('')
    let allowRetryOnError = true
    try {
      const response = await request('/v1/code-runs', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify({ runtime_id: 'python-3.11', lesson_id: lessonKey, source }),
      })
      if (!response.ok) {
        if (response.status === 401) { setRetryAllowed(true); throw new Error('Your session is no longer valid. Sign in again, then retry this same submission.') }
        if (response.status === 409) { allowRetryOnError = false; throw new Error('This submission key conflicts with a changed payload. Start a new run before editing or resubmitting.') }
        if (response.status === 429) { setRetryAllowed(true); throw new Error('Your code-run quota has been reached. Try again after the quota window resets.') }
        if (response.status === 503) { setRetryAllowed(true); throw new Error('The runner is unavailable or dispatch is still being recovered. Retry safely with the same submission.') }
        if (response.status === 413 || response.status === 422) { allowRetryOnError = false; throw new Error('The runner rejected this submission. Start a new run, correct the source or lesson configuration, and try again.') }
        if (response.status >= 500) throw new Error(`Code-run service failed (HTTP ${response.status}). Retry this same submission if the outcome is unknown.`)
        allowRetryOnError = false
        throw new Error(`Code-run request failed (HTTP ${response.status}). Start a new run after correcting the request.`)
      }
      const result = parseCodeRun(await response.json())
      setRun(result)
      if (result.status === 'submitting') {
        setRetryAllowed(true)
        setMessage('Submission is awaiting dispatch confirmation. Retry safely after the dispatch lease expires; the same key and source will be reused.')
      } else if (TERMINAL_STATES.has(result.status)) {
        setMessage(result.status === 'succeeded' ? 'Execution completed.' : 'Execution finished. Review the result below.')
      } else {
        setMessage('Submission accepted. Waiting for the isolated runner result…')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setRetryAllowed(true)
        setMessage('The request timed out. Its outcome may be unknown; retry this same submission with the unchanged source.')
      } else {
        setRetryAllowed(allowRetryOnError)
        setMessage(error instanceof Error ? error.message : 'Could not reach the code-run service. Retry this same submission.')
      }
    } finally {
      setBusy(false)
    }
  }, [busy, configured, lessonKey, request, source])

  useEffect(() => {
    if (!run?.id || !['queued', 'running'].includes(run.status)) return
    let cancelled = false
    let inFlight = false
    const timer = window.setInterval(async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const response = await request(`/v1/code-runs/${encodeURIComponent(run.id)}`)
        if (response.ok) {
          const latest = parseCodeRun(await response.json())
          if (!cancelled) {
            setRun(latest)
            if (TERMINAL_STATES.has(latest.status)) setMessage(latest.status === 'succeeded' ? 'Execution completed.' : 'Execution finished. Review the result below.')
          }
        }
      } catch {
        if (!cancelled) setMessage('Status refresh is temporarily unavailable. The run remains safe; polling will retry.')
      } finally {
        inFlight = false
      }
    }, 1500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [request, run?.id, run?.status])

  const startNewRun = () => {
    idempotencyKey.current = null
    setRun(null)
    setMessage('')
    setSourceLocked(false)
    setRetryAllowed(false)
  }
  const terminal = Boolean(run && TERMINAL_STATES.has(run.status))
  const canRetry = Boolean(retryAllowed && idempotencyKey.current && !busy && (!run || run.status === 'submitting'))

  return <section className="code-run-panel" aria-label={`Python playground for ${lessonTitle}`}>
    <div className="code-run-heading">
      <div><span className="eyebrow">SECURE EXECUTION WORKBENCH</span><h4>Run this lesson's Python code</h4><p>Python 3.11 · 32 KiB source limit · authenticated, quota-limited API</p></div>
      <span className={configured ? 'code-run-availability ready' : 'code-run-availability'}>{configured ? 'AUTH READY' : 'NOT CONNECTED'}</span>
    </div>
    {!configured && <div className="code-run-notice"><ShieldCheck size={17}/><div><strong>Execution is not connected</strong><p>Configure <code>VITE_CODE_RUNS_API_URL</code> and inject <code>window.__ACADEMY_AUTH__.getAccessToken()</code> from the host sign-in system. No learner code is sent until both are available.</p></div></div>}
    <label className="code-run-editor-label" htmlFor={`code-run-${lessonKey}`}>Your Python source</label>
    <textarea id={`code-run-${lessonKey}`} className="code-run-editor" value={source} onChange={event => setSource(event.target.value)} spellCheck={false} disabled={sourceLocked} aria-describedby={`code-run-help-${lessonKey}`}/>
    <div className="code-run-controls"><span id={`code-run-help-${lessonKey}`}>{new TextEncoder().encode(source).length.toLocaleString()} / 32,768 bytes · source is held in memory only</span>
      <div>
        {sourceLocked && <button type="button" className="code-run-secondary" onClick={startNewRun}>Start new run</button>}
        {!sourceLocked
          ? <button type="button" className="code-run-primary" disabled={!configured || busy} onClick={() => void submit(false)}><Play size={14}/> Run code</button>
          : canRetry && <button type="button" className="code-run-primary" disabled={!configured || busy} onClick={() => void submit(true)}><RefreshCw size={14}/> Retry same submission</button>}
      </div>
    </div>
    {message && <p className="code-run-message" role="status"><AlertCircle size={15}/>{message}</p>}
    {run && <div className="code-run-result">
      <div className="code-run-result-head"><strong>Execution result</strong><span><Clock3 size={13}/>{statusLabel(run.status)}{run.duration_ms != null ? ` · ${run.duration_ms} ms` : ''}</span></div>
      {run.error_code && <p className="code-run-error">Error code: {run.error_code}</p>}
      {run.stdout && <><span className="code-run-output-label">STDOUT</span><pre>{run.stdout}</pre></>}
      {run.stderr && <><span className="code-run-output-label">STDERR</span><pre>{run.stderr}</pre></>}
      {run.exit_code != null && <p className="code-run-exit">Exit code: {run.exit_code}</p>}
      {run.test_results?.length ? <ul className="code-run-tests">{run.test_results.map((test, index) => <li key={index}>{test.passed ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}<span>{test.name ?? `Test ${index + 1}`}{test.message ? `: ${test.message}` : ''}</span></li>)}</ul> : null}
      {terminal && <p className="code-run-complete">{run.status === 'succeeded' ? 'All execution steps completed.' : 'Run ended without a successful result.'}</p>}
    </div>}
  </section>
}
