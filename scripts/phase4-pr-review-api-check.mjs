import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll } from './phase3-qa-support.mjs'

// POST requests must be rejected. Guard still required: a regression could otherwise create a row.
requireWriteApproval('phase4-pr-review-api-check')
const output = '.cache/phase4-pr-review-api'
await mkdir(output, { recursive: true })
const auth = await loginAll()
const evidence = { checkedAt: new Date().toISOString(), completed: false, results: [], before: databaseSnapshot() }
const pass = (label) => { evidence.results.push(label); console.log(`PASS ${label}`) }
async function call(role, method, endpoint, body, status = 200) {
  const response = await fetch(`${base}/api${endpoint}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  const data = await response.json()
  assert.equal(response.status, status, `${method} ${endpoint}: ${data.code ?? ''}`)
  return data
}
try {
  const before = await call('CASHIER', 'GET', '/reconciliations?size=100')
  const startTime = '2026-10-01T00:00:00+07:00'
  const futureEnd = new Date(Date.now() + 3600000).toISOString()
  const query = new URLSearchParams({ from: startTime, to: futureEnd })
  const preview = await call('CASHIER', 'GET', `/reconciliations/preview?${query}`, undefined, 400)
  assert.equal(preview.code, 'INVALID_INPUT')
  assert.equal(preview.message, 'Thời điểm kết thúc ca không được ở tương lai')
  pass('Future preview returns400 INVALID_INPUT with the shift-specific message')
  const rejected = await call('CASHIER', 'POST', '/reconciliations', { startTime, endTime: futureEnd, actualAmount: 0, differenceReason: '[QA] PR4 future rejection' }, 400)
  assert.equal(rejected.code, 'INVALID_INPUT')
  assert.equal(rejected.message, 'Thời điểm kết thúc ca không được ở tương lai')
  pass('Future create returns400 INVALID_INPUT; interval is not silently clamped')
  const endTime = new Date(Date.now() - 1000).toISOString()
  const validQuery = new URLSearchParams({ from: startTime, to: endTime })
  await call('CASHIER', 'GET', `/reconciliations/preview?${validQuery}`)
  pass('An ended interval previews successfully with the real server Clock')
  const decimal = await call('CASHIER', 'POST', '/reconciliations', `{"startTime":${JSON.stringify(startTime)},"endTime":${JSON.stringify(endTime)},"actualAmount":100.0,"differenceReason":"[QA] PR4 DTO decimal rejection"}`, 400)
  assert(decimal.fieldErrors?.actualAmount)
  pass('DTO rejects JSON decimal100.0 consistently with @Digits(fraction=0)')
  const reason = await call('CASHIER', 'POST', '/reconciliations', { startTime, endTime, actualAmount: 0, differenceReason: '[QA] ' + 'x'.repeat(496) }, 400)
  assert(reason.fieldErrors?.differenceReason)
  pass('DTO rejects reason length501 without service duplicate validation')
  const monthQuery = new URLSearchParams({ from: startTime, to: '2026-11-01T00:00:00+07:00' })
  const summary = await call('OWNER', 'GET', `/payments/summary?${monthQuery}`)
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  const days = Math.min(31, Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse('2026-10-01T00:00:00Z')) / 86400000) + 1))
  assert.equal(summary.analysis.calendarDays, days)
  assert.equal(summary.analysis.averageDailyRevenue, days ? Math.round(summary.revenue.systemRevenue / days) : 0)
  assert(summary.topItems.length <= 10)
  pass('Real full-month report averages only elapsed dates and limits top items to10')
  const future = await call('OWNER', 'GET', '/payments/summary?from=2028-02-01T00:00:00%2B07:00&to=2028-03-01T00:00:00%2B07:00')
  assert.equal(future.analysis.calendarDays, 0)
  assert.equal(future.analysis.averageDailyRevenue, 0)
  assert.deepEqual(future.dailyRevenue, [])
  pass('Future-only report returns zero days/average and no daily rows')
  const laterToday = new URLSearchParams({ from: new Date(Date.now() + 60000).toISOString(), to: new Date(Date.now() + 120000).toISOString() })
  const futureHours = await call('OWNER', 'GET', `/payments/summary?${laterToday}`)
  assert.equal(futureHours.analysis.calendarDays, 0)
  assert.equal(futureHours.analysis.averageDailyRevenue, 0)
  pass('Future-only hours within today also return zero elapsed days/average')
  const after = await call('CASHIER', 'GET', '/reconciliations?size=100')
  assert.deepEqual(after, before)
  evidence.after = databaseSnapshot()
  assert.deepEqual(evidence.after, evidence.before)
  pass('Rejected POSTs preserve reconciliation snapshots, domain counts and the stock ledger')
  evidence.completed = true
} catch (error) {
  evidence.failure = error.message
  throw error
} finally {
  evidence.after ??= databaseSnapshot()
  await writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
}
console.log(JSON.stringify({ checks: evidence.results.length, completed: evidence.completed, live: true, created: 0 }))
