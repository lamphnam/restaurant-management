import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

export const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
export const roles = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF', 'HEAD_CHEF']

export async function loginAll() {
  const auth = {}
  for (const [index, role] of roles.entries()) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `090000000${index + 1}`, password: process.env.DEMO_PASSWORD ?? 'Demo@123' }),
      signal: AbortSignal.timeout(20_000),
    })
    assert.equal(response.status, 200, `${role} login`)
    auth[role] = await response.json()
  }
  return auth
}

export function databaseSnapshot() {
  const root = '.cache/maven/repository/org/postgresql/postgresql'
  const version = readdirSync(root).filter((name) => /^\d/.test(name)).sort().at(-1)
  const driver = `${root}/${version}/postgresql-${version}.jar`
  return JSON.parse(
    execFileSync('java', ['-cp', driver, 'scripts/PhaseThreeDbCheck.java', 'backend/restaurant-management/application-local.yaml'], {
      encoding: 'utf8',
      timeout: 30_000,
    })
  )
}
