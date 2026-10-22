import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const modulePath = process.env.PLAYWRIGHT_MODULE
const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright')
const base = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
let checks = 0
const errors = []
async function login(page, phone, password = 'Demo@123') {
  await page.getByLabel('Số điện thoại', { exact: true }).fill(phone)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/login`)
  await login(page, '0900000001', 'Wrong@123')
  await page.getByRole('alert').filter({ hasText: 'Số điện thoại hoặc mật khẩu không đúng' }).waitFor()
  checks++
  const routes = ['/reports', '/reservations', '/payment', '/floor-plan', '/kitchen', '/kitchen']
  for (const [index, route] of routes.entries()) {
    await login(page, `090000000${index + 1}`)
    await page.waitForURL(`${base}${route}`)
    await page.reload()
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, route)
    checks += 2
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
    await page.waitForURL(`${base}/login`)
    checks++
  }
  // Checklist 3 UI with a mocked response; does not lock a shared account.
  await page.route('**/api/auth/login', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: 403, code: 'ACCOUNT_LOCKED', message: 'Tài khoản đã bị khóa', fieldErrors: {} }) }))
  await login(page, '0900000003')
  await page.getByRole('alert').filter({ hasText: 'Tài khoản đã bị khóa' }).waitFor()
  checks++
  await page.unroute('**/api/auth/login')
  await login(page, '0900000004')
  await page.waitForURL(`${base}/floor-plan`)
  await page.goto(`${base}/accounts`)
  await page.getByText('Bạn không có quyền truy cập trang này', { exact: true }).waitFor()
  checks++
  await page.evaluate(async () => {
    const { api } = await import('/src/api/client.ts')
    try { await api.get('/accounts') } catch { /* intercepted */ }
  })
  await page.getByText('Bạn không có quyền thực hiện thao tác này', { exact: true }).waitFor()
  checks++

  // Real cross-tab login, including a late response sent with the old token.
  const second = await context.newPage()
  await second.goto(`${base}/login`)
  await second.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor()
  const requestCaptured = page.waitForRequest('**/api/auth/me')
  await page.evaluate(async () => {
    // Use Vite's current URL (including its HMR timestamp) to inspect the app's instance.
    const main = await (await fetch('/src/main.tsx')).text()
    const url = main.match(/from "([^"]*\/api\/queryClient\.ts[^"]*)"/)[1]
    const { queryClient } = await import(url)
    window.qaQueryClient = queryClient
    queryClient.setQueryData(['previous-account'], { privateData: 'old user' })
  })
  let releaseOld
  let capturedOld = false
  const released = new Promise((resolve) => { releaseOld = resolve })
  await page.route('**/api/auth/me', async (route) => {
    if (capturedOld) { await route.continue(); return }
    capturedOld = true
    await released
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  })
  await page.evaluate(() => {
    window.oldRequestFinished = import('/src/api/client.ts').then(({ api }) => api.get('/auth/me').catch(() => null))
  })
  await requestCaptured
  const response = await context.request.post(`${base}/api/auth/login`, { data: { phone: '0900000001', password: 'Demo@123' } })
  const owner = await response.json()
  await second.evaluate((value) => localStorage.setItem('restaurant.session', JSON.stringify({ accessToken: value.accessToken, expiresAt: value.expiresAt })), owner)
  await page.getByRole('heading', { name: 'Tài khoản', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.qaQueryClient.getQueryData(['previous-account']) ?? null), null)
  checks++
  releaseOld()
  await page.evaluate(() => window.oldRequestFinished)
  await page.unroute('**/api/auth/me')
  await page.goto(`${base}/reports`)
  await page.getByRole('heading', { name: 'Báo cáo', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('restaurant.session')).accessToken), owner.accessToken)
  checks++
  await page.setViewportSize({ width: 834, height: 1112 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  checks++
  await context.close()

  const blocked = await browser.newContext()
  const blockedPage = await blocked.newPage()
  blockedPage.on('pageerror', (error) => errors.push(error.message))
  await blockedPage.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await blockedPage.goto(`${base}/login`)
  await blockedPage.getByRole('heading', { name: 'Đăng nhập', exact: true }).waitFor()
  await login(blockedPage, '0900000001')
  await blockedPage.getByRole('alert').filter({ hasText: 'Trình duyệt chưa cho phép lưu phiên đăng nhập' }).waitFor()
  checks++
  await blocked.close()
  assert.deepEqual(errors, [])
  console.log(`PASS ${checks} headless browser checks; no shared DB fixtures changed.`)
} finally { await browser.close() }
