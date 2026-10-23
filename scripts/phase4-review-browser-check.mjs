import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// All API traffic, including lock/stocktake writes, is mocked. Nothing reaches Neon.
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const channel = process.env.BROWSER_CHANNEL ?? 'chrome'
const browser = await chromium.launch({ channel, headless: true })
const output = `.cache/phase4-review-browser-${channel}`
await mkdir(output, { recursive: true })
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const results = [], errors = [], unexpected = []
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
const dailySource = [
  { date: '2026-10-02', invoiceCount: 1, revenue: 100000, cashRevenue: 100000, bankTransferRevenue: 0, cashCount: 1, bankCount: 0 },
  { date: '2026-10-05', invoiceCount: 3, revenue: 500000, cashRevenue: 200000, bankTransferRevenue: 300000, cashCount: 1, bankCount: 2 },
  { date: '2026-10-15', invoiceCount: 2, revenue: 500000, cashRevenue: 0, bankTransferRevenue: 500000, cashCount: 0, bankCount: 2 },
  { date: '2026-10-20', invoiceCount: 1, revenue: 0, cashRevenue: 0, bankTransferRevenue: 0, cashCount: 1, bankCount: 0 },
]
function summary(url) {
  const from = url.searchParams.get('from'), to = url.searchParams.get('to')
  assert(from.endsWith('T17:00:00.000Z') && to.endsWith('T17:00:00.000Z'), `Vietnam midnights on US browser timezone: ${from} / ${to}`)
  const dailyRevenue = dailySource.filter((day) => {
    const paid = Date.parse(`${day.date}T05:00:00Z`)
    return paid >= Date.parse(from) && paid < Date.parse(to)
  })
  const sum = (field) => dailyRevenue.reduce((total, day) => total + day[field], 0)
  const systemRevenue = sum('revenue'), invoiceCount = sum('invoiceCount')
  const calendarDays = Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
  const peakRevenue = Math.max(0, ...dailyRevenue.map((day) => day.revenue))
  return {
    revenue: { from, to, systemRevenue, invoiceCount, methods: [
      { paymentMethod: 'CASH', invoiceCount: sum('cashCount'), revenue: sum('cashRevenue') },
      { paymentMethod: 'BANK_TRANSFER', invoiceCount: sum('bankCount'), revenue: sum('bankTransferRevenue') },
    ] },
    topItems: systemRevenue ? [{ menuItemId: 1, menuItemName: '[QA] Món theo snapshot', quantity: 12, revenue: systemRevenue }] : [],
    dailyRevenue,
    analysis: { averageInvoiceAmount: invoiceCount ? Math.round(systemRevenue / invoiceCount) : 0,
      averageDailyRevenue: Math.round(systemRevenue / calendarDays), peakRevenue,
      peakDates: peakRevenue ? dailyRevenue.filter((day) => day.revenue === peakRevenue).map((day) => day.date) : [], activeDays: dailyRevenue.length, calendarDays },
  }
}
async function fixture(role, width, reducedMotion) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion, timezoneId: 'America/New_York', locale: 'vi-VN' })
  await context.addInitScript(() => localStorage.setItem('restaurant.session', JSON.stringify({ accessToken: 'mocked-review-token', expiresAt: new Date(Date.now() + 3600000).toISOString() })))
  const state = { accounts: Array.from({ length: 120 }, (_, index) => ({ id: index + 1, fullName: index === 0 ? '[QA] Chủ quán' : `[QA] Nhân viên ${index + 1}`, phone: `091${String(index).padStart(7, '0')}`, role: index === 0 ? 'OWNER' : 'WAITER', status: 'ACTIVE' })), mutations: [], summaries: [], history: [], currentStock: 10, failSummary: false }
  state.accounts[110] = { id: 111, fullName: 'Đặng Thị Hồng Ánh', phone: '0901234567', role: 'MANAGER', status: 'ACTIVE' }
  const label = `${channel} ${width}px ${reducedMotion} ${role}`
  await context.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname
    if (!endpoint.startsWith('/api/')) return route.continue()
    const json = (value, status = 200) => route.fulfill({ json: value, status })
    if (endpoint === '/api/auth/me') return json({ accountId: 1, fullName: `[QA] ${role}`, role })
    if (endpoint === '/api/events') return route.abort('failed')
    if (endpoint === '/api/accounts' && request.method() === 'GET') return json(state.accounts)
    if (/^\/api\/accounts\/\d+\/(lock|unlock)$/.test(endpoint)) {
      const id = Number(endpoint.split('/')[3]), account = state.accounts.find((item) => item.id === id)
      account.status = endpoint.endsWith('/lock') ? 'LOCKED' : 'ACTIVE'
      state.mutations.push({ endpoint, id }); return json(account)
    }
    if (endpoint === '/api/payments/summary') {
      state.summaries.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') })
      return state.failSummary ? json({ message: 'Lỗi báo cáo thử nghiệm' }, 400) : json(summary(url))
    }
    if (endpoint === '/api/inventory/ingredients') return json([])
    if (endpoint === '/api/inventory/lots/attention') return json([])
    if (endpoint === '/api/inventory/movements') return json({ items: [], total: 0, page: 0, size: 10 })
    if (endpoint === '/api/inventory/stocktakes/template') return json([
      { ingredientId: 1, ingredientName: '[QA] Tồn dương', unit: 'kg', currentStock: 10 },
      { ingredientId: 2, ingredientName: '[QA] Tồn không', unit: 'kg', currentStock: 0 },
      { ingredientId: 3, ingredientName: '[QA] Tồn âm', unit: 'kg', currentStock: -2 },
    ])
    if (endpoint === '/api/inventory/stocktakes' && request.method() === 'GET') return json({ items: state.history, total: state.history.length, page: 0, size: 10 })
    if (endpoint === '/api/inventory/stocktakes' && request.method() === 'POST') {
      const payload = request.postDataJSON()
      state.mutations.push({ endpoint, payload })
      const saved = { id: 1, createdById: 6, createdByName: '[QA] Bếp trưởng', createdAt: new Date().toISOString(), items: payload.items.map((item) => ({ ...item, id: item.ingredientId, ingredientName: `[QA] NVL ${item.ingredientId}`, unit: 'kg', systemQuantity: item.ingredientId === 1 ? state.currentStock : 0, difference: item.actualQuantity - (item.ingredientId === 1 ? state.currentStock : 0) })) }
      state.history = [saved]
      await new Promise((resolve) => setTimeout(resolve, 500))
      return json(saved)
    }
    unexpected.push(`${label}: ${request.method()} ${endpoint}`)
    return json({ message: 'Unexpected mock request' }, 500)
  })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-10-23T08:00:00Z'))
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`))
  return { context, page, state, label }
}
async function choose(page, id, label) {
  await page.locator(id).click()
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${label}$`) }).click()
}
try {
  for (const [width, motion] of [[1440, 'no-preference'], [768, 'reduce'], [375, 'reduce']]) {
    {
      const { context, page, state, label } = await fixture('OWNER', width, motion)
      await page.goto(`${frontend}/accounts`)
      await page.locator('[data-row-key="1"]').waitFor()
      assert.equal(await page.locator('[data-row-key="111"]').count(), 0)
      await page.getByLabel('Tên hoặc số điện thoại', { exact: true }).fill('dang hong anh')
      await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
      const row = page.locator('[data-row-key="111"]')
      await row.waitFor()
      await page.getByText('Tìm thấy 1 / 120 tài khoản', { exact: true }).waitFor()
      pass(`${label}: unaccented search finds employee111 outside first page`)
      await row.getByRole('button', { name: 'Khóa', exact: true }).click()
      await row.getByRole('button', { name: 'Mở khóa', exact: true }).waitFor()
      assert.deepEqual(state.mutations.map((item) => item.id), [111])
      pass(`${label}: lock targets correct searched id and refetch retains filter`)
      await page.getByLabel('Tên hoặc số điện thoại', { exact: true }).fill('090 123 4567')
      await page.getByLabel('Tên hoặc số điện thoại', { exact: true }).press('Enter')
      await row.waitFor()
      await choose(page, '#account-role-filter', 'Quản lý')
      await choose(page, '#account-status-filter', 'Bị khóa')
      await row.waitFor()
      pass(`${label}: formatted phone, Enter and combined role/status filters work`)
      await page.getByLabel('Tên hoặc số điện thoại', { exact: true }).fill('khong co nguoi nay')
      await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
      await page.getByText('Không tìm thấy tài khoản. Thử tên/SĐT khác hoặc đặt lại bộ lọc.').waitFor()
      await page.getByRole('button', { name: 'Đặt lại', exact: true }).click()
      const owner = page.locator('[data-row-key="1"]')
      await owner.waitFor()
      assert(await owner.getByRole('button', { name: 'Khóa', exact: true }).isDisabled())
      assert(await owner.getByRole('combobox').isDisabled())
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      await page.screenshot({ path: `${output}/accounts-${width}.png`, fullPage: true })
      pass(`${label}: empty/reset/pagination and self-protection remain usable without overflow`)
      await context.close()
    }
    {
      const { context, page, state, label } = await fixture('OWNER', width, motion)
      await page.goto(`${frontend}/reports`)
      await page.getByRole('button', { name: 'Tháng này', exact: true }).click()
      const daily = page.getByRole('region', { name: 'Doanh thu theo ngày', exact: true })
      await daily.getByText('31 ngày trong kỳ', { exact: true }).waitFor()
      assert(state.summaries.some((query) => query.from === '2026-09-30T17:00:00.000Z' && query.to === '2026-10-31T17:00:00.000Z'))
      await daily.getByText('05/10/2026 và 1 ngày cùng mức', { exact: true }).waitFor()
      await daily.locator('[data-row-key="2026-10-05"]').getByText('Cao nhất', { exact: true }).waitFor()
      const emptyDay = daily.locator('[data-row-key="2026-10-01"]')
      assert((await emptyDay.innerText()).includes('0'))
      pass(`${label}: month selection sends Vietnam [start,nextMonth), shows tied peak and zero day`)
      await daily.locator('.ant-pagination-next button').click()
      await daily.locator('[data-row-key="2026-10-15"]').getByText('Cao nhất', { exact: true }).waitFor()
      await daily.locator('.ant-pagination-item-4').click()
      await daily.locator('[data-row-key="2026-10-31"]').waitFor()
      assert.equal(await daily.locator('tbody tr[data-row-key]').count(), 1)
      pass(`${label}: daily pagination reaches second peak and October31 correctly`)
      await page.screenshot({ path: `${output}/reports-${width}.png`, fullPage: true })
      await page.locator('#report-month').fill('02/2028')
      await page.locator('#report-month').press('Enter')
      await daily.getByText('29 ngày trong kỳ', { exact: true }).waitFor()
      await page.getByText('Không có dữ liệu hóa đơn trong khoảng này.', { exact: true }).waitFor()
      assert(state.summaries.some((query) => query.from === '2028-01-31T17:00:00.000Z' && query.to === '2028-02-29T17:00:00.000Z'))
      pass(`${label}: month picker handles leap February and empty period without stale peaks`)
      state.failSummary = true
      await page.getByRole('button', { name: 'Làm mới', exact: true }).click()
      await page.getByText('Không tải được báo cáo doanh thu', { exact: true }).waitFor()
      assert.equal(await daily.count(), 0)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      pass(`${label}: report error hides stale insights; inventory blocks remain and no overflow`)
      await context.close()
    }
    {
      const { context, page, state, label } = await fixture('HEAD_CHEF', width, motion)
      await page.goto(`${frontend}/inventory/stocktake`)
      const positive = page.getByRole('spinbutton', { name: 'Số lượng thực tế [QA] Tồn dương', exact: true })
      const zero = page.getByRole('spinbutton', { name: 'Số lượng thực tế [QA] Tồn không', exact: true })
      const submit = page.getByRole('button', { name: 'Xác nhận & Lưu phiếu kiểm kê', exact: true })
      await positive.waitFor()
      assert.equal(await positive.inputValue(), '')
      assert(await submit.isDisabled())
      assert(await page.getByRole('button', { name: 'Khớp tồn hệ thống [QA] Tồn âm', exact: true }).isDisabled())
      await page.getByRole('button', { name: 'Khớp tồn hệ thống [QA] Tồn dương', exact: true }).click()
      assert.equal(Number(await positive.inputValue()), 10)
      assert.equal(await zero.inputValue(), '')
      assert.equal(state.mutations.length, 0)
      pass(`${label}: match is explicit per row, copies positive stock, leaves others blank and blocks negative stock`)
      await positive.fill('')
      await positive.press('Tab')
      assert(await submit.isDisabled())
      await page.getByRole('button', { name: 'Khớp tồn hệ thống [QA] Tồn không', exact: true }).click()
      assert.equal(Number(await zero.inputValue()), 0)
      assert(!(await submit.isDisabled()))
      await page.getByRole('button', { name: 'Khớp tồn hệ thống [QA] Tồn dương', exact: true }).click()
      state.currentStock = 9
      await submit.click()
      await page.locator('.ant-popconfirm').getByRole('button', { name: 'Xác nhận kiểm kê', exact: true }).click()
      await page.getByRole('button', { name: 'Khớp tồn hệ thống [QA] Tồn dương', exact: true }).waitFor()
      assert(await page.getByRole('button', { name: 'Khớp tồn hệ thống [QA] Tồn dương', exact: true }).isDisabled())
      await page.getByText('Tạo thành công phiếu kiểm kê #1', { exact: true }).waitFor()
      assert.deepEqual(state.mutations[0].payload.items.map(({ ingredientId, actualQuantity }) => ({ ingredientId, actualQuantity })), [{ ingredientId: 1, actualQuantity: 10 }, { ingredientId: 2, actualQuantity: 0 }])
      assert.equal(state.history[0].items[0].difference, 1)
      assert.equal(await positive.inputValue(), '')
      assert.equal(await zero.inputValue(), '')
      await page.screenshot({ path: `${output}/stocktake-${width}.png`, fullPage: true })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      pass(`${label}: clear/explicit0/count-only, fixed actual after stock changes, pending disable and success reset`)
      await context.close()
    }
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(unexpected, [])
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results, errors, unexpected }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ checks: results.length, errors: errors.length, mocked: true }))
