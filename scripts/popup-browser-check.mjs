import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Every /api request is intercepted. No login, selection or confirmation reaches Neon.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const base = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = [], errors = [], unexpected = []
const roles = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN_STAFF']
const at = new Date().toISOString()
const menu = [{ id: 901, name: '[QA] Cơm gà', price: 50000, status: 'ON_SALE' }, { id: 902, name: '[QA] Canh rau', price: 20000, status: 'ON_SALE' }]
const reservation = { id: 901, tableId: 901, tableName: '[QA] T01', customerName: '[QA] Khách', customerPhone: '0910000001', guestCount: 2, startTime: at, endTime: new Date(Date.now() + 7_200_000).toISOString(), status: 'CONFIRMED', note: null, overdue: false, createdAt: at, createdById: 2 }
const table = { id: 901, name: '[QA] T01', capacity: 4, status: 'AVAILABLE', activeSessionId: null, upcomingReservation: reservation }
const item = { id: 901, menuItemId: 901, menuItemName: menu[0].name, quantity: 1, note: null, status: 'PENDING', unavailableReason: null, unitPriceAtOrder: 50000, subtotal: 50000 }
const session = { sessionId: 901, tableId: 901, tableName: table.name, areaName: '[QA] Khu vực', reservation: null, openedAt: at, closedAt: null, status: 'ACTIVE', orders: [{ id: 901, createdById: 3, createdByName: '[QA] Phục vụ', createdAt: at, items: [item], total: 50000 }], total: 50000 }
const queue = [{ ...item, sessionId: 901, orderId: 901, tableId: 901, tableName: table.name, orderedAt: at }]
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
await mkdir('.cache/popup-qa', { recursive: true })

async function fixture(role, width, reducedMotion) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'vi-VN', reducedMotion })
  const mutations = []
  const account = { accountId: roles.indexOf(role) + 1, fullName: `[QA] ${role}`, role }
  await context.addInitScript(() => localStorage.setItem('restaurant.session', JSON.stringify({ accessToken: 'qa-mocked-token', expiresAt: new Date(Date.now() + 3_600_000).toISOString() })))
  await context.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), method = request.method(), pathname = url.pathname
    if (!pathname.startsWith('/api/')) return route.continue()
    const json = (data) => route.fulfill({ json: data })
    if (pathname === '/api/auth/me') return json(account)
    if (pathname === '/api/events') return route.abort('failed')
    if (method !== 'GET') {
      mutations.push({ method, pathname, body: request.postDataJSON() })
      if (/^\/api\/accounts\/\d+\/role$/.test(pathname)) return json({ id: 2, fullName: '[QA] MANAGER', phone: '0900000002', role: 'CASHIER', status: 'ACTIVE' })
      unexpected.push(`${method} ${pathname}`)
      return route.fulfill({ status: 500, json: { message: 'Unexpected mocked mutation' } })
    }
    if (pathname === '/api/accounts') return json(roles.map((value, i) => ({ id: i + 1, fullName: `[QA] ${value}`, phone: `090000000${i + 1}`, role: value, status: 'ACTIVE' })))
    if (pathname === '/api/menu-items') return json(menu)
    if (pathname.endsWith('/recipe')) return json([{ ingredientId: 901, ingredientName: '[QA] Gạo', quantityPerServing: 0.2, unit: 'kg' }])
    if (pathname === '/api/inventory/ingredients') return json([{ id: 901, name: '[QA] Gạo', unit: 'kg', status: 'ACTIVE' }, { id: 902, name: '[QA] Rau', unit: 'kg', status: 'ACTIVE' }])
    if (pathname === '/api/reservations') return json({ items: [reservation], page: 0, size: Number(url.searchParams.get('size') ?? 20), total: 1 })
    if (pathname === '/api/tables/floor-plan') return json([{ id: 901, name: '[QA] Khu vực', tables: [table] }])
    if (pathname === '/api/sessions/901') return json(session)
    if (pathname === '/api/kitchen/queue') return json(queue)
    unexpected.push(`${method} ${pathname}`)
    return route.fulfill({ status: 404, json: {} })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  page.on('pageerror', (error) => errors.push(error.message))
  return { page, context, mutations, tag: `${width}/${reducedMotion}` }
}

async function inViewport(popup) {
  await popup.waitFor({ state: 'visible' })
  // Let animation finish, then assert geometry: Playwright's :visible alone also matches offscreen popups.
  await popup.page().waitForTimeout(350)
  const box = await popup.evaluate((node) => {
    const r = node.getBoundingClientRect(), s = getComputedStyle(node)
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
      viewportWidth: innerWidth, viewportHeight: innerHeight, opacity: s.opacity, onTop: !!hit && node.contains(hit) }
  })
  assert(box.width > 0 && box.height > 0, JSON.stringify(box))
  assert(box.left >= -1 && box.top >= -1 && box.right <= box.viewportWidth + 1 && box.bottom <= box.viewportHeight + 1, JSON.stringify(box))
  assert.equal(Number(box.opacity), 1)
  assert(box.onTop, `Popup covered by another layer: ${JSON.stringify(box)}`)
}

async function openSelect(page, input) {
  await input.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: document.documentElement.scrollWidth }))
  await input.click()
  assert.equal(await input.getAttribute('aria-expanded'), 'true')
  const popup = page.locator('.ant-select-dropdown:visible').last()
  await inViewport(popup)
  assert.equal(await input.getAttribute('aria-expanded'), 'true')
  const after = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: document.documentElement.scrollWidth }))
  assert.deepEqual(after, before, 'Opening a Select must not shift the document or enlarge its scroll area')
  return popup
}

async function escapeSelect(input) {
  await input.press('Escape')
  await input.page().waitForFunction((element) => element.getAttribute('aria-expanded') === 'false', await input.elementHandle(), { timeout: 3000 })
  assert.equal(await input.getAttribute('aria-expanded'), 'false')
}

async function closeDialog(dialog) {
  await dialog.locator('button.ant-modal-close, button.ant-drawer-close').click()
  await dialog.waitFor({ state: 'hidden' })
}

try {
  for (const width of [1440, 768]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const owner = await fixture('OWNER', width, reducedMotion), { page, tag } = owner
    await page.goto(`${base}/accounts`)
    await page.getByRole('heading', { name: 'Tài khoản', exact: true }).waitFor()
    let input = page.getByRole('combobox', { name: 'Vai trò [QA] MANAGER', exact: true })
    let popup = await openSelect(page, input)
    assert.equal(await popup.locator('.ant-select-item-option').count(), 6)
    await page.screenshot({ path: `.cache/popup-qa/accounts-${width}-${reducedMotion}.png` })
    await popup.locator('.ant-select-item-option').filter({ hasText: /^Thu ngân$/ }).click()
    await page.waitForTimeout(100)
    assert.equal(owner.mutations.length, 1)
    assert.equal(owner.mutations[0].body.role, 'CASHIER')
    assert.equal(await input.getAttribute('aria-expanded'), 'false')
    pass(`${tag}: table role dropdown stays visible, selects and closes (mocked PATCH)`)

    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click()
    let dialog = page.getByRole('dialog')
    await inViewport(dialog)
    input = dialog.getByRole('combobox')
    popup = await openSelect(page, input)
    await popup.locator('.ant-select-item-option').filter({ hasText: /^Bếp trưởng$/ }).click()
    assert(await dialog.locator('.ant-select').innerText().then(text => text.includes('Bếp trưởng')))
    await openSelect(page, input)
    await escapeSelect(input)
    assert(await dialog.isVisible())
    await closeDialog(dialog)
    pass(`${tag}: create-account Modal and nested role Select, click selection and Escape`)

    await page.goto(`${base}/menu`)
    input = page.getByRole('combobox', { name: 'Trạng thái món' })
    await openSelect(page, input)
    await page.getByRole('heading', { name: 'Thực đơn', exact: true }).click()
    assert.equal(await input.getAttribute('aria-expanded'), 'false')
    await input.focus()
    await input.press('ArrowDown')
    await inViewport(page.locator('.ant-select-dropdown:visible').last())
    await input.press('Enter')
    assert.equal(await input.getAttribute('aria-expanded'), 'false')
    pass(`${tag}: menu-status Select opens by mouse/keyboard, selects and dismisses outside`)
    await page.getByRole('button', { name: 'Thêm món', exact: true }).click()
    dialog = page.getByRole('dialog')
    await inViewport(dialog)
    await closeDialog(dialog)
    await page.getByRole('button', { name: 'Sửa', exact: true }).first().click()
    await inViewport(page.getByRole('dialog'))
    await closeDialog(page.getByRole('dialog'))
    pass(`${tag}: add/edit-menu Modals open and close`)
    await page.getByRole('button', { name: 'Định lượng', exact: true }).first().click()
    dialog = page.getByRole('dialog')
    await inViewport(dialog)
    input = dialog.getByRole('combobox', { name: 'Nguyên vật liệu 1' })
    popup = await openSelect(page, input)
    await popup.locator('.ant-select-item-option').filter({ hasText: '[QA] Rau' }).click()
    await openSelect(page, input)
    await input.fill('Gạo')
    await inViewport(page.locator('.ant-select-dropdown:visible').last())
    await input.press('ArrowDown')
    await input.press('Enter')
    await closeDialog(dialog)
    pass(`${tag}: recipe Drawer and ingredient Select, mouse and search/keyboard`)
    await owner.context.close()

    const manager = await fixture('MANAGER', width, reducedMotion), mp = manager.page
    await mp.goto(`${base}/reservations`)
    input = mp.getByRole('combobox', { name: 'Trạng thái đặt bàn' })
    await openSelect(mp, input)
    await escapeSelect(input)
    input = mp.getByRole('combobox', { name: 'Số dòng / trang' })
    // Pagination has a Select even with a single page.
    if (await input.count() === 0) input = mp.locator('.ant-pagination-options').getByRole('combobox')
    await openSelect(mp, input)
    await escapeSelect(input)
    pass(`${tag}: reservation-status and pagination-size Selects`)
    const date = mp.getByLabel('Ngày đặt bàn')
    await date.click()
    await inViewport(mp.locator('.ant-picker-dropdown:visible').last())
    await date.press('Escape')
    await mp.locator('.ant-picker-dropdown:visible').waitFor({ state: 'hidden' })
    pass(`${tag}: reservation-date calendar opens and Escape dismisses`)
    await mp.getByRole('button', { name: 'Hủy đặt bàn', exact: true }).first().click()
    popup = mp.locator('.ant-popconfirm:visible')
    await inViewport(popup)
    await popup.getByRole('button', { name: 'Giữ lại', exact: true }).click()
    await popup.waitFor({ state: 'hidden' })
    pass(`${tag}: reservation cancellation Popconfirm opens and cancels`)
    await mp.getByRole('button', { name: 'Tạo đặt bàn', exact: true }).click()
    dialog = mp.getByRole('dialog')
    await inViewport(dialog)
    for (const label of ['Bắt đầu', 'Kết thúc']) {
      const picker = dialog.getByLabel(label, { exact: true })
      await picker.click()
      await inViewport(mp.locator('.ant-picker-dropdown:visible').last())
      await picker.press('Escape')
    }
    await closeDialog(dialog)
    pass(`${tag}: reservation Drawer and both nested date/time pickers`)
    await mp.goto(`${base}/floor-plan`)
    await mp.getByRole('button', { name: 'Mở phiên', exact: true }).click()
    dialog = mp.getByRole('dialog')
    await inViewport(dialog)
    await dialog.getByText('Khách đặt trước', { exact: true }).click()
    input = dialog.getByRole('combobox', { name: 'Đặt bàn để nhận khách' })
    popup = await openSelect(mp, input)
    await popup.locator('.ant-select-item-option').first().click()
    assert(await dialog.getByRole('button', { name: 'Mở phiên', exact: true }).isEnabled())
    await closeDialog(dialog)
    pass(`${tag}: session-opening Modal and reservation Select`)
    await mp.getByRole('button', { name: 'Mở phiên', exact: true }).click()
    dialog = mp.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Mở phiên', exact: true }).click()
    const confirm = mp.getByRole('dialog').filter({ hasText: 'Bàn có khách đặt trước' })
    await inViewport(confirm)
    await confirm.getByRole('button', { name: 'Quay lại', exact: true }).click()
    await confirm.waitFor({ state: 'hidden' })
    await closeDialog(dialog)
    assert.equal(manager.mutations.length, 0)
    pass(`${tag}: nested walk-in warning Modal cancels without opening a session`)
    await manager.context.close()

    const waiter = await fixture('WAITER', width, reducedMotion), wp = waiter.page
    await wp.goto(`${base}/sessions/901`)
    await wp.getByRole('button', { name: 'Hủy món', exact: true }).click()
    popup = wp.locator('.ant-popconfirm:visible')
    await inViewport(popup)
    await popup.getByRole('button', { name: 'Giữ món', exact: true }).click()
    pass(`${tag}: order cancellation Popconfirm opens and cancels`)
    await wp.getByRole('button', { name: 'Gọi thêm', exact: true }).click()
    dialog = wp.getByRole('dialog')
    await inViewport(dialog)
    input = dialog.getByRole('combobox')
    popup = await openSelect(wp, input)
    await wp.screenshot({ path: `.cache/popup-qa/order-${width}-${reducedMotion}.png` })
    await popup.locator('.ant-select-item-option').filter({ hasText: '[QA] Cơm gà' }).click()
    await dialog.getByRole('button', { name: 'Thêm món', exact: true }).click()
    input = dialog.getByRole('combobox').nth(1)
    await openSelect(wp, input)
    await input.fill('Canh')
    await input.press('ArrowDown')
    await input.press('Enter')
    assert.equal(await input.getAttribute('aria-expanded'), 'false')
    assert.equal(await dialog.locator('.ant-select').filter({ hasText: '[QA] Canh rau' }).count(), 1)
    await closeDialog(dialog)
    assert.equal(waiter.mutations.length, 0)
    pass(`${tag}: order Modal and both menu Selects, click-only and search/keyboard, no submission`)
    if (width < 992) {
      await wp.getByRole('button', { name: 'Mở menu điều hướng' }).click()
      dialog = wp.getByRole('dialog')
      await inViewport(dialog)
      await dialog.getByRole('link', { name: 'Sơ đồ bàn', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await wp.waitForURL('**/floor-plan')
      pass(`${tag}: tablet navigation Drawer opens and selecting a link closes it`)
    }
    await waiter.context.close()

    const kitchen = await fixture('KITCHEN_STAFF', width, reducedMotion), kp = kitchen.page
    await kp.goto(`${base}/kitchen`)
    await kp.getByRole('button', { name: 'Không thể chế biến', exact: true }).click()
    dialog = kp.getByRole('dialog')
    await inViewport(dialog)
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click()
    await dialog.getByText('Vui lòng nhập lý do không thể chế biến', { exact: true }).waitFor()
    await closeDialog(dialog)
    assert.equal(kitchen.mutations.length, 0)
    pass(`${tag}: kitchen Modal opens, validates and closes without changing an item`)
    await kitchen.context.close()
  }
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  pass('All API traffic mocked; no unexpected endpoint or browser JavaScript error')
  await writeFile('.cache/popup-qa/results.json', JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, results, errors, unexpected, apiMode: 'mocked' }, null, 2))
  console.log(`PASS ${results.length} popup checks (mocked API, no Neon writes)`)
} finally { await browser.close() }
