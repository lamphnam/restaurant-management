import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

export const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
export const roles = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF', 'HEAD_CHEF']
export async function loginAll() {
  const auth = {}
  for (const [index, role] of roles.entries()) {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `090000000${index + 1}`, password: process.env.DEMO_PASSWORD ?? 'Demo@123' }), signal: AbortSignal.timeout(20_000) })
    assert.equal(response.status, 200, `${role} login`)
    auth[role] = await response.json()
  }
  return auth
}
export function databaseSnapshot() {
  const root = '.cache/maven/repository/org/postgresql/postgresql'
  const version = readdirSync(root).filter((name) => /^\d/.test(name)).sort().at(-1)
  const driver = `${root}/${version}/postgresql-${version}.jar`
  return JSON.parse(execFileSync('java', ['-cp', driver, 'scripts/PhaseTwoDbCheck.java', 'backend/restaurant-management/application-local.yaml'], { encoding: 'utf8', timeout: 30_000 }))
}
export async function selectQaSession(call) {
  const floor = await call('WAITER', 'GET', '/tables/floor-plan')
  for (const table of floor.flatMap((area) => area.tables).filter((table) => table.activeSessionId)) {
    const session = await call('WAITER', 'GET', `/sessions/${table.activeSessionId}`)
    if (session.status === 'ACTIVE' && session.reservation?.customerName.startsWith('[QA]')) return session
  }
  throw new Error('No verified ACTIVE session linked to a [QA] reservation; inspect existing QA data before opening another table.')
}
export async function openStream(token) {
  const controller = new AbortController()
  const events = []
  const response = await fetch(`${base}/api/events`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
  assert.equal(response.status, 200, 'SSE authorized')
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const reader = response.body.getReader()
  let text = ''
  void (async () => {
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        text += new TextDecoder().decode(chunk.value)
        let separator
        while ((separator = text.indexOf('\n\n')) >= 0) {
          const frame = text.slice(0, separator); text = text.slice(separator + 2)
          const data = frame.split('\n').find((line) => line.startsWith('data:'))
          if (data) events.push(JSON.parse(data.slice(5)))
        }
      }
    } catch (error) { if (!controller.signal.aborted) events.push({ error: error.message }) }
  })()
  return { events, close: () => controller.abort() }
}
export async function eventually(check, timeout = 3000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await check()) return Date.now() - start
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  assert.fail('Condition did not become true before timeout')
}
