import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'

requireWriteApproval('phase1-review-api-check (one new QA menu and recipe replacements; no sessions)')
const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
const tokens = {}
const checks = []
const check = (condition, label) => { assert(condition, label); checks.push(label); console.log(`PASS ${label}`) }
async function call(role, method, path, body, expected = 200) {
  const response = await fetch(`${base}/api${path}`, {
    method, signal: AbortSignal.timeout(20_000),
    headers: { ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  assert.equal(response.status, expected, `${method} ${path}`)
  assert(!/passwordHash|password_hash/.test(text), 'Password hash leaked')
  return text ? JSON.parse(text) : null
}
for (const [role, phone] of [['OWNER', '0900000001'], ['HEAD_CHEF', '0900000006'], ['WAITER', '0900000004']]) {
  const login = await call(role, 'POST', '/auth/login', { phone, password: process.env.DEMO_PASSWORD ?? 'Demo@123' })
  tokens[role] = login.accessToken
}
const before = await call('WAITER', 'GET', '/tables/floor-plan')
const tables = before.flatMap((area) => area.tables)
const all = []
for (let page = 0; ; page++) {
  const data = await call('WAITER', 'GET', `/reservations?page=${page}&size=100`)
  all.push(...data.items)
  if ((page + 1) * data.size >= data.total) break
}
for (const table of tables) {
  const data = await call('WAITER', 'GET', `/reservations?tableId=${table.id}&page=0&size=100`)
  check(data.total === all.filter((reservation) => reservation.tableId === table.id).length, `tableId=${table.id} preserves historical rows`)
  const start = Date.now()
  const current = await call('WAITER', 'GET', `/reservations?tableId=${table.id}&status=CONFIRMED&unexpired=true&page=0&size=100`)
  check(current.items.every((reservation) => reservation.tableId === table.id && reservation.status === 'CONFIRMED' && Date.parse(reservation.endTime) > start), `tableId=${table.id} filters unexpired confirmed rows`)
}
check((await call('WAITER', 'GET', '/reservations?tableId=0', undefined, 400)).code === 'INVALID_INPUT', 'Invalid tableId returns 400 validation')
const ingredients = await call('HEAD_CHEF', 'GET', '/inventory/ingredients?status=ACTIVE')
assert(ingredients.length >= 3, 'Three ACTIVE ingredients needed')
const [a, b, c] = ingredients.slice(0, 3).map((ingredient) => ingredient.id)
const menu = await call('OWNER', 'POST', '/menu-items', { name: `[QA] Review recipe ${Date.now()}`, price: 1000 })
const recipePath = `/menu-items/${menu.id}/recipe`
const lines = (ids) => ({ lines: ids.map((ingredientId) => ({ ingredientId, quantityPerServing: 0.125 })) })
const key = (recipe) => recipe.map((line) => `${line.ingredientId}:${Number(line.quantityPerServing)}`).sort().join(',')
try {
  for (let round = 1; round <= 10; round++) {
    await call('OWNER', 'PUT', recipePath, lines([a, b]))
    const [owner, chef] = await Promise.all([
      call('OWNER', 'PUT', recipePath, lines([a])),
      call('HEAD_CHEF', 'PUT', recipePath, lines([b, c])),
    ])
    check(key(owner) === key(lines([a]).lines) && key(chef) === key(lines([b, c]).lines), `Race ${round}: both replacements return their exact recipe`)
    const final = await call('OWNER', 'GET', recipePath)
    check([key(owner), key(chef)].includes(key(final)), `Race ${round}: final recipe equals one complete request`)
  }
} finally {
  await call('OWNER', 'PUT', recipePath, { lines: [] })
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
}
const after = await call('WAITER', 'GET', '/tables/floor-plan')
const active = (floor) => floor.flatMap((area) => area.tables).map((table) => [table.id, table.status, table.activeSessionId])
check(JSON.stringify(active(before)) === JSON.stringify(active(after)), 'No table status or active session changed')
await mkdir('.cache/phase1-review', { recursive: true })
await writeFile('.cache/phase1-review/api-results.json', JSON.stringify({ menuId: menu.id, checks }, null, 2))
console.log(`${checks.length} checks passed; QA menu ${menu.id} is discontinued with an empty recipe.`)
