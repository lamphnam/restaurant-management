import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, eventually, loginAll, selectQaSession } from './phase2-qa-support.mjs'

// Uses real app/API/Neon. Writes QA menu/recipe/orders/consumption and opens ONE table for FLOOR_PLAN SSE.
// SSE transport is deliberately blocked only for the fallback/reconnect cases; business REST is never mocked.
requireWriteApproval('phase2-browser-check')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const auth = await loginAll()
async function call(role, method, url, body) {
  const response = await fetch(`${base}/api${url}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20_000) })
  assert.equal(response.status, 200, `${role} ${method} ${url}`)
  return response.json()
}
const before = databaseSnapshot()
const session = await selectQaSession(call)
const prefix = `[QA] Phase2 UI ${Date.now()}`
const dish = await call('OWNER', 'POST', '/menu-items', { name: `${prefix} Món thử`, price: 15000 })
const ingredients = await call('HEAD_CHEF', 'GET', '/inventory/ingredients?status=ACTIVE')
await call('HEAD_CHEF', 'PUT', `/menu-items/${dish.id}/recipe`, { lines: [{ ingredientId: ingredients[0].id, quantityPerServing: 0.1 }] })
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = [], errors = [], warnings = [], timings = {}
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
await mkdir('.cache/phase2/screenshots', { recursive: true })
const contexts = []
async function newContext() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'UTC', locale: 'vi-VN' })
  contexts.push(context)
  context.on('page', (page) => {
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()) })
  })
  return context
}
async function login(page, phone, landing) {
  await page.goto(`${frontend}/login`)
  await page.getByLabel('Số điện thoại', { exact: true }).fill(phone)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_PASSWORD ?? 'Demo@123')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL(`${frontend}${landing}`)
}
async function noOverflow(page, label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label)
  pass(label)
}
async function addOrder(note, count = 1) {
  return call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [{ menuItemId: dish.id, quantity: count, note: `${prefix} ${note}` }] })
}
let newSessionId
try {
  const waiterContext = await newContext(), kitchenContext = await newContext()
  const waiter = await waiterContext.newPage(), kitchen = await kitchenContext.newPage()
  await login(waiter, '0900000004', '/floor-plan')
  await login(kitchen, '0900000005', '/kitchen')
  await waiter.goto(`${frontend}/sessions/${session.sessionId}`)
  await waiter.getByRole('heading', { name: `Phiên #${session.sessionId} · ${session.tableName}`, exact: true }).waitFor()
  const awaiting = await waiterContext.newPage()
  await awaiting.goto(`${frontend}/awaiting-service`)
  const floor = await waiterContext.newPage()
  await floor.goto(`${frontend}/floor-plan`)
  await floor.locator('[data-table-name]').first().waitFor()
  // Submit an actual order through the user interface.
  await waiter.getByRole('button', { name: /Gọi món|Gọi thêm/, exact: true }).click()
  const dialog = waiter.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Gửi bếp', exact: true }).click()
  await dialog.getByText('Chọn món', { exact: true }).waitFor()
  pass('Order form rejects missing dish inline')
  await dialog.getByRole('combobox').click()
  await dialog.getByRole('combobox').fill(dish.name)
  await waiter.locator('.ant-select-item-option').filter({ hasText: dish.name }).click()
  await dialog.getByLabel('Số lượng', { exact: true }).fill('2')
  await dialog.getByLabel('Ghi chú cho bếp', { exact: true }).fill(`${prefix} UI order`)
  const received = waiter.waitForResponse((response) => response.url().endsWith(`/sessions/${session.sessionId}/orders`) && response.request().method() === 'POST')
  const orderTime = Date.now()
  await dialog.getByRole('button', { name: 'Gửi bếp', exact: true }).click()
  const orderResponse = await received
  const orderCommittedAt = Date.now()
  assert.equal(orderResponse.status(), 200)
  const order = await orderResponse.json(), item = order.items[0]
  const kitchenCard = kitchen.locator(`[data-item-id="${item.id}"]`)
  await kitchenCard.waitFor({ timeout: 3000 })
  timings.newOrderMs = Date.now() - orderTime
  timings.newOrderAfterResponseMs = Date.now() - orderCommittedAt
  assert(timings.newOrderAfterResponseMs <= 2200, 'Kitchen SSE latency after successful response')
  pass('WAITER UI order reaches KITCHEN_STAFF without F5 within 2.2s after commit response')
  const sessionCard = waiter.locator(`[data-item-id="${item.id}"]`)
  await sessionCard.getByRole('button', { name: 'Hủy món', exact: true }).click()
  await waiter.getByRole('button', { name: 'Giữ món', exact: true }).click()
  assert(await sessionCard.getByRole('button', { name: 'Hủy món', exact: true }).isVisible())
  pass('Cancel requires Popconfirm and declining preserves the dish')
  await kitchenCard.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  await sessionCard.getByText('Đang chế biến', { exact: true }).waitFor({ timeout: 3000 })
  assert.equal(await sessionCard.getByRole('button', { name: 'Hủy món', exact: true }).count(), 0)
  pass('Start updates session without F5 and removes cancel action')
  const completeTime = Date.now()
  const completedResponse = kitchen.waitForResponse((response) => response.url().endsWith(`/kitchen/items/${item.id}/complete`))
  await kitchenCard.getByRole('button', { name: 'Hoàn thành', exact: true }).click()
  await completedResponse
  const completedAt = Date.now()
  const readyCard = awaiting.locator(`[data-item-id="${item.id}"]`)
  await readyCard.waitFor({ timeout: 3000 })
  timings.completeMs = Date.now() - completeTime
  timings.completeAfterResponseMs = Date.now() - completedAt
  assert(timings.completeAfterResponseMs <= 2200, 'Waiter SSE latency after successful response')
  pass('Kitchen complete reaches awaiting-service without F5 within 2.2s after commit response')
  await readyCard.getByRole('button', { name: 'Đã phục vụ', exact: true }).click()
  await readyCard.waitFor({ state: 'detached' })
  await sessionCard.getByText('Đã phục vụ', { exact: true }).waitFor()
  pass('Serve removes READY card and updates session to SERVED')
  // A second batch is added through UI and cancelled through Popconfirm.
  await waiter.getByRole('button', { name: 'Gọi thêm', exact: true }).click()
  await waiter.getByRole('dialog').getByRole('combobox').click()
  await waiter.getByRole('dialog').getByRole('combobox').fill(dish.name)
  await waiter.locator('.ant-select-item-option').filter({ hasText: dish.name }).click()
  const extraResponse = waiter.waitForResponse((response) => response.url().endsWith(`/sessions/${session.sessionId}/orders`) && response.request().method() === 'POST')
  await waiter.getByRole('dialog').getByRole('button', { name: 'Gửi bếp', exact: true }).click()
  const extra = await (await extraResponse).json()
  assert.notEqual(extra.id, order.id)
  const extraCard = waiter.locator(`[data-item-id="${extra.items[0].id}"]`)
  await extraCard.getByRole('button', { name: 'Hủy món', exact: true }).click()
  await waiter.getByRole('tooltip').getByRole('button', { name: 'Hủy món', exact: true }).click()
  await extraCard.getByText('Đã hủy', { exact: true }).waitFor()
  pass('Additional UI order is a new batch; pending cancel succeeds')
  const unavailableOrder = await addOrder('Unavailable UI')
  const unavailableItem = unavailableOrder.items[0]
  const unavailableCard = kitchen.locator(`[data-item-id="${unavailableItem.id}"]`)
  await unavailableCard.getByRole('button', { name: 'Không thể chế biến', exact: true }).click()
  await kitchen.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await kitchen.getByText('Vui lòng nhập lý do không thể chế biến', { exact: true }).waitFor()
  pass('Kitchen unavailable dialog requires a reason')
  await kitchen.getByLabel('Lý do cần báo khách', { exact: true }).fill(`${prefix} Hết nguyên liệu`)
  await kitchen.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click()
  const unavailableAwaiting = awaiting.locator(`[data-item-id="${unavailableItem.id}"]`)
  await unavailableAwaiting.getByText(`${prefix} Hết nguyên liệu`, { exact: false }).waitFor({ timeout: 3000 })
  assert.equal(await unavailableAwaiting.getByRole('button', { name: 'Đã phục vụ' }).count(), 0)
  pass('Unavailable reason reaches waiter without F5; no serve action')
  // FLOOR_PLAN event: one new QA session, no reset or release.
  const free = (await call('WAITER', 'GET', '/tables/floor-plan')).flatMap((area) => area.tables).find((table) => table.status === 'AVAILABLE' && !table.activeSessionId)
  assert(free, 'One free table required for FLOOR_PLAN event check')
  const floorTime = Date.now()
  const opened = await call('WAITER', 'POST', '/sessions', { tableId: free.id })
  const openedAt = Date.now()
  newSessionId = opened.sessionId
  await floor.locator(`[data-table-name="${free.name}"]`).getByText('Đang phục vụ', { exact: true }).waitFor({ timeout: 3000 })
  timings.floorPlanMs = Date.now() - floorTime
  timings.floorPlanAfterResponseMs = Date.now() - openedAt
  assert(timings.floorPlanAfterResponseMs <= 2200)
  pass('FLOOR_PLAN event updates existing floor page without F5')
  // Manager uses session but cannot serve or open awaiting-service.
  const managerContext = await newContext(), manager = await managerContext.newPage()
  await login(manager, '0900000002', '/reservations')
  await manager.goto(`${frontend}/sessions/${session.sessionId}`)
  await manager.getByRole('button', { name: 'Gọi thêm', exact: true }).waitFor()
  assert.equal(await manager.getByRole('button', { name: 'Đã phục vụ', exact: true }).count(), 0)
  await manager.goto(`${frontend}/awaiting-service`)
  await manager.getByText('Bạn không có quyền truy cập trang này', { exact: false }).waitFor()
  pass('Manager route permissions and serve visibility preserved')
  await waiter.reload()
  await waiter.locator(`[data-item-id="${item.id}"]`).getByText('Đã phục vụ', { exact: true }).waitFor()
  pass('Reload retains committed orders, snapshots and statuses')
  // Reconnect catches changes missed while SSE transport is down. REST remains real.
  let dropStream = true, streamRequests = 0
  await kitchen.route('**/api/events', async (route) => { streamRequests++; if (dropStream) await route.abort(); else await route.continue() })
  await kitchen.reload()
  await kitchen.getByRole('heading', { name: 'Bếp', exact: true }).waitFor()
  await eventually(() => streamRequests > 0)
  const reconnectOrder = await addOrder('Reconnect missed event')
  const reconnectItem = reconnectOrder.items[0]
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.equal(await kitchen.locator(`[data-item-id="${reconnectItem.id}"]`).count(), 0)
  const reconnectTime = Date.now(); dropStream = false
  await kitchen.locator(`[data-item-id="${reconnectItem.id}"]`).waitFor({ timeout: 4500 })
  timings.reconnectMs = Date.now() - reconnectTime
  pass('SSE reconnect refetches a missed order without F5')
  await call('WAITER', 'PATCH', `/sessions/items/${reconnectItem.id}/cancel`)
  // Disable stream for full 30s polling test; actual timer is used, without time mocking.
  dropStream = true
  await kitchen.reload()
  await kitchen.getByRole('heading', { name: 'Bếp', exact: true }).waitFor()
  const pollingOrder = await addOrder('Polling fallback')
  const pollingItem = pollingOrder.items[0], pollingTime = Date.now()
  await new Promise((resolve) => setTimeout(resolve, 500))
  assert.equal(await kitchen.locator(`[data-item-id="${pollingItem.id}"]`).count(), 0)
  await kitchen.locator(`[data-item-id="${pollingItem.id}"]`).waitFor({ timeout: 35_000 })
  timings.pollingMs = Date.now() - pollingTime
  assert(timings.pollingMs >= 20_000 && timings.pollingMs <= 35_000)
  pass('Actual 30-second polling refreshes kitchen when SSE is unavailable')
  await call('WAITER', 'PATCH', `/sessions/items/${pollingItem.id}/cancel`)
  dropStream = false
  for (const [page, name] of [[waiter, 'session'], [kitchen, 'kitchen'], [awaiting, 'awaiting']]) {
    await page.setViewportSize({ width: 1024, height: 768 })
    await noOverflow(page, `${name}: tablet landscape has no horizontal overflow`)
    await page.screenshot({ path: `.cache/phase2/screenshots/${name}-tablet.png`, fullPage: true })
    await page.setViewportSize({ width: 768, height: 1024 })
    await noOverflow(page, `${name}: tablet portrait has no horizontal overflow`)
    await page.setViewportSize({ width: 375, height: 812 })
    await noOverflow(page, `${name}: small phone has no horizontal overflow`)
  }
  // A separate single-page context makes active stream accounting exact on logout/login.
  const cleanupContext = await newContext(), cleanup = await cleanupContext.newPage(), active = new Set()
  cleanup.on('request', (request) => { if (request.url().endsWith('/api/events')) active.add(request) })
  const end = (request) => active.delete(request)
  cleanup.on('requestfinished', end); cleanup.on('requestfailed', end)
  await login(cleanup, '0900000005', '/kitchen')
  await eventually(() => active.size === 1)
  await cleanup.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await cleanup.waitForURL(`${frontend}/login`)
  await eventually(() => active.size === 0)
  await login(cleanup, '0900000005', '/kitchen')
  await eventually(() => active.size === 1)
  pass('Logout closes stream; login creates exactly one connection')
  assert.equal(errors.length, 0, errors.join('\n'))
  pass('No uncaught browser JavaScript errors')
  const after = databaseSnapshot()
  const movement = after.movements.filter((entry) => entry.orderItemId === item.id)
  assert.equal(movement.length, 1); assert.equal(movement[0].quantityChange, -0.2)
  assert.equal(after.service_session, before.service_session + 1)
  await writeFile('.cache/phase2/browser-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), prefix, sessionId: session.sessionId, newSessionId, menuId: dish.id, total: results.length, results, timings, errors, warnings: [...new Set(warnings)], before, after }, null, 2))
  console.log(`PASS ${results.length} real-browser checks. Timings: ${JSON.stringify(timings)}; new session ${newSessionId} remains ACTIVE.`)
} catch (error) {
  await writeFile(`.cache/phase2/browser-failure-${Date.now()}.json`, JSON.stringify({ prefix, sessionId: session.sessionId, newSessionId, menuId: dish.id, results, timings, error: error.message, after: databaseSnapshot() }, null, 2))
  for (const [index, context] of contexts.entries()) {
    for (const [pageIndex, page] of context.pages().entries()) await page.screenshot({ path: `.cache/phase2/screenshots/failure-${index}-${pageIndex}.png` }).catch(() => {})
  }
  throw error
} finally {
  await call('OWNER', 'PATCH', `/menu-items/${dish.id}/discontinue`)
  await Promise.all(contexts.map((context) => context.close()))
  await browser.close()
}
