import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, eventually, loginAll, openStream, roles, selectQaSession } from './phase2-qa-support.mjs'

// Writes QA menu/recipe/orders/statuses/CONSUMPTION and a cancelled reservation. Never resets or closes sessions.
requireWriteApproval('phase2-api-check')
const auth = await loginAll()
const results = []
const check = (condition, label) => { assert(condition, label); results.push(label) }
async function call(role, method, path, body, expected = 200) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20_000) })
  const value = await response.json()
  assert.equal(response.status, expected, `${role} ${method} ${path}: ${value.code ?? response.status}`)
  results.push(`${role} ${method} ${path} → ${expected}`)
  return value
}
const before = databaseSnapshot()
const session = await selectQaSession(call)
const prefix = `[QA] Phase2 API ${Date.now()}`
const stream = await openStream(auth.WAITER.accessToken)
const menus = []
try {
  // Real six-role matrix: authorized mutations target nonexistent ids, so this matrix does not write data.
  const ordering = ['WAITER', 'MANAGER'], kitchen = ['KITCHEN_STAFF', 'HEAD_CHEF']
  const matrix = [
    ['GET', `/sessions/${session.sessionId}`, undefined, ['WAITER', 'MANAGER', 'CASHIER'], 200],
    ['POST', '/sessions/9223372036854775806/orders', { items: [{ menuItemId: 1, quantity: 1 }] }, ordering, 404],
    ['PATCH', '/sessions/items/9223372036854775806/cancel', undefined, ordering, 404],
    ['PATCH', '/sessions/items/9223372036854775806/serve', undefined, ['WAITER'], 404],
    ['GET', '/sessions/items/awaiting-service', undefined, ['WAITER'], 200],
    ['GET', '/kitchen/queue', undefined, kitchen, 200],
    ['PATCH', '/kitchen/items/9223372036854775806/start', undefined, kitchen, 404],
    ['PATCH', '/kitchen/items/9223372036854775806/unavailable', { reason: `${prefix} Hết món` }, kitchen, 404],
    ['PATCH', '/kitchen/items/9223372036854775806/complete', undefined, kitchen, 404],
  ]
  for (const role of roles) {
    for (const [method, path, body, allowed, status] of matrix) await call(role, method, path, body, allowed.includes(role) ? status : 403)
    const connection = await openStream(auth[role].accessToken); connection.close()
    results.push(`${role} GET /events → 200`)
  }
  const unauthenticated = await fetch(`${base}/api/events`)
  check(unauthenticated.status === 401, 'SSE requires authentication')
  const ingredients = await call('HEAD_CHEF', 'GET', '/inventory/ingredients?status=ACTIVE')
  check(ingredients.length >= 2, 'Two active ingredients available')
  const dish = await call('OWNER', 'POST', '/menu-items', { name: `${prefix} Món định lượng`, price: 12000 }); menus.push(dish.id)
  const emptyDish = await call('OWNER', 'POST', '/menu-items', { name: `${prefix} Không định lượng`, price: 5000 }); menus.push(emptyDish.id)
  const recipe = [{ ingredientId: ingredients[0].id, quantityPerServing: 0.125 }, { ingredientId: ingredients[1].id, quantityPerServing: 0.2 }]
  await call('HEAD_CHEF', 'PUT', `/menu-items/${dish.id}/recipe`, { lines: recipe })
  for (const items of [[], [null], [{ menuItemId: dish.id, quantity: 0 }], [{ menuItemId: dish.id, quantity: 1, note: 'x'.repeat(501) }]]) {
    const error = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items }, 400)
    check(Object.keys(error.fieldErrors).length > 0, 'Invalid nested order returns fieldErrors')
  }
  const first = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [
    { menuItemId: dish.id, quantity: 2, note: `${prefix} parallel complete` },
    { menuItemId: dish.id, quantity: 1, note: `${prefix} cancel` },
    { menuItemId: emptyDish.id, quantity: 1, note: `${prefix} unavailable` },
  ] })
  await call('OWNER', 'PUT', `/menu-items/${dish.id}`, { name: dish.name, price: 19000 })
  const second = await call('MANAGER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [{ menuItemId: emptyDish.id, quantity: 3, note: `${prefix} empty recipe` }] })
  check(first.id !== second.id, 'Checklist 14: additional order is a new FoodOrder')
  const detail = await call('CASHIER', 'GET', `/sessions/${session.sessionId}`)
  const historical = detail.orders.find((order) => order.id === first.id)
  check(historical.items[0].unitPriceAtOrder === 12000, 'Checklist 15: price snapshot survives menu price change')
  check(detail.orders.some((order) => order.id === second.id), 'Both batches remain in same session')
  await call('OWNER', 'PATCH', `/menu-items/${dish.id}/discontinue`)
  const choices = await call('WAITER', 'GET', '/menu-items?status=ON_SALE')
  check(!choices.some((item) => item.id === dish.id), 'Checklist 16: discontinued dish absent from ordering choices')
  await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [{ menuItemId: dish.id, quantity: 1 }] }, 409)
  await call('OWNER', 'PATCH', `/menu-items/${dish.id}/reactivate`)
  const [completed, cancelled, unavailable] = first.items
  await call('WAITER', 'PATCH', `/sessions/items/${cancelled.id}/cancel`)
  const afterCancelEvents = stream.events.length
  await call('WAITER', 'PATCH', `/sessions/items/${cancelled.id}/cancel`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${cancelled.id}/start`, undefined, 409)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${completed.id}/complete`, undefined, 409)
  await call('WAITER', 'PATCH', `/sessions/items/${completed.id}/serve`, undefined, 409)
  check(stream.events.length === afterCancelEvents, 'Invalid transitions and repeated cancel emit no ORDER')
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${completed.id}/start`)
  await call('WAITER', 'PATCH', `/sessions/items/${completed.id}/cancel`, undefined, 409)
  const startedEvents = stream.events.length
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${completed.id}/start`)
  check(stream.events.length === startedEvents, 'Repeated start emits no event')
  const invalidReason = await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${unavailable.id}/unavailable`, { reason: '  ' }, 400)
  check(!!invalidReason.fieldErrors.reason, 'Checklist 19: unavailable requires nonblank reason')
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${unavailable.id}/unavailable`, { reason: `${prefix} Hết nguyên liệu` })
  const awaiting = await call('WAITER', 'GET', '/sessions/items/awaiting-service')
  check(awaiting.some((item) => item.id === unavailable.id && item.unavailableReason.includes('Hết nguyên liệu')), 'Waiter receives unavailable reason')
  // Complete must use the recipe at completion, including changes after the order was placed.
  recipe[0].quantityPerServing = 0.15
  await call('HEAD_CHEF', 'PUT', `/menu-items/${dish.id}/recipe`, { lines: recipe })
  const countBeforeComplete = stream.events.length
  await Promise.all([
    call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${completed.id}/complete`),
    call('HEAD_CHEF', 'PATCH', `/kitchen/items/${completed.id}/complete`),
  ])
  await eventually(() => stream.events.length > countBeforeComplete)
  check(stream.events.length === countBeforeComplete + 1, 'Parallel complete broadcasts exactly one ORDER')
  let snapshot = databaseSnapshot()
  const consumption = snapshot.movements.filter((movement) => movement.orderItemId === completed.id)
  check(consumption.length === 2, 'Checklist 20–21: parallel complete creates one movement per recipe ingredient')
  check(consumption.some((movement) => movement.ingredientId === recipe[0].ingredientId && movement.quantityChange === -0.3) &&
    consumption.some((movement) => movement.ingredientId === recipe[1].ingredientId && movement.quantityChange === -0.4), 'Consumption uses current recipe × quantity with negative sign')
  check(consumption.every((movement) => movement.movementType === 'CONSUMPTION' && movement.lotId === null && movement.receiptItemId === null && movement.stocktakeItemId === null &&
    [auth.KITCHEN_STAFF.account.accountId, auth.HEAD_CHEF.account.accountId].includes(movement.performedById)), 'Consumption audit/source/lot fields correct')
  await call('WAITER', 'PATCH', `/sessions/items/${completed.id}/serve`)
  const servedEventCount = stream.events.length
  await call('WAITER', 'PATCH', `/sessions/items/${completed.id}/serve`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${completed.id}/complete`)
  check(stream.events.length === servedEventCount, 'SERVED retries do not broadcast or consume')
  const emptyItem = second.items[0]
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${emptyItem.id}/start`)
  await call('HEAD_CHEF', 'PATCH', `/kitchen/items/${emptyItem.id}/complete`)
  await call('WAITER', 'PATCH', `/sessions/items/${emptyItem.id}/serve`)
  snapshot = databaseSnapshot()
  check(!snapshot.movements.some((movement) => [emptyItem.id, cancelled.id, unavailable.id].includes(movement.orderItemId)), 'Unavailable/cancelled/empty recipe create no consumption')
  check(snapshot.movements.filter((movement) => movement.orderItemId === completed.id).length === 2, 'Complete after serve retains exactly original two movements')
  // Force a real DB write failure using numeric precision. Earlier valid movement insert must roll back too.
  await call('HEAD_CHEF', 'PUT', `/menu-items/${dish.id}/recipe`, { lines: [
    { ingredientId: ingredients[0].id, quantityPerServing: 0.001 }, { ingredientId: ingredients[1].id, quantityPerServing: 1000 },
  ] })
  const overflow = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [{ menuItemId: dish.id, quantity: 2147483647, note: `${prefix} transaction rollback` }] })
  const overflowItem = overflow.items[0]
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${overflowItem.id}/start`)
  const beforeRollbackEvents = stream.events.length
  const conflict = await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${overflowItem.id}/complete`, undefined, 409)
  check(conflict.code === 'DATA_CONFLICT' && !/sql|insert|postgres/i.test(conflict.message), 'DB conflict is clean generic 409 without SQL')
  const afterRollback = databaseSnapshot()
  const rollbackDetail = await call('WAITER', 'GET', `/sessions/${session.sessionId}`)
  check(!afterRollback.movements.some((movement) => movement.orderItemId === overflowItem.id), 'Rollback leaves no partial/orphan movement')
  check(rollbackDetail.orders.find((order) => order.id === overflow.id).items[0].status === 'COOKING', 'Rollback preserves COOKING state')
  check(stream.events.length === beforeRollbackEvents, 'Rolled-back complete emits no SSE event')
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${overflowItem.id}/unavailable`, { reason: `${prefix} Kết thúc ca kiểm thử rollback` })
  await call('HEAD_CHEF', 'PUT', `/menu-items/${dish.id}/recipe`, { lines: recipe })
  const finalDetail = await call('WAITER', 'GET', `/sessions/${session.sessionId}`)
  check(finalDetail.total === session.total + 39000, 'Server session total excludes CANCELLED/UNAVAILABLE and uses snapshots')
  const future = new Date(Date.now() + 30 * 86400_000)
  const reservation = await call('MANAGER', 'POST', '/reservations', { tableId: session.tableId, customerName: `${prefix} Event đặt bàn`, customerPhone: '0912345678', guestCount: 1,
    startTime: future.toISOString(), endTime: new Date(+future + 3600_000).toISOString() })
  await call('MANAGER', 'PATCH', `/reservations/${reservation.id}/cancel`)
  const reservationCount = stream.events.filter((event) => event.type === 'RESERVATION').length
  await call('MANAGER', 'PATCH', `/reservations/${reservation.id}/cancel`)
  check(stream.events.filter((event) => event.type === 'RESERVATION').length === reservationCount, 'Repeated reservation cancel emits no event')
  check(stream.events.every((event) => ['ORDER', 'RESERVATION'].includes(event.type) && Object.keys(event).every((key) => ['type', 'sessionId'].includes(key))), 'SSE contains only type/sessionId')
  const after = databaseSnapshot()
  check(after.service_session === before.service_session && after.invoice === before.invoice, 'API QA opens/closes no session and creates no invoice')
  await mkdir('.cache/phase2', { recursive: true })
  await writeFile('.cache/phase2/api-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), prefix, sessionId: session.sessionId, menuIds: menus, total: results.length, results, before, after, events: stream.events }, null, 2))
  console.log(`PASS ${results.length} API/ledger checks on real Neon; session ${session.sessionId}; +${after.food_order - before.food_order} orders, +${after.stock_movement - before.stock_movement} movements.`)
} finally {
  for (const id of menus) await call('OWNER', 'PATCH', `/menu-items/${id}/discontinue`)
  stream.close()
}
