import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll, roles } from './phase3-qa-support.mjs'

requireWriteApproval('phase4-api-check')
const auth = await loginAll()
const output = '.cache/phase4-api'
await mkdir(output, { recursive: true })
const resumeBilling = process.argv.includes('--resume-from-billing')
const resume = process.argv.includes('--resume-from-recipe') || resumeBilling
const evidence = resume ? JSON.parse(await readFile(`${output}/results.json`, 'utf8')) : { checkedAt: new Date().toISOString(), results: [], created: [], before: databaseSnapshot() }
let prefix = `[QA] Phase4 ${Date.now()}`
const period = { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' }
const query = new URLSearchParams(period)
const check = (value, label) => { assert(value, label); evidence.results.push(label) }
const save = () => writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
async function call(role, method, path, body, expected = 200, token) {
  const response = await fetch(`${base}/api${path}`, { method,
    headers: { ...(role ? { Authorization: `Bearer ${token ?? auth[role].accessToken}` } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  const value = await response.json()
  assert([expected].flat().includes(response.status), `${role} ${method} ${path}: ${response.status} ${value.code ?? ''}, expected ${expected}`)
  evidence.results.push(`${role ?? 'anonymous'} ${method} ${path} -> ${response.status}`)
  if (response.status === 200 && method === 'POST' && !path.startsWith('/auth')) {
    evidence.created.push({ path, id: value.id ?? value.sessionId, ...(path === '/sessions' ? { tableId: body.tableId } : {}) })
    await save()
  }
  return { ...value, httpStatus: response.status }
}
const get = async (role, path) => { const result = await fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${auth[role].accessToken}` }, signal: AbortSignal.timeout(20000) }); assert.equal(result.status, 200, path); return result.json() }
let ingredient, menu, table, sessionId, first, second, main, cancelled, unavailable
try {
  if (resume) {
    assert(evidence.failure && (resumeBilling ? evidence.sessionId && !evidence.invoiceId : !evidence.sessionId), 'Verify supported interruption stage')
    await writeFile(`${output}/interrupted-${Date.now()}.json`, JSON.stringify(evidence, null, 2))
    ingredient = (await get('OWNER', '/inventory/ingredients')).find((item) => item.id === evidence.created.find((item) => item.path === '/inventory/ingredients').id)
    menu = (await get('OWNER', '/menu-items')).find((item) => item.id === evidence.created.find((item) => item.path === '/menu-items').id)
    assert(ingredient?.name.startsWith('[QA] Phase4 ') && menu?.name.startsWith('[QA] Phase4 '), 'Verify QA fixtures before resuming')
    prefix = menu.name.slice(0, -4)
    evidence.resumedAt = new Date().toISOString()
    delete evidence.failure
    if (!resumeBilling) await call('OWNER', 'PATCH', `/menu-items/${menu.id}/reactivate`)
  } else {
  console.log('Checking security and input validation')
  const invalidRange = { startTime: period.to, endTime: period.from, actualAmount: 0 }
  const matrix = [
    ['GET', `/payments/summary?${query}`, undefined, ['OWNER'], 200],
    ['GET', `/reconciliations/preview?${query}`, undefined, ['CASHIER'], 200],
    ['GET', '/reconciliations', undefined, ['CASHIER', 'MANAGER'], 200],
    ['POST', '/reconciliations', invalidRange, ['CASHIER'], 400],
    ['PATCH', '/reconciliations/9223372036854775806/confirm', undefined, ['MANAGER'], 404],
  ]
  for (const [method, path, body, allowed, expected] of matrix) {
    await call(null, method, path, body, 401)
    for (const role of roles) await call(role, method, path, body, allowed.includes(role) ? expected : 403)
  }
  for (const actualAmount of [-1, 0.1, 100000000000000, null]) await call('CASHIER', 'POST', '/reconciliations', { startTime: period.from, endTime: period.to, actualAmount }, 400)
  await call('CASHIER', 'POST', '/reconciliations', { startTime: period.from, endTime: period.to, actualAmount: 0, differenceReason: 'x'.repeat(501) }, 400)
  await call('OWNER', 'GET', `/payments/summary?from=${period.to}&to=${period.from}`, undefined, 400)
  await call('CASHIER', 'GET', '/reconciliations/preview', undefined, 400)
  await call('MANAGER', 'GET', '/reconciliations?size=101', undefined, 400)
  const empty = await call('CASHIER', 'GET', '/reconciliations/preview?from=1970-01-01T00:00:00Z&to=1970-01-02T00:00:00Z')
  check(empty.systemRevenue === 0 && empty.invoiceCount === 0 && empty.methods.length === 2, 'Empty period returns zero for both methods')
  const wrongPhone = await call(null, 'POST', '/auth/login', { phone: '0999999999', password: 'wrong-pass' }, 401)
  const wrongPass = await call(null, 'POST', '/auth/login', { phone: '0900000001', password: 'wrong-pass' }, 401)
  check(wrongPhone.message === wrongPass.message, 'Checklist 2: generic invalid credentials')
  const qaPhone = `098${String(Date.now()).slice(-7)}`
  const qaAccount = await call('OWNER', 'POST', '/accounts', { fullName: `${prefix} Tài khoản`, phone: qaPhone, password: 'QaDemo@123', role: 'CASHIER' })
  await call('OWNER', 'POST', '/accounts', { fullName: prefix, phone: qaPhone, password: 'QaDemo@123', role: 'WAITER' }, 409)
  const qaAuth = await call(null, 'POST', '/auth/login', { phone: qaPhone, password: 'QaDemo@123' })
  await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/role`, { role: 'WAITER' })
  await call('OWNER', 'PATCH', `/accounts/${qaAccount.id}/lock`)
  await call(null, 'POST', '/auth/login', { phone: qaPhone, password: 'QaDemo@123' }, 401)
  const retained = await call('CASHIER', 'GET', '/auth/me', undefined, 200, qaAuth.accessToken)
  check(retained.role === 'CASHIER', 'Checklist 3/D10: locked or changed account retains old JWT role')
  await call('OWNER', 'PATCH', `/accounts/${auth.OWNER.account.accountId}/lock`, undefined, 409)
  await call('OWNER', 'PATCH', `/accounts/${auth.OWNER.account.accountId}/role`, { role: 'MANAGER' }, 409)

  console.log('Checking inventory and recipe regression')
  ingredient = await call('OWNER', 'POST', '/inventory/ingredients', { name: `${prefix} NVL`, unit: 'kg', minStock: 50, trackLot: true, trackExpiry: true })
  await call('HEAD_CHEF', 'POST', '/inventory/receipts', { items: [{ ingredientId: ingredient.id, quantity: 1 }] }, 400)
  const localDate = (offset) => new Date(Date.now() + (7 * 60 * 60 * 1000) + offset * 86400000).toISOString().slice(0, 10)
  const receipt = await call('HEAD_CHEF', 'POST', '/inventory/receipts', { items: [-1, 0, 3, 4].map((day) => ({ ingredientId: ingredient.id, quantity: 5, lotNumber: `${prefix} HSD ${day}`, expiryDate: localDate(day) })) })
  check(receipt.items.length === 4 && receipt.items.every((item) => item.lotId), 'Checklist 23: receipt details and lots created atomically')
  const lots = await get('OWNER', '/inventory/lots/attention')
  const qaLots = lots.filter((lot) => lot.ingredientId === ingredient.id)
  check(qaLots.length === 3 && qaLots.some((lot) => lot.expiryDate === localDate(-1) && lot.status === 'EXPIRED') && qaLots.some((lot) => lot.expiryDate === localDate(3)), 'Checklist 27: expired/today/today+3 included, day+4 excluded')
  await call('OWNER', 'PUT', `/inventory/ingredients/${ingredient.id}`, { name: ingredient.name, unit: 'g', minStock: 50, trackLot: true, trackExpiry: true }, 409)
  await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', { items: [{ ingredientId: ingredient.id, actualQuantity: 1 }, { ingredientId: ingredient.id, actualQuantity: 2 }] }, 400)
  const counted = await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', { items: [{ ingredientId: ingredient.id, actualQuantity: 18, note: prefix }] })
  check(counted.items[0].systemQuantity === 20 && counted.items[0].difference === -2, 'Checklist 24/D7: system and difference recomputed')
  const movementsBeforeZero = await get('OWNER', `/inventory/movements?ingredientId=${ingredient.id}&size=100`)
  await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', { items: [{ ingredientId: ingredient.id, actualQuantity: 18 }] })
  const movementsAfterZero = await get('OWNER', `/inventory/movements?ingredientId=${ingredient.id}&size=100`)
  check(movementsAfterZero.total === movementsBeforeZero.total, 'Checklist 24: zero difference creates no movement')
  for (const quantity of [0, -1, 999]) await call('HEAD_CHEF', 'POST', '/inventory/disposals', { ingredientId: ingredient.id, quantity, reason: prefix }, 400)
  await call('HEAD_CHEF', 'POST', '/inventory/disposals', { ingredientId: ingredient.id, quantity: 1, reason: '' }, 400)
  await call('HEAD_CHEF', 'POST', '/inventory/disposals', { ingredientId: ingredient.id, quantity: 2, reason: `${prefix} Loại bỏ`, lotId: receipt.items[0].lotId })
  menu = await call('OWNER', 'POST', '/menu-items', { name: `${prefix} Món`, price: 12345 })
  await call('HEAD_CHEF', 'PUT', `/menu-items/${menu.id}/recipe`, { lines: [{ ingredientId: ingredient.id, quantityPerServing: 0.1 }] })
  await call('OWNER', 'PATCH', `/inventory/ingredients/${ingredient.id}/deactivate`)
  await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', { items: [{ ingredientId: ingredient.id, actualQuantity: 16 }] }, 400)
  await call('HEAD_CHEF', 'PUT', `/menu-items/${menu.id}/recipe`, { lines: [{ ingredientId: ingredient.id, quantityPerServing: 0.125 }] })
  }
  check((await get('HEAD_CHEF', `/menu-items/${menu.id}/recipe`))[0].quantityPerServing === 0.125, 'Retained inactive recipe line can change quantity')

  if (resumeBilling) {
    sessionId = evidence.sessionId
    const detail = await get('WAITER', `/sessions/${sessionId}`)
    assert(detail.status === 'ACTIVE' && detail.orders.length === 2 && detail.orders[0].items[0].menuItemId === menu.id, 'Verify interrupted QA session and orders')
    table = (await get('WAITER', '/tables/floor-plan')).flatMap((area) => area.tables).find((item) => item.id === evidence.tableId)
    assert(table.activeSessionId === sessionId)
    ;[first, second] = detail.orders
    ;[main, cancelled, unavailable] = first.items
    assert(main.status === 'SERVED' && second.items[0].status === 'READY')
  } else {
  console.log('Checking reservations, sessions, kitchen and payment')
  const floor = await get('WAITER', '/tables/floor-plan')
  table = floor.flatMap((area) => area.tables).find((item) => item.status === 'AVAILABLE' && !item.activeSessionId)
  assert(table, 'A verified free table is required')
  evidence.tableId = table.id
  const startTime = new Date(Date.now() + 3600000).toISOString(), endTime = new Date(Date.now() + 7200000).toISOString()
  const booking = { tableId: table.id, customerName: prefix, customerPhone: '0912345678', guestCount: 1, startTime, endTime, note: prefix }
  await call('MANAGER', 'POST', '/reservations', { ...booking, guestCount: table.capacity + 1 }, 409)
  const reservation = await call('MANAGER', 'POST', '/reservations', booking)
  await call('MANAGER', 'POST', '/reservations', booking, 409)
  const touching = await call('MANAGER', 'POST', '/reservations', { ...booking, startTime: endTime, endTime: new Date(Date.parse(endTime) + 3600000).toISOString() })
  await call('MANAGER', 'PATCH', `/reservations/${touching.id}/cancel`)
  await call('MANAGER', 'PATCH', `/reservations/${reservation.id}/cancel`)
  const history = await get('MANAGER', `/reservations?q=${encodeURIComponent(prefix)}&size=100`)
  check(history.items.some((item) => item.id === reservation.id && item.status === 'CANCELLED'), 'Checklist 8–9: touching allowed and cancelled history retained')
  const openings = await Promise.all([call('WAITER', 'POST', '/sessions', { tableId: table.id }, [200, 409]), call('MANAGER', 'POST', '/sessions', { tableId: table.id }, [200, 409])])
  check(openings.filter((item) => item.httpStatus === 200).length === 1, 'Checklist 11/13: walk-in race opens exactly one ACTIVE session')
  sessionId = openings.find((item) => item.httpStatus === 200).sessionId
  evidence.sessionId = sessionId
  for (const items of [[{ menuItemId: menu.id, quantity: 100 }], Array.from({ length: 51 }, () => ({ menuItemId: menu.id, quantity: 1 }))]) await call('WAITER', 'POST', `/sessions/${sessionId}/orders`, { items }, 400)
  first = await call('WAITER', 'POST', `/sessions/${sessionId}/orders`, { items: [{ menuItemId: menu.id, quantity: 2, note: prefix }, { menuItemId: menu.id, quantity: 1 }, { menuItemId: menu.id, quantity: 1 }] })
  await call('OWNER', 'PUT', `/menu-items/${menu.id}`, { name: menu.name, price: 23456 })
  second = await call('MANAGER', 'POST', `/sessions/${sessionId}/orders`, { items: [{ menuItemId: menu.id, quantity: 1, note: prefix }] })
  check(first.id !== second.id && first.items[0].unitPriceAtOrder === 12345 && second.items[0].unitPriceAtOrder === 23456, 'Checklist 14–15: separate batches and historical price snapshot')
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
  await call('WAITER', 'POST', `/sessions/${sessionId}/orders`, { items: [{ menuItemId: menu.id, quantity: 1 }] }, 409)
  ;[main, cancelled, unavailable] = first.items
  await call('WAITER', 'PATCH', `/sessions/items/${cancelled.id}/cancel`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${unavailable.id}/unavailable`, { reason: '' }, 400)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${unavailable.id}/unavailable`, { reason: `${prefix} Hết nguyên liệu` })
  const awaiting = await get('WAITER', '/sessions/items/awaiting-service')
  check(awaiting.some((item) => item.id === unavailable.id && item.unavailableReason.includes(prefix)), 'Checklist 19: waiter sees unavailable reason')
  await call('WAITER', 'PATCH', `/sessions/items/${main.id}/serve`, undefined, 409)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${main.id}/start`)
  await call('WAITER', 'PATCH', `/sessions/items/${main.id}/cancel`, undefined, 409)
  await call('CASHIER', 'POST', '/payments', { sessionId, paymentMethod: 'CASH' }, 400)
  await Promise.all([call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${main.id}/complete`), call('HEAD_CHEF', 'PATCH', `/kitchen/items/${main.id}/complete`)])
  await call('WAITER', 'PATCH', `/sessions/items/${main.id}/serve`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${second.items[0].id}/start`)
  await call('HEAD_CHEF', 'PATCH', `/kitchen/items/${second.items[0].id}/complete`)
  }
  const movements = await get('OWNER', `/inventory/movements?ingredientId=${ingredient.id}&size=100`)
  const ledger = databaseSnapshot().movements
  check(ledger.filter((item) => item.orderItemId === main.id).length === 1 && ledger.some((item) => item.orderItemId === main.id && item.change === -0.25), 'Checklist 20–21: parallel complete consumes inactive retained recipe once')
  check(new Set(movements.items.map((item) => item.movementType)).size === 4 && movements.items.every((item) => item.source && item.performedById && item.occurredAt), 'Checklist 28: all four movement types with source/audit')
  const stock = (await get('OWNER', '/inventory/ingredients')).find((item) => item.id === ingredient.id)
  check(Math.abs(stock.currentStock - movements.items.reduce((sum, item) => sum + item.quantityChange, 0)) < 0.00001 && stock.belowMinStock, 'Checklist 26–27: stock equals ledger and low-stock threshold')
  const oldPreview = await call('CASHIER', 'GET', `/reconciliations/preview?${query}`)
  const invoices = await Promise.all([call('CASHIER', 'POST', '/payments', { sessionId, paymentMethod: 'BANK_TRANSFER' }, [200, 409]), call('CASHIER', 'POST', '/payments', { sessionId, paymentMethod: 'CASH' }, [200, 409])])
  check(invoices.filter((item) => item.httpStatus === 200).length === 1, 'Checklist 31: parallel pay creates one Invoice and loser 409')
  const invoice = invoices.find((item) => item.httpStatus === 200)
  evidence.invoiceId = invoice.id
  check(invoice.amount === 48146, 'Checklist 29/D8: READY counted, cancelled/unavailable excluded, snapshot prices')
  const closed = await get('CASHIER', `/sessions/${sessionId}`)
  const released = (await get('WAITER', '/tables/floor-plan')).flatMap((area) => area.tables).find((item) => item.id === table.id)
  check(closed.status === 'CLOSED' && closed.closedAt && released.status === 'AVAILABLE' && !released.activeSessionId, 'Checklist 32: paid session closed and table released')
  await call('WAITER', 'PATCH', `/sessions/items/${main.id}/serve`, undefined, 409)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${second.items[0].id}/complete`, undefined, 409)

  console.log('Checking reconciliation D9, confirmation race and reports')
  const reconciliation = await call('CASHIER', 'POST', '/reconciliations', { startTime: period.from, endTime: period.to, actualAmount: 0, differenceReason: prefix, systemRevenue: -1, cashierId: 1, managerId: 1 })
  evidence.reconciliationId = reconciliation.id
  check(reconciliation.systemRevenue === oldPreview.systemRevenue + invoice.amount && reconciliation.cashierId === auth.CASHIER.account.accountId && reconciliation.managerId === null && reconciliation.difference === -reconciliation.systemRevenue, 'Checklist 33: POST ignores forged totals/actors and recomputes stale preview')
  const confirmations = await Promise.all([call('MANAGER', 'PATCH', `/reconciliations/${reconciliation.id}/confirm`, undefined, [200, 409]), call('MANAGER', 'PATCH', `/reconciliations/${reconciliation.id}/confirm`, undefined, [200, 409])])
  check(confirmations.filter((item) => item.httpStatus === 200).length === 1, 'Checklist 34: two real concurrent confirms have one success and one 409')
  const confirmed = confirmations.find((item) => item.httpStatus === 200)
  check(confirmed.managerId === auth.MANAGER.account.accountId && confirmed.reconciledAt === reconciliation.reconciledAt && confirmed.systemRevenue === reconciliation.systemRevenue && confirmed.actualAmount === reconciliation.actualAmount && confirmed.differenceReason === prefix, 'Confirm only assigns JWT manager and preserves snapshot/time')
  await call('MANAGER', 'PATCH', `/reconciliations/${reconciliation.id}/confirm`, undefined, 409)
  const overlap = await call('CASHIER', 'POST', '/reconciliations', { startTime: period.from, endTime: period.to, actualAmount: reconciliation.systemRevenue + 10 })
  check(overlap.difference === 10 && overlap.differenceReason === null, 'Overlapping periods, positive difference and optional reason allowed')
  const pending = await get('MANAGER', '/reconciliations?confirmed=false&size=100')
  check(pending.items.some((item) => item.id === overlap.id) && !pending.items.some((item) => item.id === reconciliation.id), 'Pending list filters by manager null')
  const summary = await get('OWNER', `/payments/summary?${query}`)
  const top = summary.topItems.find((item) => item.menuItemId === menu.id)
  check(summary.revenue.systemRevenue === reconciliation.systemRevenue && summary.revenue.methods.reduce((sum, item) => sum + item.revenue, 0) === summary.revenue.systemRevenue && top.quantity === 3 && top.revenue === 48146, 'Reports: no duplicate Invoice totals; top quantity/READY/snapshot/paid sessions correct')
  const seatedReservation = await call('MANAGER', 'POST', '/reservations', { tableId: table.id, customerName: `${prefix} Nhận bàn`, customerPhone: '0912345678', guestCount: 1, startTime: new Date(Date.now()).toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), note: prefix })
  const seated = await call('WAITER', 'POST', '/sessions', { tableId: table.id, reservationId: seatedReservation.id })
  await call('MANAGER', 'PATCH', `/reservations/${seatedReservation.id}/cancel`, undefined, 409)
  const seatedDetail = await get('WAITER', `/sessions/${seated.sessionId}`)
  check(seatedDetail.reservation?.id === seatedReservation.id, 'Checklist 12: reservation linked and seated cancellation blocked')
  const zeroInvoice = await call('CASHIER', 'POST', '/payments', { sessionId: seated.sessionId, paymentMethod: 'CASH' })
  check(zeroInvoice.amount === 0, 'D8: empty reservation session bills zero and releases table')
  const afterZero = await get('OWNER', `/payments/summary?${query}`)
  check(afterZero.revenue.systemRevenue === summary.revenue.systemRevenue && afterZero.revenue.invoiceCount === summary.revenue.invoiceCount + 1, 'Zero Invoice increases count without changing revenue or snapshot')
  const savedReconciliation = (await get('CASHIER', '/reconciliations?confirmed=true&size=100')).items.find((item) => item.id === reconciliation.id)
  check(savedReconciliation.systemRevenue === reconciliation.systemRevenue && savedReconciliation.reconciledAt === reconciliation.reconciledAt, 'Committed reconciliation survives refetch and later invoice')
  await call('OWNER', 'PATCH', `/inventory/ingredients/${ingredient.id}/activate`)
  await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', { items: [{ ingredientId: ingredient.id, actualQuantity: 0, note: `${prefix} Explicit zero` }] })
  check((await get('OWNER', '/inventory/ingredients')).find((item) => item.id === ingredient.id).currentStock === 0, 'Explicit zero stocktake is retained')
  evidence.completed = true
} catch (error) {
  evidence.failure = error.message
  throw error
} finally {
  if (menu) await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
  if (ingredient) await call('OWNER', 'PATCH', `/inventory/ingredients/${ingredient.id}/deactivate`)
  evidence.after = databaseSnapshot()
  await save()
  console.log(JSON.stringify({ completed: evidence.completed ?? false, checks: evidence.results.length, created: evidence.created }))
}
