import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, eventually, loginAll, openStream, selectQaSession } from './phase2-qa-support.mjs'

// Writes one QA menu/recipe and two order batches on an existing verified session. No reset/open/close.
requireWriteApproval('phase2-review-api-check')
const auth = await loginAll(), results = []
const check = (value, label) => { assert(value, label); results.push(label) }
async function call(role, method, path, body, expected = 200) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000) })
  const value = await response.json()
  assert.equal(response.status, expected, `${method} ${path}: ${value.code ?? response.status}`)
  results.push(`${role} ${method} ${path} → ${expected}`)
  return value
}
const before = databaseSnapshot(), session = await selectQaSession(call)
const prefix = `[QA] Phase2 review ${Date.now()}`
const menu = await call('OWNER', 'POST', '/menu-items', { name: `${prefix} Món giới hạn`, price: 1000 })
const stream = await openStream(auth.WAITER.accessToken)
const obsolete = await openStream(auth.KITCHEN_STAFF.accessToken)
const orderEvents = () => stream.events.filter((event) => event.type === 'ORDER').length
async function events(count) { await eventually(() => orderEvents() === count) }
try {
  const ingredients = await call('HEAD_CHEF', 'GET', '/inventory/ingredients?status=ACTIVE')
  const recipe = [{ ingredientId: ingredients[0].id, quantityPerServing: 0.001 }, { ingredientId: ingredients[1].id, quantityPerServing: 0.002 }]
  await call('HEAD_CHEF', 'PUT', `/menu-items/${menu.id}/recipe`, { lines: recipe })
  for (const quantity of [100, 2147483647]) {
    const error = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [{ menuItemId: menu.id, quantity }] }, 400)
    check(!!error.fieldErrors['items[0].quantity'], `Quantity ${quantity} rejected with fieldErrors`)
  }
  const tooMany = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: Array.from({ length: 51 }, () => ({ menuItemId: menu.id, quantity: 1 })) }, 400)
  check(!!tooMany.fieldErrors.items, '51 lines rejected with items field error')
  check(databaseSnapshot().food_order === before.food_order, 'Rejected payloads create no FoodOrder')
  const order = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [
    { menuItemId: menu.id, quantity: 99, note: `${prefix} quantity boundary` },
    { menuItemId: menu.id, quantity: 1, note: `${prefix} cancel` },
  ] })
  await events(1)
  const [item, cancelled] = order.items
  check(item.quantity === 99, '99 portions accepted and snapshotted')
  await call('WAITER', 'PATCH', `/sessions/items/${cancelled.id}/cancel`)
  await events(2)
  await call('WAITER', 'PATCH', `/sessions/items/${cancelled.id}/cancel`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${item.id}/start`)
  await events(3)
  await call('WAITER', 'PATCH', `/sessions/items/${item.id}/cancel`, undefined, 409)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${item.id}/start`)
  await Promise.all([
    call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${item.id}/complete`),
    call('HEAD_CHEF', 'PATCH', `/kitchen/items/${item.id}/complete`),
  ])
  await events(4)
  const completed = databaseSnapshot().movements.filter((movement) => movement.orderItemId === item.id)
  check(completed.length === 2, 'Parallel complete still creates one movement per ingredient')
  check(completed.some((movement) => movement.quantityChange === -0.099) && completed.some((movement) => movement.quantityChange === -0.198), 'Consumption for 99 portions is correct')
  await call('WAITER', 'PATCH', `/sessions/items/${item.id}/serve`)
  await events(5)
  await call('WAITER', 'PATCH', `/sessions/items/${item.id}/serve`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${item.id}/complete`)
  await new Promise((resolve) => setTimeout(resolve, 300))
  check(orderEvents() === 5, 'No extra async ORDER signals for repeated target states')
  obsolete.close()
  const startedAt = Date.now()
  const extra = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [{ menuItemId: menu.id, quantity: 1, note: `${prefix} disconnected subscriber` }] })
  const orderResponseMs = Date.now() - startedAt
  await events(6)
  await call('WAITER', 'PATCH', `/sessions/items/${extra.items[0].id}/cancel`)
  await events(7)
  check(orderResponseMs < 5000, 'Disconnected subscriber does not stall successful order response')
  check(stream.events.every((event) => event.type === 'ORDER' && event.sessionId === session.sessionId), 'Async payload remains type/sessionId for the committed session')
  const after = databaseSnapshot()
  const detail = await call('WAITER', 'GET', `/sessions/${session.sessionId}`)
  check(detail.total === session.total + 99000, 'Server total uses snapshots and excludes cancelled items')
  check(after.service_session === before.service_session && after.invoice === before.invoice, 'No session opening/closing or invoice created')
  check(after.stock_movement === before.stock_movement + 2, 'Only two expected consumption movements added')
  await mkdir('.cache/phase2-review', { recursive: true })
  await writeFile('.cache/phase2-review/api-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, results, prefix, sessionId: session.sessionId, menuId: menu.id,
    orderResponseMs, before, after, events: stream.events }, null, 2))
  console.log(`PASS ${results.length} Phase 2 review API/ledger checks on real Neon; order response ${orderResponseMs}ms.`)
} finally {
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
  stream.close(); obsolete.close()
}
