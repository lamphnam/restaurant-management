import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// All API requests are mocked, including writes. Polling uses real browser timers.
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const channel = process.env.BROWSER_CHANNEL ?? 'chrome'
const browser = await chromium.launch({ channel, headless: true })
const output = `.cache/phase4-pr-review-browser-${channel}`
await mkdir(output, { recursive: true })
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const now = '2026-10-23T08:17:00.000Z'
const evidence = { checkedAt: new Date().toISOString(), completed: false, results: [], errors: [], unexpected: [] }
const pass = (label) => { evidence.results.push(label); console.log(`PASS ${label}`) }
async function fixture(role) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, timezoneId: 'America/New_York', reducedMotion: 'reduce' })
  await context.addInitScript(() => localStorage.setItem('restaurant.session', JSON.stringify({ accessToken: 'mocked-pr-review', expiresAt: new Date(Date.now() + 3600000).toISOString() })))
  const state = { previews: [], rows: [], listCalls: 0 }
  await context.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname
    if (!endpoint.startsWith('/api/')) return route.continue()
    const json = (data) => route.fulfill({ json: data })
    if (endpoint === '/api/auth/me') return json({ accountId: 3, fullName: `[QA] ${role}`, role })
    if (endpoint === '/api/events') return route.abort('failed')
    if (endpoint === '/api/reconciliations/preview') {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to')
      state.previews.push({ from, to })
      return json({ from, to, invoiceCount: 0, systemRevenue: 0, methods: [{ paymentMethod: 'CASH', invoiceCount: 0, revenue: 0 }, { paymentMethod: 'BANK_TRANSFER', invoiceCount: 0, revenue: 0 }] })
    }
    if (endpoint === '/api/reconciliations' && request.method() === 'GET') {
      state.listCalls++
      return json({ items: state.rows, total: state.rows.length, page: 0, size: 20 })
    }
    evidence.unexpected.push(`${role}: ${request.method()} ${endpoint}`)
    return route.fulfill({ status: 500, json: { message: 'Unexpected mock endpoint' } })
  })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(now))
  page.on('pageerror', (error) => evidence.errors.push(`${role}: ${error.message}`))
  await page.goto(`${frontend}/reconciliation`)
  return { context, page, state }
}
try {
  {
    const { context, page, state } = await fixture('CASHIER')
    await page.getByRole('button', { name: 'Lập đối soát', exact: true }).waitFor()
    await page.getByText('Không có dữ liệu hóa đơn trong khoảng này.', { exact: true }).waitFor()
    assert.equal(await page.locator('#reconciliation-period').inputValue(), '23/10/2026 00:00')
    assert.equal(await page.locator('#reconciliation-period-end').inputValue(), '23/10/2026 15:17')
    assert.deepEqual(state.previews[0], { from: '2026-10-22T17:00:00.000Z', to: now })
    pass('Cashier default preview ends at the current Vietnam minute, not tomorrow, on a US-timezone browser')
    await page.locator('#reconciliation-period-end').click()
    const picker = page.locator('.ant-picker-dropdown:visible')
    await picker.waitFor()
    assert.match(await picker.locator('td[title="2026-10-24"]').first().getAttribute('class'), /ant-picker-cell-disabled/)
    const hours = picker.locator('.ant-picker-time-panel-column').nth(0)
    const minutes = picker.locator('.ant-picker-time-panel-column').nth(1)
    assert.match(await hours.locator('li').filter({ hasText: /^16$/ }).getAttribute('class'), /disabled/)
    assert.doesNotMatch(await hours.locator('li').filter({ hasText: /^15$/ }).getAttribute('class'), /disabled/)
    assert.match(await minutes.locator('li').filter({ hasText: /^18$/ }).getAttribute('class'), /disabled/)
    await page.screenshot({ path: `${output}/cashier-picker.png`, fullPage: true })
    await page.keyboard.press('Escape')
    pass('Cashier picker disables future days, hours and minutes while the current hour remains selectable')
    await context.close()
  }
  {
    const { context, page, state } = await fixture('MANAGER')
    await page.getByText('Không có dữ liệu', { exact: true }).waitFor()
    assert.equal(state.listCalls, 1)
    state.rows = [{ id: 901, cashierId: 3, cashierName: '[QA] Đối soát mới', managerId: null, managerName: null, startTime: '2026-10-22T17:00:00Z', endTime: now, systemRevenue: 100, actualAmount: 100, difference: 0, differenceReason: null, reconciledAt: now, confirmed: false }]
    const started = Date.now()
    await page.locator('[data-row-key="901"]').waitFor({ timeout: 40000 })
    evidence.pollingMs = Date.now() - started
    assert(evidence.pollingMs >= 25000 && evidence.pollingMs <= 40000)
    assert(state.listCalls >= 2)
    assert.equal(state.previews.length, 0)
    await page.screenshot({ path: `${output}/manager-polling.png`, fullPage: true })
    pass(`Manager pending list receives a new row through30s polling (${evidence.pollingMs}ms), without clicks or SSE`)
    await context.close()
  }
  assert.deepEqual(evidence.errors, [])
  assert.deepEqual(evidence.unexpected, [])
  evidence.completed = true
} catch (error) {
  evidence.failure = error.message
  throw error
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ checks: evidence.results.length, completed: evidence.completed, mocked: true }))
