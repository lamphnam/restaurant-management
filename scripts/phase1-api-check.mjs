import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'

requireWriteApproval('phase1-api-check')

// Writes demo/QA records on the configured Neon main, explicitly authorized on 22/10/2026.
// Does not reset the DB, edit historical rows, print credentials, or implement closing sessions.
const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
const run = Date.now().toString()
const prefix = `[QA] ${run}`
const results = []
const tokens = {}
const roles = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF', 'HEAD_CHEF']
async function call(role, method, path, body, expected = 200, code) {
  const response = await fetch(`${base}/api${path}`, { method, signal: AbortSignal.timeout(20_000),
    headers: { ...(role ? { Authorization: `Bearer ${tokens[role] ?? role}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  assert.equal(response.status, expected, `${role ?? 'anonymous'} ${method} ${path}: ${data?.code ?? response.status}`)
  if (code) assert.equal(data.code, code, path)
  assert(!text.includes('passwordHash') && !text.includes('password_hash'), 'Password hash leaked')
  results.push({ role: roles.includes(role) ? role : role ? 'QA_ACCOUNT' : 'anonymous', method, path, status: response.status, code: data?.code })
  return data
}
function check(value, description) { assert(value, description); results.push({ check: description, pass: true }) }
for (const [index, role] of roles.entries()) {
  const login = await call(null, 'POST', '/auth/login', { phone: `090000000${index + 1}`, password: process.env.DEMO_PASSWORD ?? 'Demo@123' })
  tokens[role] = login.accessToken
}
console.log('PASS login for six roles')
const floor = await call('WAITER', 'GET', '/tables/floor-plan')
const allTables = floor.flatMap((area) => area.tables)
const free = allTables.filter((table) => table.status === 'AVAILABLE' && !table.activeSessionId && !table.upcomingReservation)
assert(free.length >= 5, 'At least five available demo tables are required; no reset is performed automatically')
const [reservationTable, walkInTable, raceTable, managerTable, waiterTable] = free
const phone = `09${run.slice(-8)}`
const accountRequest = { fullName: `${prefix} Nhân viên`, phone, password: 'QaPhase1@123', role: 'MANAGER' }
const qaAccount = await call('OWNER', 'POST', '/accounts', accountRequest)
check(qaAccount.status === 'ACTIVE' && !('password' in qaAccount), 'Created account is ACTIVE without password fields')
await call('OWNER', 'POST', '/accounts', accountRequest, 409, 'PHONE_ALREADY_EXISTS')
const me = await call('OWNER', 'GET', '/auth/me')
for (const action of ['lock', 'unlock', 'role']) await call('OWNER', 'PATCH', `/accounts/${me.accountId}/${action}`, action === 'role' ? { role: 'WAITER' } : undefined, 409, 'CANNOT_MODIFY_SELF')
const qaLogin = await call(null, 'POST', '/auth/login', { phone, password: accountRequest.password })
const qaToken = qaLogin.accessToken
await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/role`, { role: 'WAITER' })
check((await call(qaToken, 'GET', '/auth/me')).role === 'MANAGER', 'D10: /me retains old token role after change')
await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/lock`)
await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/lock`)
await call(null, 'POST', '/auth/login', { phone, password: accountRequest.password }, 401, 'ACCOUNT_LOCKED')
await call(qaToken, 'GET', '/auth/me')
await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/unlock`)
await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/unlock`)
check((await call(null, 'POST', '/auth/login', { phone, password: accountRequest.password })).account.role === 'WAITER', 'Fresh login receives changed role')
console.log('PASS account checklist 5–6 and D10')

const qaMenu = await call('OWNER', 'POST', '/menu-items', { name: `${prefix} Phở thử`, price: 50000 })
const ingredients = await call('HEAD_CHEF', 'GET', '/inventory/ingredients?status=ACTIVE')
assert(ingredients.length >= 3)
const originalLines = [{ ingredientId: ingredients[0].id, quantityPerServing: 0.1 }, { ingredientId: ingredients[1].id, quantityPerServing: 0.2 }]
await call('HEAD_CHEF', 'PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: originalLines })
const replacement = [{ ingredientId: ingredients[0].id, quantityPerServing: 0.125 }, { ingredientId: ingredients[2].id, quantityPerServing: 0.3 }]
const diff = await call('HEAD_CHEF', 'PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: replacement })
check(diff.length === 2 && Number(diff.find((line) => line.ingredientId === ingredients[0].id)?.quantityPerServing) === 0.125, 'Recipe diff retains old PK, updates quantity, removes and adds')
await call('OWNER', 'PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: [replacement[0], replacement[0]] }, 400, 'DUPLICATE_RECIPE_INGREDIENT')
await call('OWNER', 'PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: [{ ingredientId: ingredients[0].id, quantityPerServing: 0 }] }, 400, 'INVALID_INPUT')
await call('OWNER', 'PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: [] })
await call('HEAD_CHEF', 'PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: replacement })
const priced = await call('OWNER', 'PUT', `/menu-items/${qaMenu.id}`, { name: qaMenu.name, price: 55000 })
check(Number(priced.price) === 55000, 'Checklist 15 Phase 1: current menu price updates')
await call('OWNER', 'PATCH', `/menu-items/${qaMenu.id}/discontinue`)
await call('OWNER', 'PATCH', `/menu-items/${qaMenu.id}/discontinue`)
check(!(await call('WAITER', 'GET', '/menu-items?status=ON_SALE')).some((item) => item.id === qaMenu.id), 'Checklist 16 Phase 1: discontinued item excluded from ON_SALE')
await call('OWNER', 'PATCH', `/menu-items/${qaMenu.id}/reactivate`)
console.log('PASS menu/recipe and checklist 15–16 Phase 1')

const start = new Date(Date.now() + 2 * 86400_000); start.setUTCHours(10, 0, 0, 0)
const iso = (offset) => new Date(start.getTime() + offset * 3600_000).toISOString()
const reservationRequest = { tableId: reservationTable.id, customerName: `${prefix} Khách đặt`, customerPhone: phone, guestCount: 2, startTime: iso(0), endTime: iso(2), note: `${prefix} API` }
await call('MANAGER', 'POST', '/reservations', { ...reservationRequest, guestCount: reservationTable.capacity + 1 }, 409, 'TABLE_CAPACITY_EXCEEDED')
const reservation = await call('MANAGER', 'POST', '/reservations', reservationRequest)
await call('MANAGER', 'POST', '/reservations', { ...reservationRequest, startTime: iso(1), endTime: iso(3) }, 409, 'RESERVATION_OVERLAP')
const touching = await call('MANAGER', 'POST', '/reservations', { ...reservationRequest, customerName: `${prefix} Chạm biên`, startTime: iso(2), endTime: iso(4) })
await call('MANAGER', 'PATCH', `/reservations/${touching.id}/cancel`)
await call('MANAGER', 'PATCH', `/reservations/${touching.id}/cancel`)
const query = await call('OWNER', 'GET', `/reservations?q=${encodeURIComponent(prefix)}&size=100`)
check(query.items.some((r) => r.id === touching.id && r.status === 'CANCELLED'), 'Checklist 9: cancelled reservation remains in history')
await call('MANAGER', 'GET', '/reservations/available-tables', undefined, 400, 'INVALID_INPUT')
await call('MANAGER', 'GET', '/reservations/available-tables?startTime=bad&endTime=bad&guestCount=0', undefined, 400, 'INVALID_INPUT')
const availablePath = `/reservations/available-tables?startTime=${iso(0)}&endTime=${iso(2)}&guestCount=2`
check(!(await call('MANAGER', 'GET', availablePath)).some((t) => t.id === reservationTable.id), 'Available table query excludes true overlap')
const boundaryPath = `/reservations/available-tables?startTime=${iso(2)}&endTime=${iso(4)}&guestCount=2`
check((await call('MANAGER', 'GET', boundaryPath)).some((t) => t.id === reservationTable.id), 'Available table query includes touching boundary')
const expired = await call('MANAGER', 'POST', '/reservations', { ...reservationRequest, tableId: raceTable.id, customerName: `${prefix} Quá giờ`, startTime: new Date(Date.now() - 7200_000).toISOString(), endTime: new Date(Date.now() - 3600_000).toISOString() })
check((await call('MANAGER', 'GET', `/reservations?q=${encodeURIComponent(prefix)}&size=100`)).items.some((r) => r.id === expired.id && r.overdue), 'Overdue is derived without a new status; past reservations allowed')
await call('WAITER', 'POST', '/sessions', { tableId: raceTable.id, reservationId: expired.id }, 409, 'RESERVATION_EXPIRED')
await call('WAITER', 'POST', '/sessions', { tableId: raceTable.id, reservationId: reservation.id }, 409, 'RESERVATION_TABLE_MISMATCH')

const walkIn = await call('WAITER', 'POST', '/sessions', { tableId: walkInTable.id })
check(walkIn.reservationId === null && walkIn.status === 'ACTIVE', 'Checklist 11: walk-in creates ACTIVE session')
const seated = await call('MANAGER', 'POST', '/sessions', { tableId: reservationTable.id, reservationId: reservation.id })
check(seated.reservationId === reservation.id, 'Checklist 12: session links reservation')
await call('MANAGER', 'PATCH', `/reservations/${reservation.id}/cancel`, undefined, 409, 'RESERVATION_NOT_CONFIRMED')
const race = await Promise.all([
  fetch(`${base}/api/sessions`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.WAITER}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId: raceTable.id }) }),
  fetch(`${base}/api/sessions`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.MANAGER}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId: raceTable.id }) }),
])
check(race.map((r) => r.status).sort().join(',') === '200,409', 'Checklist 13: two concurrent requests yield exactly one success and one 409')
for (const response of race) if (response.status === 409) check((await response.json()).code === 'SESSION_ALREADY_ACTIVE', 'Race loser receives SESSION_ALREADY_ACTIVE')
const finalFloor = (await call('WAITER', 'GET', '/tables/floor-plan')).flatMap((a) => a.tables)
check(finalFloor.find((t) => t.id === walkInTable.id)?.status === 'OCCUPIED', 'Walk-in table is OCCUPIED')
check((await call('OWNER', 'GET', `/reservations?q=${encodeURIComponent(prefix)}&size=100`)).items.some((r) => r.id === reservation.id && r.status === 'SEATED'), 'Linked reservation is SEATED')
console.log('PASS reservation/session checklist 7–13 including parallel race')

const endpoints = [
  ['GET', '/accounts', undefined, ['OWNER']],
  ['POST', '/accounts', { ...accountRequest, phone: `08${run.slice(-8)}`, fullName: `${prefix} Ma trận` }, ['OWNER']],
  ['PATCH', `/accounts/${qaAccount.id}/lock`, undefined, ['OWNER']],
  ['PATCH', `/accounts/${qaAccount.id}/unlock`, undefined, ['OWNER']],
  ['PATCH', `/accounts/${qaAccount.id}/role`, { role: 'WAITER' }, ['OWNER']],
  ['GET', '/menu-items', undefined, roles],
  ['POST', '/menu-items', { name: `${prefix} Món ma trận`, price: 10000 }, ['OWNER']],
  ['PUT', `/menu-items/${qaMenu.id}`, { name: qaMenu.name, price: 55000 }, ['OWNER']],
  ['PATCH', `/menu-items/${qaMenu.id}/discontinue`, undefined, ['OWNER']],
  ['PATCH', `/menu-items/${qaMenu.id}/reactivate`, undefined, ['OWNER']],
  ['GET', `/menu-items/${qaMenu.id}/recipe`, undefined, ['OWNER', 'HEAD_CHEF']],
  ['PUT', `/menu-items/${qaMenu.id}/recipe`, { lines: replacement }, ['OWNER', 'HEAD_CHEF']],
  ['GET', '/inventory/ingredients?status=ACTIVE', undefined, ['OWNER', 'HEAD_CHEF']],
  ['GET', '/tables/floor-plan', undefined, ['OWNER', 'MANAGER', 'CASHIER', 'WAITER']],
  ['GET', '/reservations', undefined, ['OWNER', 'MANAGER', 'WAITER']],
  ['GET', boundaryPath, undefined, ['MANAGER']],
  ['POST', '/reservations', { ...reservationRequest, customerName: `${prefix} Ma trận`, startTime: iso(5), endTime: iso(6) }, ['MANAGER']],
  ['PATCH', `/reservations/${touching.id}/cancel`, undefined, ['MANAGER']],
]
for (const role of roles) for (const [method, path, body, allowed] of endpoints) await call(role, method, path, body, allowed.includes(role) ? 200 : 403, allowed.includes(role) ? undefined : 'FORBIDDEN')
for (const role of roles) await call(role, 'POST', '/sessions', { tableId: role === 'MANAGER' ? managerTable.id : waiterTable.id }, ['WAITER', 'MANAGER'].includes(role) ? 200 : 403, ['WAITER', 'MANAGER'].includes(role) ? undefined : 'FORBIDDEN')
await mkdir('.cache/phase1', { recursive: true })
await writeFile('.cache/phase1/api-results.json', JSON.stringify({ run, prefix, total: results.length, results }, null, 2))
await writeFile('.cache/phase1/qa-context.json', JSON.stringify({ prefix, qaAccountId: qaAccount.id, qaMenuId: qaMenu.id, ingredientIds: ingredients.slice(0, 3).map((i) => i.id), sessionIds: [walkIn.sessionId, seated.sessionId] }, null, 2))
console.log(`PASS ${results.length} API assertions. QA sessions remain active on main as authorized; no reset performed.`)
