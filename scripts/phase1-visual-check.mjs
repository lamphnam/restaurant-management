import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const base = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const errors = [], warnings = [], results = []
const directory = '.cache/phase1/screenshots'
await mkdir(directory, { recursive: true })
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(() => document.querySelectorAll('.ant-message-notice').length === 0)
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true })
}
async function session(phone) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'UTC' })
  const response = await context.request.post(`${base}/api/auth/login`, { data: { phone, password: process.env.DEMO_PASSWORD ?? 'Demo@123' } })
  assert.equal(response.status(), 200)
  const { accessToken, expiresAt } = await response.json()
  await context.addInitScript((value) => localStorage.setItem('restaurant.session', JSON.stringify(value)), { accessToken, expiresAt })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()) })
  return { context, page }
}
try {
  const owner = await session('0900000001')
  for (const [route, title, name] of [['/accounts', 'Tài khoản', 'accounts-desktop'], ['/menu', 'Thực đơn', 'menu-desktop']]) {
    await owner.page.goto(`${base}${route}`)
    await owner.page.getByRole('heading', { name: title, exact: true }).waitFor()
    await owner.page.locator('.ant-table-tbody tr[data-row-key]').first().waitFor()
    await screenshot(owner.page, name)
    results.push(`${title}: loaded desktop screenshot`)
  }
  await owner.page.goto(`${base}/floor-plan`)
  await owner.page.locator('.table-card').first().waitFor()
  await screenshot(owner.page, 'floor-plan-desktop')
  for (const width of [834, 375]) {
    await owner.page.setViewportSize({ width, height: 1112 })
    assert(await owner.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await screenshot(owner.page, width === 834 ? 'floor-plan-tablet' : 'floor-plan-mobile')
    results.push(`Floor plan ${width}px: loaded and no overflow`)
  }
  await owner.context.close()

  const manager = await session('0900000002')
  const page = manager.page
  await page.goto(`${base}/reservations`)
  await page.locator('.ant-table-tbody tr[data-row-key]').first().waitFor()
  await screenshot(page, 'reservations-desktop')
  await page.getByRole('button', { name: 'Tạo đặt bàn', exact: true }).click()
  const drawer = page.getByRole('dialog')
  await drawer.getByLabel('Tên khách', { exact: true }).fill('[QA] Kiểm tra fieldErrors')
  await drawer.getByLabel('Số điện thoại', { exact: true }).fill('0912345678')
  await drawer.getByRole('button', { name: 'Tìm bàn phù hợp', exact: true }).click()
  await drawer.getByRole('radio').first().check()
  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 400, code: 'INVALID_INPUT', message: 'Vui lòng kiểm tra thông tin đã nhập', fieldErrors: { customerName: 'Tên khách cần được kiểm tra lại' } }) })
  })
  await drawer.getByRole('button', { name: 'Lưu đặt bàn', exact: true }).click()
  await drawer.locator('.ant-form-item-explain-error').getByText('Tên khách cần được kiểm tra lại', { exact: true }).waitFor()
  await drawer.getByRole('button', { name: 'Tìm bàn phù hợp', exact: true }).waitFor()
  results.push('Server fieldErrors return to the first step and bind to customerName; mocked response, no DB write')
  await page.keyboard.press('Escape')
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
  await writeFile('.cache/phase1/visual-results.json', JSON.stringify({ results, errors, warnings }, null, 2))
  console.log(`PASS ${results.length} visual/validation checks; no DB writes.`)
  await manager.context.close()
} finally { await browser.close() }
