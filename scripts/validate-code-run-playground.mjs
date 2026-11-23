import { readFileSync } from 'node:fs'

const playground = readFileSync('src/components/CodeRunPlayground.tsx', 'utf8')
const practice = readFileSync('src/components/LessonPractice.tsx', 'utf8')
const config = readFileSync('backend/app/config.py', 'utf8')
const provider = readFileSync('backend/app/runner_provider.py', 'utf8')

const checks = [
  ['lesson workbench mounts the remote playground', practice.includes('<CodeRunPlayground')],
  ['submission uses the authenticated code-run endpoint', playground.includes("request('/v1/code-runs'")],
  ['stable idempotency key is reused for retries', playground.includes("headers: { 'Idempotency-Key': key }") && playground.includes('submit(true)')],
  ['source is bounded to 32 KiB', playground.includes('MAX_SOURCE_BYTES = 32 * 1024')],
  ['credentials are not sent as cookies', playground.includes("credentials: 'omit'")],
  ['API endpoint requires HTTPS outside localhost', playground.includes('API_URL_IS_SAFE') && playground.includes("url.protocol === 'https:'")],
  ['source is not persisted to browser storage', !/localStorage|sessionStorage/.test(playground)],
  ['status polling uses the run resource', playground.includes('/v1/code-runs/')],
  ['requests have bounded submission and polling timeouts', playground.includes("init?.method === 'POST' ? 25_000 : 8_000") && playground.includes('controller.abort()')],
  ['API run payloads are validated before rendering', playground.includes('function parseCodeRun(value: unknown)') && playground.includes('RUN_STATES.has(result.status)')],
  ['permanent validation and idempotency conflicts do not offer blind retry', playground.includes("response.status === 409") && playground.includes("response.status === 413 || response.status === 422") && playground.includes('retryAllowed')],
  ['ambiguous timeout retries reuse the original submission key', playground.includes("error.name === 'AbortError'") && playground.includes('retry this same submission')],
  ['code execution remains disabled by default', /code_execution_enabled: bool = False/.test(config)],
  ['runner adapter uses durable idempotency header', provider.includes('"Idempotency-Key": str(run_id)')],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exit(1)
