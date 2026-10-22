import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// All /api traffic is mocked. Safe to repeat: no request reaches Neon.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const base = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = []
const errors = []
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
const account = { accountId: 4, fullName: '[QA] Phục vụ', role: 'WAITER' }
const table = { id: 901, name: '[QA] T01', capacity: 4, status: 'AVAILABLE', activeSessionId: null, upcomingReservation: null }

async function fixture(reservationHandler) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'vi-VN' })
  const page = await context.newPage()
  const calls = []
  const opened = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const json = (data, status = 200) => route.fulfill({ status, json: data })
    if (url.pathname === '/api/auth/login') return json({ accessToken: 'qa-mocked-token', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), account })
    if (url.pathname === '/api/auth/me') return json(account)
    if (url.pathname === '/api/tables/floor-plan') return json([{ id: 1, name: '[QA] Khu vực', tables: [table] }])
    if (url.pathname === '/api/reservations') {
      calls.push(Object.fromEntries(url.searchParams))
      return reservationHandler(route, url)
    }
    if (url.pathname === '/api/sessions' && request.method() === 'POST') {
      const body = request.postDataJSON()
      opened.push(body)
      return json({ sessionId: 9901, tableId: table.id, reservationId: body.reservationId ?? null, openedAt: new Date().toISOString(), status: 'ACTIVE' })
    }
    throw new Error(`Unexpected mocked API call: ${request.method()} ${url.pathname}`)
  })
  await page.goto(`${base}/login`)
  await page.getByLabel('Số điện thoại', { exact: true }).fill('0900000004')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Demo@123')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL(`${base}/floor-plan`)
  await page.getByRole('button', { name: 'Mở phiên', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  return { context, page, calls, opened, dialog, submit: dialog.getByRole('button', { name: 'Mở phiên', exact: true }) }
}

try {
  {
    const test = await fixture(() => { throw new Error('Walk-in must not fetch reservations') })
    assert(await test.submit.isEnabled())
    assert.equal(test.calls.length, 0)
    await test.submit.click()
    await test.page.waitForURL(`${base}/sessions/9901`)
    assert.deepEqual(test.opened, [{ tableId: 901 }])
    assert.equal(test.calls.length, 0)
    pass('Walk-in opens immediately without any reservation request')
    await test.context.close()
  }
  {
    let release
    const pending = new Promise((resolve) => { release = resolve })
    const test = await fixture(async (route) => {
      await pending
      await route.fulfill({ json: { items: [], page: 0, size: 100, total: 0 } }).catch(() => {})
    })
    const requested = test.page.waitForRequest((request) => new URL(request.url()).pathname === '/api/reservations')
    await test.dialog.getByText('Khách đặt trước', { exact: true }).click()
    await requested
    assert(await test.submit.isDisabled())
    await test.dialog.getByText('Khách vãng lai (Walk-in)', { exact: true }).click()
    assert(await test.submit.isEnabled())
    await test.submit.click()
    await test.page.waitForURL(`${base}/sessions/9901`)
    assert.deepEqual(test.opened, [{ tableId: 901 }])
    release()
    pass('A pending reservation query does not block switching to walk-in')
    await test.context.close()
  }
  {
    const test = await fixture((route) => route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR', message: 'Lỗi QA giả lập' } }))
    await test.dialog.getByText('Khách đặt trước', { exact: true }).click()
    await test.dialog.getByRole('button', { name: 'Thử tải lại đặt bàn' }).waitFor({ timeout: 20_000 })
    assert(await test.submit.isDisabled())
    await test.dialog.getByText('Khách vãng lai (Walk-in)', { exact: true }).click()
    assert(await test.submit.isEnabled())
    await test.submit.click()
    await test.page.waitForURL(`${base}/sessions/9901`)
    assert.deepEqual(test.opened, [{ tableId: 901 }])
    pass('Reservation HTTP 500 blocks only reservation mode; walk-in still opens')
    await test.context.close()
  }
  {
    const reservation = (id) => ({ id, tableId: 901, tableName: table.name, customerName: `[QA] Khách ${id}`, customerPhone: '0910000001', guestCount: 2, startTime: new Date(Date.now() + 3_600_000).toISOString(), endTime: new Date(Date.now() + 7_200_000).toISOString(), note: null, status: 'CONFIRMED', overdue: false, createdAt: new Date().toISOString(), createdById: 2 })
    const test = await fixture((route, url) => {
      const page = Number(url.searchParams.get('page'))
      return route.fulfill({ json: { items: page === 0 ? Array.from({ length: 100 }, (_, i) => reservation(i + 1)) : [reservation(101)], page, size: 100, total: 101 } })
    })
    await test.dialog.getByText('Khách đặt trước', { exact: true }).click()
    const loadMore = test.dialog.getByRole('button', { name: 'Tải thêm đặt bàn' })
    await loadMore.waitFor()
    assert.deepEqual(test.calls, [{ status: 'CONFIRMED', tableId: '901', unexpired: 'true', page: '0', size: '100' }])
    pass('Picker requests only this table and unexpired bookings; it does not eagerly load the next page')
    await loadMore.click()
    await loadMore.waitFor({ state: 'hidden' })
    assert.equal(test.calls.length, 2)
    assert.equal(test.calls[1].page, '1')
    pass('Further pages are loaded explicitly, preserving access to more than 100 bookings')
    assert(await test.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    pass('Modal remains usable without horizontal page overflow at tablet width')
    await test.context.close()
  }
  assert.deepEqual(errors, [])
  pass('No browser JavaScript errors')
  await mkdir('.cache/phase1-review', { recursive: true })
  await writeFile('.cache/phase1-review/browser-results.json', JSON.stringify({ results, errors }, null, 2))
} finally {
  await browser.close()
}
