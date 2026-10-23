import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { base, databaseSnapshot, loginAll, roles } from './phase3-qa-support.mjs'

// Real API/Neon reads only. Browser rejects all mutations except authentication.
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const output = '.cache/phase4-review-live-readonly'
await mkdir(output, { recursive: true })
const evidence = { checkedAt: new Date().toISOString(), completed: false, results: [], errors: [], blockedWrites: [], before: databaseSnapshot() }
const auth = await loginAll()
const pass = (label) => { evidence.results.push(label); console.log(`PASS ${label}`) }
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
async function get(role, endpoint, status = 200) {
  const response = await fetch(`${base}/api${endpoint}`, { headers: { Authorization: `Bearer ${auth[role].accessToken}` }, signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, status, `${role} ${endpoint}`)
  return status === 200 ? response.json() : null
}
try {
  const from = '2026-09-30T17:00:00.000Z', to = '2026-10-31T17:00:00.000Z'
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const summary = await get('OWNER', `/payments/summary?${query}`)
  const invoices = []
  for (let page = 0; ; page++) {
    const batch = await get('OWNER', `/invoices?${query}&page=${page}&size=100`)
    invoices.push(...batch.items.filter((invoice) => invoice.paidAt >= from && invoice.paidAt < to))
    if ((page + 1) * 100 >= batch.total) break
  }
  const grouped = new Map(), dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
  for (const invoice of invoices) {
    const date = dateFormat.format(new Date(invoice.paidAt))
    const day = grouped.get(date) ?? { date, invoiceCount: 0, revenue: 0, cashRevenue: 0, bankTransferRevenue: 0 }
    day.invoiceCount++; day.revenue += Number(invoice.amount)
    day[invoice.paymentMethod === 'CASH' ? 'cashRevenue' : 'bankTransferRevenue'] += Number(invoice.amount)
    grouped.set(date, day)
  }
  const expectedDays = [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date))
  assert.deepEqual(summary.dailyRevenue, expectedDays)
  assert.equal(summary.revenue.invoiceCount, invoices.length)
  assert.equal(summary.revenue.systemRevenue, invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0))
  pass('Real October API: daily counts, method amounts and total match individually fetched invoices')
  const peak = Math.max(0, ...expectedDays.map((day) => day.revenue))
  const today = dateFormat.format(new Date())
  const calendarDays = Math.max(0, Math.round((Date.parse(`${today < '2026-10-31' ? today : '2026-10-31'}T00:00:00Z`) - Date.parse('2026-10-01T00:00:00Z')) / 86400000) + 1)
  assert.deepEqual(summary.analysis, {
    averageInvoiceAmount: invoices.length ? Math.round(summary.revenue.systemRevenue / invoices.length) : 0,
    averageDailyRevenue: calendarDays ? Math.round(summary.revenue.systemRevenue / calendarDays) : 0, peakRevenue: peak,
    peakDates: peak ? expectedDays.filter((day) => day.revenue === peak).map((day) => day.date) : [], activeDays: expectedDays.length, calendarDays,
  })
  pass('Real October API: peak dates and averages match independent invoice calculation')
  const empty = await get('OWNER', '/payments/summary?from=2028-01-31T17:00:00Z&to=2028-02-29T17:00:00Z')
  assert.equal(empty.analysis.calendarDays, 0); assert.equal(empty.analysis.averageDailyRevenue, 0); assert.deepEqual(empty.dailyRevenue, []); assert.deepEqual(empty.analysis.peakDates, [])
  pass('Real API: future leap February has0 calendar days and no invented peak')
  for (const role of roles.filter((role) => role !== 'OWNER')) await get(role, `/payments/summary?${query}`, 403)
  pass('Real JWT API: all five non-OWNER roles still receive403 for summary')
  const accounts = await get('OWNER', '/accounts')
  const target = accounts.find((account) => account.phone === '0900000002')
  assert(target)
  const template = await get('HEAD_CHEF', '/inventory/stocktakes/template')
  const ingredient = template.find((item) => Number(item.currentStock) >= 0)
  assert(ingredient)
  for (const channel of ['chrome', 'msedge']) {
    const browser = await chromium.launch({ channel, headless: true })
    try {
      for (const role of ['OWNER', 'CASHIER', 'HEAD_CHEF']) {
        const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: 'reduce', timezoneId: 'America/New_York', locale: 'vi-VN' })
        await context.route('**/api/**', async (route) => {
          const request = route.request(), endpoint = new URL(request.url()).pathname
          if (endpoint.startsWith('/api/') && request.method() !== 'GET' && !(endpoint === '/api/auth/login' && request.method() === 'POST')) {
            evidence.blockedWrites.push(`${channel} ${request.method()} ${endpoint}`)
            return route.abort('blockedbyclient')
          }
          return route.continue()
        })
        const page = await context.newPage()
        page.on('pageerror', (error) => evidence.errors.push(`${channel} ${role}: ${error.message}`))
        await page.goto(`${frontend}/login`)
        await page.getByLabel('Số điện thoại', { exact: true }).fill(`090000000${roles.indexOf(role) + 1}`)
        await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.DEMO_PASSWORD ?? 'Demo@123')
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
        await page.waitForURL(`${frontend}${role === 'OWNER' ? '/reports' : role === 'CASHIER' ? '/payment' : '/kitchen'}`)
        if (role === 'OWNER') {
          const response = page.waitForResponse((response) => response.url().includes('/api/payments/summary?') && response.url().includes('2026-09-30'))
          await page.locator('#report-month').fill('10/2026')
          await page.locator('#report-month').press('Enter')
          assert.equal((await response).status(), 200)
          const daily = page.getByRole('region', { name: 'Doanh thu theo ngày', exact: true })
          await daily.getByText(`${calendarDays} ngày trong kỳ`, { exact: true }).waitFor()
          if (summary.analysis.peakDates.length) await daily.getByText(summary.analysis.peakDates[0].split('-').reverse().join('/'), { exact: false }).first().waitFor()
          await page.screenshot({ path: `${output}/${channel}-reports.png`, fullPage: true })
          pass(`${channel}: real OWNER login and monthly report render server daily analysis in Vietnam time`)
          await page.goto(`${frontend}/accounts`)
          await page.locator('[data-row-key="1"]').waitFor()
          await page.getByLabel('Tên hoặc số điện thoại', { exact: true }).fill('090 000 0002')
          await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
          await page.getByText(`Tìm thấy 1 / ${accounts.length} tài khoản`, { exact: true }).waitFor()
          const row = page.locator(`[data-row-key="${target.id}"]`)
          await row.getByText(target.fullName, { exact: true }).waitFor()
          assert(!(await row.getByRole('button', { name: target.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa', exact: true }).isDisabled()))
          await page.screenshot({ path: `${output}/${channel}-accounts.png`, fullPage: true })
          pass(`${channel}: real account search finds correct employee and exposes lock action without submitting it`)
        } else if (role === 'CASHIER') {
          const preview = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/reconciliations/preview')
          await page.goto(`${frontend}/reconciliation`)
          const received = await preview
          assert.equal(received.status(), 200)
          const query = new URL(received.url()).searchParams
          assert(Date.parse(query.get('to')) <= Date.now())
          assert(Date.parse(query.get('from')) < Date.parse(query.get('to')))
          await page.getByRole('spinbutton', { name: 'Tổng thực nhận (đ)' }).waitFor()
          assert.equal(await page.getByRole('spinbutton', { name: 'Tổng thực nhận (đ)' }).inputValue(), '')
          await page.screenshot({ path: `${output}/${channel}-reconciliation.png`, fullPage: true })
          pass(`${channel}: real CASHIER default preview succeeds and ends in the past/current minute; no create`)
        } else {
          await page.goto(`${frontend}/inventory/stocktake`)
          const input = page.getByRole('spinbutton', { name: `Số lượng thực tế ${ingredient.ingredientName}`, exact: true })
          await input.waitFor(); assert.equal(await input.inputValue(), '')
          await page.getByRole('button', { name: `Khớp tồn hệ thống ${ingredient.ingredientName}`, exact: true }).click()
          assert.equal(Number(await input.inputValue()), Number(ingredient.currentStock))
          await page.screenshot({ path: `${output}/${channel}-stocktake.png`, fullPage: true })
          await input.fill(''); await input.press('Tab')
          assert(await page.getByRole('button', { name: 'Xác nhận & Lưu phiếu kiểm kê', exact: true }).isDisabled())
          pass(`${channel}: real stocktake template copies displayed stock and clearing omits it; no save`)
        }
        await context.close()
      }
    } finally { await browser.close() }
  }
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.blockedWrites, [])
  evidence.after = databaseSnapshot()
  assert.deepEqual(evidence.after, evidence.before)
  pass('Neon before/after snapshot identical; no domain writes and no browser page errors')
  evidence.completed = true
} catch (error) {
  evidence.failure = error.message
  throw error
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
}
console.log(JSON.stringify({ checks: evidence.results.length, completed: evidence.completed, live: true, readOnly: true }))
