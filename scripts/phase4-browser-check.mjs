import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Mocked browser checks: every API request is intercepted; no Neon writes.
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const channel = process.env.BROWSER_CHANNEL ?? 'chrome'
const browser = await chromium.launch({ channel, headless: true })
const output = `.cache/phase4-browser-${channel}`
await mkdir(output, { recursive: true })
const results = [], errors = [], unexpected = []
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
const base = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const revenue = (total = 100) => ({ from: '2026-10-22T17:00:00Z', to: '2026-10-23T17:00:00Z', invoiceCount: total ? 2 : 0, systemRevenue: total, methods: [{ paymentMethod: 'CASH', invoiceCount: total ? 1 : 0, revenue: total }, { paymentMethod: 'BANK_TRANSFER', invoiceCount: total ? 1 : 0, revenue: 0 }] })
const row = { id: 1, cashierId: 3, cashierName: '[QA] Thu ngân', managerId: null, managerName: null, startTime: '2026-10-22T17:00:00Z', endTime: '2026-10-23T17:00:00Z', actualAmount: 0, systemRevenue: 200, difference: -200, differenceReason: null, reconciledAt: '2026-10-23T07:00:00Z', confirmed: false }

try {
  for (const [width, reducedMotion] of [[1024, 'no-preference'], [1024, 'reduce'], [375, 'no-preference'], [375, 'reduce']]) {
    for (const role of ['CASHIER', 'MANAGER', 'OWNER']) {
      const label = `${channel} ${width}px ${reducedMotion} ${role}`
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion, timezoneId: 'America/New_York' })
      await context.addInitScript(() => localStorage.setItem('restaurant.session', JSON.stringify({ accessToken: 'mocked-token', expiresAt: new Date(Date.now() + 3600000).toISOString() })))
      let rows = role === 'MANAGER' ? [row] : [], posted, previewCalls = 0, empty = false, failed = false
      await context.route('**/api/**', async (route) => {
        const req = route.request(), url = new URL(req.url()), endpoint = url.pathname
        if (!endpoint.startsWith('/api/')) return route.continue()
        const json = (value, status = 200) => route.fulfill({ json: value, status })
        if (endpoint === '/api/auth/me') return json({ accountId: 3, fullName: `[QA] ${role}`, role })
        if (endpoint === '/api/events') return route.abort('failed')
        if (endpoint === '/api/reconciliations/preview') { previewCalls++; return json(revenue()) }
        if (endpoint === '/api/reconciliations' && req.method() === 'GET') return json({ items: rows.filter((item) => !url.searchParams.has('confirmed') || item.confirmed === (url.searchParams.get('confirmed') === 'true')), total: rows.length, page: 0, size: 20 })
        if (endpoint === '/api/reconciliations' && req.method() === 'POST') { posted = req.postDataJSON(); rows = [row]; return json(row) }
        if (endpoint === '/api/reconciliations/1/confirm') { rows = [{ ...row, managerId: 2, managerName: 'Quản lý', confirmed: true }]; return json({ status: 409, code: 'INVALID_STATE', message: 'Đối soát đã được xác nhận' }, 409) }
        if (endpoint === '/api/payments/summary') {
          assert(url.searchParams.get('from').endsWith('T17:00:00.000Z'))
          assert(url.searchParams.get('to').endsWith('T17:00:00.000Z'))
          const date = new Date(Date.parse(url.searchParams.get('from')) + 7 * 3600000).toISOString().slice(0, 10)
          const calendarDays = Math.round((Date.parse(url.searchParams.get('to')) - Date.parse(url.searchParams.get('from'))) / 86400000)
          return json({ revenue: revenue(empty ? 0 : 100), topItems: empty ? [] : [{ menuItemId: 1, menuItemName: '[QA] Món snapshot', quantity: 3, revenue: 100 }],
            dailyRevenue: empty ? [] : [{ date, invoiceCount: 2, revenue: 100, cashRevenue: 100, bankTransferRevenue: 0 }],
            analysis: { averageInvoiceAmount: empty ? 0 : 50, averageDailyRevenue: empty ? 0 : Math.round(100 / calendarDays), peakRevenue: empty ? 0 : 100, peakDates: empty ? [] : [date], activeDays: empty ? 0 : 1, calendarDays } })
        }
        if (endpoint === '/api/inventory/ingredients') return failed ? json({ message: 'Lỗi kho thử nghiệm' }, 400) : json(empty ? [] : [{ id: 1, name: '[QA] Tồn âm', unit: 'kg', currentStock: -1, minStock: 5 }])
        if (endpoint === '/api/inventory/lots/attention') return json([])
        if (endpoint === '/api/inventory/movements') return json({ items: [], total: 0, page: 0, size: 10 })
        unexpected.push(`${req.method()} ${endpoint}`)
        return json({ message: 'Unexpected mock request' }, 500)
      })
      const page = await context.newPage()
      page.on('pageerror', (error) => errors.push(`${label} ${error.message}`))
      await page.goto(`${base}/${role === 'OWNER' ? '' : 'reconciliation'}`)
      await page.getByRole('heading', { name: role === 'OWNER' ? 'Báo cáo' : 'Đối soát cuối ca', exact: true }).waitFor()
      if (role === 'CASHIER') {
        const amount = page.getByRole('spinbutton', { name: 'Tổng thực nhận (đ)' })
        await amount.waitFor()
        assert.equal(await amount.inputValue(), '')
        await page.getByRole('button', { name: 'Lập đối soát', exact: true }).click()
        await page.getByText('Vui lòng nhập tổng thực nhận', { exact: true }).waitFor()
        assert.equal(posted, undefined)
        pass(`${label}: blank actual validates without writing`)
        await amount.fill('0')
        await page.getByRole('button', { name: 'Lập đối soát', exact: true }).click()
        const popover = page.locator('.ant-popconfirm').filter({ hasText: 'Lập đối soát với' })
        await popover.waitFor()
        const box = await popover.boundingBox()
        assert(box && box.x >= -1 && box.x + box.width <= width + 1)
        await popover.getByRole('button', { name: 'Lập đối soát', exact: true }).click()
        await page.getByText('Chưa xác nhận', { exact: true }).waitFor()
        assert.equal(posted.actualAmount, 0)
        assert.deepEqual(Object.keys(posted).sort(), ['actualAmount', 'endTime', 'startTime'])
        assert.equal(await amount.inputValue(), '')
        await page.getByText('-200', { exact: false }).first().waitFor()
        pass(`${label}: explicit zero, payload whitelist, fresh server snapshot and form reset`)
      } else if (role === 'MANAGER') {
        await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
        await page.locator('.ant-popconfirm').getByRole('button', { name: 'Xác nhận', exact: true }).click()
        await page.getByText('Đối soát đã được xác nhận', { exact: true }).waitFor()
        await page.getByRole('button', { name: 'Xác nhận', exact: true }).waitFor({ state: 'hidden' })
        assert.equal(previewCalls, 0)
        pass(`${label}: pending default, no cashier preview, stale confirm 409 refetches`)
      } else {
        await page.getByText('[QA] Món snapshot').waitFor()
        await page.getByText('(Tồn âm)', { exact: false }).waitFor()
        empty = true
        await page.getByRole('button', { name: 'Làm mới', exact: true }).click()
        await page.getByText('Không có dữ liệu hóa đơn trong khoảng này.').waitFor()
        failed = true
        await page.getByRole('button', { name: 'Làm mới', exact: true }).click()
        await page.getByText('Không tải được tồn kho', { exact: true }).waitFor()
        pass(`${label}: OWNER landing, Vietnam range on US timezone, empty and partial error`)
      }
      if (role !== 'MANAGER') {
        await page.locator(role === 'OWNER' ? '#report-period' : '#reconciliation-period').click()
        const picker = page.locator('.ant-picker-dropdown:visible')
        await picker.waitFor()
        await page.keyboard.press('Escape')
        await picker.waitFor({ state: 'hidden' })
        pass(`${label}: date popup opens and Escape closes`)
      }
      if (role !== 'OWNER') {
        const select = page.getByRole('combobox', { name: 'Xác nhận', exact: true })
        await select.click()
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Tất cả' }).waitFor()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await page.keyboard.press('Escape')
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} page overflow`)
      await page.screenshot({ path: `${output}/${role}-${width}-${reducedMotion}.png`, fullPage: true })
      pass(`${label}: responsive with scrollable tables and no document overflow`)
      await context.close()
    }
  }
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results, errors, unexpected }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ checks: results.length, pageErrors: errors.length }))
