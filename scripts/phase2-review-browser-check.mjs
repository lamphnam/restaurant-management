import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll } from './phase2-qa-support.mjs'

// Uses app/REST/Neon, checks UI limits and adds one 99-portion QA item, then completes/serves it.
// Reuses a verified session and the review API menu; never opens a table.
requireWriteApproval('phase2-review-browser-check')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const fixture = JSON.parse(await readFile('.cache/phase2-review/api-results.json', 'utf8'))
const auth = await loginAll(), before = databaseSnapshot()
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
async function call(role, method, path) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}` } })
  assert.equal(response.status, 200, path)
  return response.json()
}
const session = await call('WAITER', 'GET', `/sessions/${fixture.sessionId}`)
assert.equal(session.status, 'ACTIVE')
const menu = (await call('OWNER', 'GET', '/menu-items')).find((item) => item.id === fixture.menuId && item.name.startsWith('[QA] Phase2 review'))
assert(menu)
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = [], errors = [], timings = {}
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
async function login(role) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'vi-VN' })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${frontend}/login`)
  await page.getByLabel('Số điện thoại', { exact: true }).fill(role === 'WAITER' ? '0900000004' : '0900000005')
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_PASSWORD ?? 'Demo@123')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL(`${frontend}${role === 'WAITER' ? '/floor-plan' : '/kitchen'}`)
  return page
}
try {
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/reactivate`)
  const waiter = await login('WAITER'), kitchen = await login('KITCHEN_STAFF')
  await waiter.goto(`${frontend}/sessions/${session.sessionId}`)
  await waiter.getByRole('button', { name: 'Gọi thêm', exact: true }).click()
  let dialog = waiter.getByRole('dialog')
  const quantity = dialog.getByRole('spinbutton').first()
  assert.equal(await quantity.getAttribute('aria-valuemax'), '99')
  await quantity.fill('99'); await quantity.press('Tab')
  assert.equal(await quantity.inputValue(), '99')
  pass('Quantity input exposes max=99 and accepts 99')
  for (let count = 1; count < 50; count++) await dialog.getByRole('button', { name: 'Thêm món', exact: true }).click()
  assert.equal(await dialog.locator('.order-form-line').count(), 50)
  assert(await dialog.getByRole('button', { name: 'Thêm món', exact: true }).isDisabled())
  pass('Add line stops at exactly 50 rows')
  await dialog.getByRole('button', { name: 'Bỏ món 1', exact: true }).click()
  assert(!(await dialog.getByRole('button', { name: 'Thêm món', exact: true }).isDisabled()))
  await dialog.getByRole('button', { name: 'Thêm món', exact: true }).click()
  assert.equal(await dialog.locator('.order-form-line').count(), 50)
  pass('Removing a row permits adding back up to 50')
  assert(await waiter.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  pass('50-row form remains within tablet width')
  await dialog.locator('form').getByRole('button', { name: 'Đóng', exact: true }).click()
  {
    const snapshot = databaseSnapshot()
    assert.equal(snapshot.food_order, before.food_order)
    assert.equal(snapshot.stock_movement, before.stock_movement)
    pass('Editing and dismissing the limit form writes no business data')
  }
  await waiter.getByRole('button', { name: 'Gọi thêm', exact: true }).click()
  dialog = waiter.getByRole('dialog')
  await dialog.getByRole('combobox').click()
  await dialog.getByRole('combobox').fill(menu.name)
  await waiter.locator('.ant-select-item-option').filter({ hasText: menu.name }).click()
  await dialog.getByRole('spinbutton').fill('99')
  await dialog.getByLabel('Ghi chú cho bếp', { exact: true }).fill('[QA] Phase2 review UI: 99 phần, SSE executor')
  const responsePromise = waiter.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith(`/sessions/${session.sessionId}/orders`))
  await dialog.getByRole('button', { name: 'Gửi bếp', exact: true }).click()
  const response = await responsePromise, committedAt = Date.now()
  assert.equal(response.status(), 200)
  const order = await response.json(), item = order.items[0]
  const kitchenCard = kitchen.locator(`[data-item-id="${item.id}"]`)
  await kitchenCard.waitFor({ timeout: 3000 })
  timings.orderAfterResponseMs = Date.now() - committedAt
  pass('99-portion order reaches separate kitchen context through async SSE without F5')
  await kitchenCard.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  const completeResponse = kitchen.waitForResponse((response) => response.url().endsWith(`/kitchen/items/${item.id}/complete`))
  await kitchenCard.getByRole('button', { name: 'Hoàn thành', exact: true }).click()
  assert.equal((await completeResponse).status(), 200)
  const completedAt = Date.now()
  const sessionCard = waiter.locator(`[data-item-id="${item.id}"]`)
  await sessionCard.getByRole('button', { name: 'Đã phục vụ', exact: true }).waitFor({ timeout: 3000 })
  timings.completeAfterResponseMs = Date.now() - completedAt
  pass('Complete reaches waiter through async SSE without F5')
  await sessionCard.getByRole('button', { name: 'Đã phục vụ', exact: true }).click()
  await sessionCard.getByText('Đã phục vụ', { exact: true }).waitFor()
  pass('Serving still succeeds with Session → OrderItem locks')
  const after = databaseSnapshot()
  const ledger = after.movements.filter((movement) => movement.orderItemId === item.id)
  assert.equal(ledger.length, 2)
  assert.equal(after.service_session, before.service_session)
  assert.equal(after.invoice, before.invoice)
  assert.equal(errors.length, 0)
  pass('Two expected consumption movements, no extra session/invoice or JavaScript error')
  await mkdir('.cache/phase2-review', { recursive: true })
  await writeFile('.cache/phase2-review/browser-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, results, errors, timings, before, after }, null, 2))
  console.log(`PASS ${results.length} review browser checks on real app/API/Neon; ${JSON.stringify(timings)}`)
} finally {
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
  await browser.close()
}
