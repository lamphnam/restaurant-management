import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Stateful API mocks only. Every /api request is intercepted; nothing reaches Neon.
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const channel = process.env.BROWSER_CHANNEL ?? 'chrome'
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:15173'
assert.match(frontend, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const output = `.cache/issues-ui-${channel}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel, headless: true })
const results = [], errors = [], unexpected = []
let activePage
const pass = (message) => { results.push(message); console.log(`PASS ${message}`) }
const at = '2026-11-01T10:00:00Z'
const queueItem = (id, status, extra = {}) => ({ id, sessionId: 3, orderId: 30, tableId: 1, tableName: 'T01', tableCode: 'T01-B01', menuItemName: `Món ${id}`, quantity: 1, note: null, orderedAt: at, status, unavailableReason: status === 'UNAVAILABLE' ? 'Hết nguyên liệu' : null, ...extra })

async function fixture(role, width = 1024) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, timezoneId: 'America/New_York', reducedMotion: 'reduce' })
  await context.addInitScript(() => localStorage.setItem('restaurant.session', JSON.stringify({ accessToken: 'isolated-ui-mock', expiresAt: new Date(Date.now() + 3600000).toISOString() })))
  const state = {
    items: [queueItem(1, 'PENDING'), queueItem(2, 'COOKING'), queueItem(3, 'READY', { quantity: 50 }), queueItem(4, 'UNAVAILABLE')],
    startMode: 'WARNING', closed: false, ack: false, updates: [], availableRequests: [], recipeWrites: [],
    recipe: [{ ingredientId: 1, ingredientName: 'Gạo', quantityPerServing: 0.2, unit: 'kg' }],
    reservation: { id: 1, tableId: 1, tableName: 'T01', tableCode: 'T01-B01', customerName: 'Khách cũ', customerPhone: '0912345678', guestCount: 2, startTime: at, endTime: '2026-11-01T12:00:00Z', note: 'Ghi chú cũ', status: 'CONFIRMED', createdAt: at, createdById: 2, overdue: false },
  }
  const ingredientCheck = [{ ingredientId: 1, ingredientName: 'Gạo', unit: 'kg', currentStock: 1, reservedStock: 0, availableStock: 1, requiredQuantity: 0.8, projectedStock: 0.2, minimumStock: 0.5, shortage: 0 }]
  await context.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.slice(4), method = request.method()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const data = request.postData() ? JSON.parse(request.postData()) : null
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (endpoint === '/auth/me') return json({ accountId: 2, fullName: role, role })
    if (endpoint === '/events') return route.fulfill({ status: 503, body: 'Mock SSE unavailable; polling remains active' })
    if (endpoint === '/tables/floor-plan') return json([{ id: 1, name: 'Tầng 1', code: 'T01', tables: [{ id: 1, code: 'T01-B01', name: 'T01', capacity: 4, status: state.closed ? 'AVAILABLE' : 'OCCUPIED', activeSessionId: state.closed ? null : 3, upcomingReservation: null }] }])
    if (endpoint === '/sessions/items/awaiting-service') return json(state.closed ? [] : [...state.items.filter((i) => i.status === 'READY' || (i.status === 'UNAVAILABLE' && !state.ack)), queueItem(90, 'READY', { sessionId: 2 })])
    if (endpoint.endsWith('/serve')) { const item = state.items.find((i) => endpoint.includes(`/${i.id}/`)); item.status = 'SERVED'; return json(item) }
    if (endpoint.endsWith('/acknowledge-unavailable')) { state.ack = true; return json(state.items[3]) }
    if (endpoint === '/kitchen/queue') return json(state.items.filter((i) => ['PENDING', 'COOKING'].includes(i.status)))
    if (endpoint === '/kitchen/orders/30') return json(state.items)
    if (endpoint.endsWith('/start')) {
      const item = state.items.find((i) => endpoint.includes(`/${i.id}/`))
      if (state.startMode === 'BLOCKED') return json({ code: 'INSUFFICIENT_STOCK', ingredients: ingredientCheck.map((i) => ({ ...i, availableStock: 0.5, projectedStock: -0.3, shortage: 0.3 })), message: 'Không đủ nguyên vật liệu', fieldErrors: {} }, 409)
      if (state.startMode === 'WARNING' && !data.confirmLowStock) return json({ started: false, item, ingredients: ingredientCheck })
      item.status = 'COOKING'; return json({ started: true, item, ingredients: ingredientCheck })
    }
    if (endpoint.endsWith('/complete')) { const item = state.items.find((i) => endpoint.includes(`/${i.id}/`)); item.status = 'READY'; return json(item) }
    if (endpoint.endsWith('/unavailable')) { const item = state.items.find((i) => endpoint.includes(`/${i.id}/`)); item.status = 'UNAVAILABLE'; item.unavailableReason = data.reason; return json(item) }
    if (endpoint === '/menu-items') return json([{ id: 1, name: 'Phở bò', price: 50000, status: 'ON_SALE' }])
    if (endpoint === '/menu-items/1/recipe') {
      if (method === 'PUT') { state.recipeWrites.push(data); state.recipe = data.lines.map((i) => ({ ...i, ingredientName: 'Gạo', unit: 'kg' })) }
      return json(state.recipe)
    }
    if (endpoint === '/inventory/ingredients') return json([{ id: 1, name: 'Gạo', unit: 'kg', minStock: 0.5, currentStock: 1, reservedStock: 0.8, availableStock: 0.2, status: 'ACTIVE', trackLot: false, trackExpiry: false, belowMinStock: true }])
    if (endpoint === '/reservations/available-tables') { state.availableRequests.push(Object.fromEntries(url.searchParams)); return json([{ id: 1, code: 'T01-B01', name: 'T01', capacity: 4, areaName: 'Tầng 1' }]) }
    if (endpoint === '/reservations/1' && method === 'PUT') { state.updates.push(data); Object.assign(state.reservation, data); return json(state.reservation) }
    if (endpoint === '/reservations') return json({ items: [state.reservation, { ...state.reservation, id: 2, customerName: 'Đã nhận bàn', status: 'SEATED' }], page: 0, size: 20, total: 2 })
    if (endpoint === '/payments/open-sessions') return json([{ sessionId: 3, tableId: 1, tableName: 'T01', areaName: 'Tầng 1', openedAt: at, provisionalTotal: 50000, hasBlockingItems: true, totalItems: 1 }])
    if (endpoint === '/payments/sessions/3') return json({ sessionId: 3, tableId: 1, tableName: 'T01', areaName: 'Tầng 1', openedAt: at, provisionalTotal: 50000, hasBlockingItems: true, blockingItems: [{ id: 3, menuItemName: 'Phở bò', quantity: 1, status: 'READY', createdAt: at }], orders: [{ orderId: 30, createdAt: at, createdByName: 'Phục vụ', items: [{ id: 3, menuItemId: 1, menuItemName: 'Phở bò', quantity: 1, unitPriceAtOrder: 50000, subtotal: 50000, status: 'READY' }] }] })
    if (endpoint === '/sessions/3') return json({ sessionId: 3, tableId: 1, tableName: 'T01', tableCode: 'T01-B01', areaName: 'Tầng 1', openedAt: at, closedAt: state.closed ? at : null, status: state.closed ? 'CLOSED' : 'ACTIVE', total: 50000, reservation: null, orders: [{ id: 30, createdById: 2, createdByName: 'Phục vụ', createdAt: at, total: 50000, items: [{ id: 3, menuItemId: 1, menuItemName: 'Phở bò', quantity: 1, unitPriceAtOrder: 50000, subtotal: 50000, status: 'READY', note: null, unavailableReason: null }] }] })
    unexpected.push(`${method} ${endpoint}`)
    return json({ message: 'Unexpected mocked API request', code: 'UNEXPECTED' }, 500)
  })
  const page = await context.newPage()
  activePage = page
  page.on('pageerror', (error) => errors.push(error.message))
  return { page, context, state }
}

try {
  {
    const { page, context, state } = await fixture('KITCHEN_STAFF')
    await page.goto(`${frontend}/kitchen`)
    await page.getByRole('button', { name: 'Xem đợt #30', exact: true }).waitFor()
    assert.equal(await page.locator('[data-order-id="30"]').count(), 1)
    await page.getByRole('button', { name: 'Xem đợt #30', exact: true }).click()
    await page.locator('.ant-drawer [data-item-id="4"]').waitFor()
    assert.equal(await page.locator('.ant-drawer [data-item-id]').count(), 4)
    pass('one batch card for mixed PENDING/COOKING; drawer retains READY/UNAVAILABLE')
    await page.locator('[data-item-id="1"]').getByRole('button', { name: 'Bắt đầu', exact: true }).click()
    await page.getByRole('button', { name: 'Vẫn tiếp tục chế biến', exact: true }).waitFor()
    assert.equal(state.items[0].status, 'PENDING')
    await page.screenshot({ path: `${output}/inventory-warning.png`, fullPage: true })
    state.startMode = 'BLOCKED'
    await page.getByRole('button', { name: 'Vẫn tiếp tục chế biến', exact: true }).click()
    await page.getByText('Không đủ nguyên vật liệu', { exact: true }).waitFor()
    assert.equal(state.items[0].status, 'PENDING')
    await page.getByRole('dialog', { name: 'Không đủ nguyên vật liệu', exact: true }).getByRole('button', { name: 'Không thể chế biến', exact: true }).click()
    assert.equal(await page.getByLabel('Lý do cần báo khách').inputValue(), 'Hết nguyên liệu')
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
    await page.locator('[data-item-id="1"] .unavailable-reason').waitFor()
    assert.equal(state.items[0].unavailableReason, 'Hết nguyên liệu')
    pass('warning has no side effects; changed stock blocks confirmation; UNAVAILABLE requires explicit confirmation')
    await page.locator('[data-item-id="2"]').getByRole('button', { name: 'Hoàn thành', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('[data-order-id="30"]'))
    assert.equal(state.items[1].status, 'READY')
    pass('completing last cooking item removes only the actionable batch card')
    await context.close()
  }
  {
    const { page, context, state } = await fixture('WAITER')
    await page.goto(`${frontend}/floor-plan`)
    const ready = page.getByRole('button', { name: 'T01: 1 dòng món chờ phục vụ', exact: true })
    const unavailable = page.getByRole('button', { name: 'T01: 1 dòng món không thể chế biến chưa xử lý', exact: true })
    await ready.waitFor(); await unavailable.waitFor()
    assert.equal(await page.getByRole('menuitem', { name: 'Món chờ phục vụ', exact: true }).count(), 0)
    await page.screenshot({ path: `${output}/table-badges.png`, fullPage: true })
    await ready.click(); await page.getByText('× 50', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Đã phục vụ', exact: true }).click()
    await ready.waitFor({ state: 'detached' })
    await page.locator('.ant-drawer-close').click()
    await unavailable.click(); await page.getByRole('button', { name: 'Đã thông báo cho khách', exact: true }).click()
    await unavailable.waitFor({ state: 'detached' }); await page.reload()
    await page.getByRole('heading', { name: 'T01-B01', exact: true }).waitFor()
    assert.equal(state.ack, true)
    assert.equal(await unavailable.count(), 0)
    assert.equal(await ready.count(), 0)
    pass('two independent per-table badges count lines, exclude old session, serve/ack persist after refresh')
    state.closed = true
    await page.goto(`${frontend}/sessions/3`)
    await page.getByRole('link', { name: 'Về sơ đồ bàn', exact: true }).waitFor()
    await page.getByText('Đã kết thúc', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đã phục vụ', exact: true }).count(), 0)
    await page.getByRole('link', { name: 'Về sơ đồ bàn', exact: true }).click()
    await page.waitForURL('**/floor-plan')
    await page.goto(`${frontend}/sessions/invalid`)
    await page.getByRole('link', { name: 'Về sơ đồ bàn', exact: true }).waitFor()
    pass('direct session URLs have an explicit back link; CLOSED has no serving action; invalid IDs retain navigation')
    await context.close()
  }
  {
    const { page, context } = await fixture('OWNER', 1440)
    await page.goto(`${frontend}/floor-plan`)
    await page.getByRole('button', { name: 'T01: 1 dòng món chờ phục vụ', exact: true }).click()
    await page.locator('.ant-drawer [data-item-id="3"]').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đã phục vụ', exact: true }).count(), 0)
    pass('OWNER can inspect notifications without gaining serving actions')
    await context.close()
  }
  {
    const { page, context } = await fixture('CASHIER')
    await page.goto(`${frontend}/payment`)
    await page.getByRole('button', { name: 'Xem & Thanh toán', exact: true }).click()
    const pay = page.getByRole('button', { name: 'Xác nhận thanh toán', exact: true })
    await pay.waitFor(); assert.equal(await pay.isDisabled(), true)
    await page.getByText('Hoàn thành', { exact: true }).first().waitFor()
    await page.screenshot({ path: `${output}/payment-blocked.png`, fullPage: true })
    pass('actual PaymentPage disables payment for server blocking READY while preserving subtotal')
    await context.close()
  }
  {
    const { page, context, state } = await fixture('MANAGER')
    await page.goto(`${frontend}/reservations`)
    await page.getByRole('button', { name: 'Sửa đặt bàn', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Sửa đặt bàn', exact: true }).count(), 1)
    await page.getByRole('button', { name: 'Sửa đặt bàn', exact: true }).click()
    assert.equal(await page.getByLabel('Tên khách', { exact: true }).inputValue(), 'Khách cũ')
    await page.getByLabel('Tên khách', { exact: true }).fill('Khách đã sửa')
    await page.getByRole('button', { name: 'Tìm bàn phù hợp', exact: true }).click()
    await page.getByRole('button', { name: 'Lưu đặt bàn', exact: true }).click()
    await page.getByText('Khách đã sửa', { exact: true }).waitFor()
    assert.equal(state.availableRequests[0].excludedId, '1')
    assert.equal(state.updates[0].startTime, '2026-11-01T10:00:00.000Z')
    assert.equal(state.updates[0].customerName, 'Khách đã sửa')
    await page.reload(); await page.getByText('Khách đã sửa', { exact: true }).waitFor()
    pass('MANAGER edits CONFIRMED only; prefilled form preserves Vietnam wall-clock and excludes itself from availability')
    await context.close()
  }
  {
    const { page, context, state } = await fixture('HEAD_CHEF')
    await page.goto(`${frontend}/menu`)
    await page.getByRole('button', { name: 'Định lượng', exact: true }).click()
    await page.getByLabel('Số lượng 1', { exact: true }).fill('0.125')
    assert.equal(await page.getByRole('button', { name: 'Thêm món', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Lưu định lượng', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(state.recipeWrites[0].lines[0].quantityPerServing, 0.125)
    await page.getByRole('button', { name: 'Định lượng', exact: true }).click()
    assert.equal(await page.getByLabel('Số lượng 1', { exact: true }).inputValue(), '0.125')
    pass('HEAD_CHEF edits/saves/reloads recipe through RecipeDrawer without OWNER menu permissions')
    await context.close()
  }
  {
    const { page, context, state } = await fixture('WAITER')
    await page.goto(`${frontend}/floor-plan`)
    const ready = page.getByRole('button', { name: 'T01: 1 dòng món chờ phục vụ', exact: true })
    await ready.waitFor()
    state.items[2].status = 'SERVED'
    await ready.waitFor({ state: 'detached', timeout: 35000 })
    pass('real 30-second polling refreshes table notifications while SSE is unavailable')
    await context.close()
  }
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, [])
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true })
    await writeFile(`${output}/failure.html`, await activePage.content())
  }
  throw error
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ channel, results, errors, unexpected }, null, 2))
  await browser.close()
}
