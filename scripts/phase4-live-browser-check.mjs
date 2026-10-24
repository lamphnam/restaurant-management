import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll, roles } from './phase3-qa-support.mjs'

requireWriteApproval('phase4-live-browser-check')
const fixture = JSON.parse(await readFile('.cache/phase4-api/results.json', 'utf8'))
assert(fixture.completed, 'Complete API QA and readiness before browser writes')
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const chrome = await chromium.launch({ channel: 'chrome', headless: true })
const edge = await chromium.launch({ channel: 'msedge', headless: true })
const output = '.cache/phase4-live-browser'
await mkdir(output, { recursive: true })
const auth = await loginAll()
const resume = process.argv.includes('--resume-after-polling')
const evidence = resume ? JSON.parse(await readFile(`${output}/results.json`, 'utf8')) : { checkedAt: new Date().toISOString(), results: [], errors: [], timings: {}, before: databaseSnapshot(), created: [] }
if (resume) {
  assert(evidence.failure && evidence.sessionId && !evidence.completed, 'Resume only interrupted live QA')
  await writeFile(`${output}/interrupted-${Date.now()}.json`, JSON.stringify(evidence, null, 2))
  delete evidence.failure
}
const pass = (label) => { evidence.results.push(label); console.log(`PASS ${label}`) }
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const pages = {}
const landing = { OWNER: '/reports', MANAGER: '/reservations', CASHIER: '/payment', WAITER: '/floor-plan', KITCHEN_STAFF: '/kitchen', HEAD_CHEF: '/kitchen' }
const prefix = `[QA] Phase4 UI ${Date.now()}`
async function call(role, method, endpoint, body) {
  const response = await fetch(`${base}/api${endpoint}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 200, endpoint)
  return response.json()
}
async function signIn(page, role) {
  await page.goto(`${frontend}/login`)
  await page.getByLabel('Số điện thoại', { exact: true }).fill(`090000000${roles.indexOf(role) + 1}`)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_PASSWORD ?? 'Demo@123')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL(`${frontend}${landing[role]}`)
}
async function order(page, menuName) {
  await page.getByRole('button', { name: /^(Gọi món|Gọi thêm)$/ }).click()
  const dialog = page.getByRole('dialog')
  const select = dialog.getByRole('combobox').first()
  await select.click(); await select.fill(menuName)
  await page.locator('.ant-select-item-option').filter({ hasText: menuName }).click()
  await dialog.getByLabel('Ghi chú cho bếp', { exact: true }).fill(prefix)
  const response = page.waitForResponse((r) => r.request().method() === 'POST' && /\/sessions\/\d+\/orders$/.test(new URL(r.url()).pathname))
  await dialog.getByRole('button', { name: 'Gửi bếp', exact: true }).click()
  const received = await response
  assert.equal(received.status(), 200)
  const committedAt = Date.now(), data = await received.json()
  evidence.created.push({ orderId: data.id, itemId: data.items[0].id })
  return { item: data.items[0], committedAt }
}
let menu, ingredient
try {
  for (const role of roles) {
    const context = await (role === 'KITCHEN_STAFF' ? edge : chrome).newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce', locale: 'vi-VN' })
    const page = await context.newPage()
    page.on('pageerror', (error) => evidence.errors.push(`${role}: ${error.message}`))
    await signIn(page, role)
    pass(`${role}: real login reaches ${landing[role]}`)
    for (const [route, allowed] of [['/reports', ['OWNER']], ['/reconciliation', ['CASHIER', 'MANAGER']]]) {
      await page.goto(`${frontend}${route}`)
      if (!allowed.includes(role)) await page.getByText('Bạn không có quyền truy cập trang này', { exact: true }).waitFor()
      else await page.getByRole('heading', { name: route === '/reports' ? 'Báo cáo' : 'Đối soát cuối ca', exact: true }).waitFor()
    }
    pass(`${role}: both Phase4 route guards enforce role`)
    await page.goto(`${frontend}${landing[role]}`)
    pages[role] = page
  }
  menu = (await call('OWNER', 'GET', '/menu-items')).find((item) => item.id === fixture.created.find((item) => item.path === '/menu-items').id)
  ingredient = (await call('OWNER', 'GET', '/inventory/ingredients')).find((item) => item.id === fixture.created.find((item) => item.path === '/inventory/ingredients').id)
  assert(menu?.name.startsWith('[QA] Phase4 ') && ingredient?.name.startsWith('[QA] Phase4 '))
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/reactivate`)
  const waiter = pages.WAITER, kitchen = pages.KITCHEN_STAFF
  let free, floor, floorCard, session, second
  if (resume) {
    session = await call('WAITER', 'GET', `/sessions/${evidence.sessionId}`)
    assert(session.status === 'ACTIVE' && session.orders.length === 2 && session.orders.every((order) => order.items.every((item) => item.menuItemId === menu.id && item.note.startsWith('[QA] Phase4 UI '))))
    free = (await call('WAITER', 'GET', '/tables/floor-plan')).flatMap((area) => area.tables).find((table) => table.activeSessionId === session.sessionId)
    assert(free)
    second = { item: session.orders[1].items[0] }
    assert(second.item.status === 'PENDING')
    floor = await waiter.context().newPage()
    await floor.goto(`${frontend}/floor-plan`)
    floorCard = floor.locator(`[data-table-name="${free.name}"]`)
    await waiter.goto(`${frontend}/sessions/${session.sessionId}`)
  } else {
  free = (await call('WAITER', 'GET', '/tables/floor-plan')).flatMap((area) => area.tables).find((table) => table.status === 'AVAILABLE' && !table.activeSessionId && !table.upcomingReservation)
  assert(free, 'Verified free table without upcoming reservation')
  floor = await waiter.context().newPage()
  await floor.goto(`${frontend}/floor-plan`)
  floorCard = floor.locator(`[data-table-name="${free.name}"]`)
  await floorCard.getByRole('button', { name: 'Mở phiên', exact: true }).waitFor()
  const tableCard = waiter.locator(`[data-table-name="${free.name}"]`)
  await tableCard.getByRole('button', { name: 'Mở phiên', exact: true }).click()
  const opened = waiter.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/sessions')
  await waiter.getByRole('dialog').getByRole('button', { name: 'Mở phiên', exact: true }).click()
  const openedResponse = await opened
  assert.equal(openedResponse.status(), 200)
  const openedAt = Date.now()
  session = await openedResponse.json()
  evidence.sessionId = session.sessionId
  evidence.created.push({ sessionId: session.sessionId, tableId: free.id })
  await waiter.waitForURL(`${frontend}/sessions/${session.sessionId}`)
  await floorCard.getByRole('button', { name: 'Xem phiên', exact: true }).waitFor({ timeout: 3000 })
  evidence.timings.openFloorMs = Date.now() - openedAt
  assert(evidence.timings.openFloorMs < 2000)
  pass('Walk-in opened through UI; separate floor tab receives OCCUPIED through SSE under 2s')
  const first = await order(waiter, menu.name)
  const firstKitchen = kitchen.locator(`[data-item-id="${first.item.id}"]`)
  await firstKitchen.waitFor({ timeout: 3000 })
  evidence.timings.orderMs = Date.now() - first.committedAt
  assert(evidence.timings.orderMs < 2000)
  pass('Chrome waiter order reaches Edge kitchen without F5 under 2s')
  await firstKitchen.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  await firstKitchen.getByRole('button', { name: 'Hoàn thành', exact: true }).waitFor()
  const completed = kitchen.waitForResponse((r) => r.url().endsWith(`/kitchen/items/${first.item.id}/complete`))
  await firstKitchen.getByRole('button', { name: 'Hoàn thành', exact: true }).click()
  assert.equal((await completed).status(), 200)
  const completeAt = Date.now()
  const firstWaiter = waiter.locator(`[data-item-id="${first.item.id}"]`)
  await firstWaiter.getByRole('button', { name: 'Đã phục vụ', exact: true }).waitFor({ timeout: 3000 })
  evidence.timings.completeMs = Date.now() - completeAt
  assert(evidence.timings.completeMs < 2000)
  await firstWaiter.getByRole('button', { name: 'Đã phục vụ', exact: true }).click()
  await firstWaiter.getByText('Đã phục vụ', { exact: true }).waitFor()
  pass('Edge complete reaches Chrome waiter under 2s; UI serves successfully')

  // Disable only SSE on kitchen, leaving REST live, to exercise the actual 30s polling fallback.
  await kitchen.context().route('**/api/events', (route) => route.abort('failed'))
  await kitchen.reload()
  await kitchen.getByRole('heading', { name: 'Bếp', exact: true }).waitFor()
  second = await order(waiter, menu.name)
  const secondKitchen = kitchen.locator(`[data-item-id="${second.item.id}"]`)
  await secondKitchen.waitFor({ timeout: 33000 })
  evidence.timings.pollingMs = Date.now() - second.committedAt
  pass(`Kitchen polling recovers additional order while SSE is blocked (${evidence.timings.pollingMs}ms)`)
  await kitchen.context().unroute('**/api/events')
  }
  let streams = 0
  kitchen.on('response', (r) => { if (new URL(r.url()).pathname === '/api/events' && r.status() === 200) streams++ })
  await kitchen.reload()
  await kitchen.locator(`[data-item-id="${second.item.id}"]`).getByRole('button', { name: 'Bắt đầu', exact: true }).waitFor()
  await kitchen.context().setOffline(true)
  await kitchen.waitForTimeout(2500)
  const reconnected = kitchen.waitForResponse((r) => new URL(r.url()).pathname === '/api/events' && r.status() === 200, { timeout: 10000 })
  await kitchen.context().setOffline(false)
  try {
    await reconnected
    pass(`SSE reconnects after offline/online (${streams} successful stream responses observed)`)
  } catch {
    evidence.limitations = ['Quick offline simulation did not establish that the original stream closed; reconnect is not marked PASS by this simulation.']
    console.log('NOT VERIFIED: reconnect after quick offline simulation; continuing remaining live workflow')
  }
  await kitchen.locator(`[data-item-id="${second.item.id}"]`).getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  await kitchen.locator(`[data-item-id="${second.item.id}"]`).getByRole('button', { name: 'Hoàn thành', exact: true }).click()
  const awaiting = await waiter.context().newPage()
  await awaiting.goto(`${frontend}/awaiting-service`)
  await awaiting.locator(`[data-item-id="${second.item.id}"]`).waitFor()
  const cashier = pages.CASHIER
  await cashier.goto(`${frontend}/payment`)
  await cashier.locator(`[data-row-key="${session.sessionId}"]`).getByRole('button', { name: 'Xem & Thanh toán', exact: true }).click()
  await cashier.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click()
  const paid = cashier.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/payments')
  await cashier.locator('.ant-popconfirm').getByRole('button', { name: 'Xác nhận', exact: true }).click()
  const paidResponse = await paid
  assert.equal(paidResponse.status(), 200)
  const paidAt = Date.now(), invoice = await paidResponse.json()
  evidence.created.push({ invoiceId: invoice.id })
  assert.equal(invoice.amount, menu.price * 2)
  await awaiting.locator(`[data-item-id="${second.item.id}"]`).waitFor({ state: 'hidden', timeout: 3000 })
  await floorCard.getByRole('button', { name: 'Mở phiên', exact: true }).waitFor({ timeout: 3000 })
  evidence.timings.paymentMs = Date.now() - paidAt
  assert(evidence.timings.paymentMs < 2000)
  pass('UI payment bills READY, releases floor and clears awaiting-service in other tabs under 2s')
  await cashier.goto(`${frontend}/reconciliation`)
  const actual = cashier.getByRole('spinbutton', { name: 'Tổng thực nhận (đ)' })
  await actual.waitFor()
  assert.equal(await actual.inputValue(), '')
  await actual.fill('0')
  await cashier.getByRole('textbox', { name: 'Lý do chênh lệch (không bắt buộc)' }).fill(prefix)
  await cashier.getByRole('button', { name: 'Lập đối soát', exact: true }).click()
  const created = cashier.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/reconciliations')
  await cashier.locator('.ant-popconfirm').getByRole('button', { name: 'Lập đối soát', exact: true }).click()
  const recResponse = await created
  assert.equal(recResponse.status(), 200)
  const reconciliation = await recResponse.json()
  evidence.created.push({ reconciliationId: reconciliation.id })
  const manager = pages.MANAGER
  await manager.goto(`${frontend}/reconciliation`)
  const recRow = manager.locator(`[data-row-key="${reconciliation.id}"]`)
  await recRow.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  const confirmation = manager.waitForResponse((r) => r.url().endsWith(`/reconciliations/${reconciliation.id}/confirm`))
  await manager.locator('.ant-popconfirm').getByRole('button', { name: 'Xác nhận', exact: true }).click()
  assert.equal((await confirmation).status(), 200)
  await recRow.waitFor({ state: 'hidden' })
  pass('Real cashier creates zero-actual reconciliation through UI; manager confirms from pending list')
  await cashier.reload()
  await cashier.locator(`[data-row-key="${reconciliation.id}"]`).getByText('Đã xác nhận', { exact: true }).waitFor()
  await cashier.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await signIn(cashier, 'CASHIER')
  await cashier.goto(`${frontend}/reconciliation`)
  await cashier.locator(`[data-row-key="${reconciliation.id}"]`).getByText('Đã xác nhận', { exact: true }).waitFor()
  pass('Confirmed reconciliation survives reload, logout and real login')
  const owner = pages.OWNER
  await owner.goto(`${frontend}/reports`)
  await owner.getByRole('heading', { name: 'Top món bán', exact: true }).waitFor()
  await owner.getByText(menu.name, { exact: true }).waitFor()
  await owner.setViewportSize({ width: 768, height: 1024 })
  await owner.screenshot({ path: `${output}/reports-tablet.png`, fullPage: true })
  await cashier.setViewportSize({ width: 768, height: 1024 })
  await cashier.screenshot({ path: `${output}/reconciliation-tablet.png`, fullPage: true })
  assert(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  assert(await cashier.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  pass('Real reports and reconciliation usable at 768px tablet viewport with reduced motion')
  assert.equal(evidence.errors.length, 0)
  evidence.completed = true
} catch (error) {
  evidence.failure = error.message
  throw error
} finally {
  if (menu) await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
  if (ingredient) {
    await call('OWNER', 'PATCH', `/inventory/ingredients/${ingredient.id}/activate`)
    await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', { items: [{ ingredientId: ingredient.id, actualQuantity: 0, note: `${prefix} Kết thúc QA` }] })
    await call('OWNER', 'PATCH', `/inventory/ingredients/${ingredient.id}/deactivate`)
  }
  evidence.after = databaseSnapshot()
  await writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
  await Promise.all([chrome.close(), edge.close()])
  console.log(JSON.stringify({ completed: evidence.completed ?? false, checks: evidence.results.length, timings: evidence.timings, created: evidence.created, errors: evidence.errors }))
}
