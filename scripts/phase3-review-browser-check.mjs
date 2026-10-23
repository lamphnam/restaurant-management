import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// All API traffic is mocked, including writes. No request reaches Neon.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const base = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const results = [], errors = [], unexpected = []
let currentPage
await mkdir('.cache/phase3-review', { recursive: true })
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }

try {
  for (const [width, reducedMotion] of [[1024, 'no-preference'], [1024, 'reduce'], [375, 'no-preference'], [375, 'reduce']]) {
    const label = `${width}px ${reducedMotion}`
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion, locale: 'vi-VN' })
    const page = await context.newPage()
    currentPage = page
    const mutations = []
    let currentStock = 10
    await context.addInitScript(() => localStorage.setItem('restaurant.session', JSON.stringify({
      accessToken: 'qa-mocked-token', expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    })))
    await context.route('**/api/**', async (route) => {
      const request = route.request(), url = new URL(request.url())
      if (!url.pathname.startsWith('/api/')) return route.continue()
      const json = (data) => route.fulfill({ json: data })
      if (url.pathname === '/api/auth/me') return json({ accountId: 6, fullName: '[QA] Bếp trưởng', role: 'HEAD_CHEF' })
      if (url.pathname === '/api/events') return route.abort('failed')
      if (url.pathname === '/api/inventory/stocktakes/template') return json([
        { ingredientId: 1, ingredientName: '[QA] Bánh phở', unit: 'kg', currentStock },
        { ingredientId: 2, ingredientName: '[QA] Trứng', unit: 'quả', currentStock: 50 },
      ])
      if (url.pathname === '/api/inventory/stocktakes' && request.method() === 'GET') return json({ items: [], page: 0, size: 10, total: 0 })
      if (url.pathname === '/api/inventory/stocktakes' && request.method() === 'POST') {
        mutations.push(request.postDataJSON())
        return json({ id: mutations.length, items: [] })
      }
      unexpected.push(`${request.method()} ${url.pathname}`)
      return route.fulfill({ status: 500, json: { message: 'Unexpected mock request' } })
    })
    page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`))
    await page.goto(`${base}/inventory/stocktake`)
    const pho = page.getByRole('spinbutton', { name: 'Số lượng thực tế [QA] Bánh phở', exact: true })
    const egg = page.getByRole('spinbutton', { name: 'Số lượng thực tế [QA] Trứng', exact: true })
    const submit = page.getByRole('button', { name: /Xác nhận & Lưu phiếu kiểm kê/ })
    await pho.waitFor({ timeout: 10_000 }).catch(async (error) => {
      console.log(JSON.stringify({ url: page.url(), body: await page.locator('body').innerText(), errors, unexpected }))
      throw error
    })
    assert.equal(await pho.inputValue(), '')
    assert.equal(await egg.inputValue(), '')
    assert.equal(await submit.isDisabled(), true)
    pass(`${label}: actual quantities start blank and empty submission is disabled`)

    await page.getByRole('textbox', { name: 'Ghi chú [QA] Bánh phở', exact: true }).fill('Chưa đếm')
    assert.equal(await submit.isDisabled(), true)
    await egg.fill('48')
    await egg.press('Tab')
    assert.equal(await submit.isEnabled(), true)
    await egg.fill('')
    await egg.press('Tab')
    assert.equal(await submit.isDisabled(), true)
    assert.equal(await egg.inputValue(), '')
    pass(`${label}: note alone and cleared quantity do not create counted lines`)

    // Represents consumption after the form was loaded: the client still displays 10.
    currentStock = 9
    await egg.fill('48')
    await egg.press('Tab')
    await submit.click()
    await page.getByRole('button', { name: 'Xác nhận kiểm kê', exact: true }).click()
    await page.getByText('Tạo thành công phiếu kiểm kê #1', { exact: true }).waitFor()
    assert.deepEqual(mutations[0], { items: [{ ingredientId: 2, actualQuantity: 48, note: '' }] })
    assert.equal(await pho.inputValue(), '')
    assert.equal(await egg.inputValue(), '')
    assert.equal(await submit.isDisabled(), true)
    pass(`${label}: only the counted ingredient is submitted; stale stock is omitted and success resets inputs`)

    await pho.fill('0')
    await pho.press('Tab')
    assert.equal(await submit.isEnabled(), true)
    await submit.click()
    await page.getByRole('button', { name: 'Xác nhận kiểm kê', exact: true }).click()
    await page.getByText('Tạo thành công phiếu kiểm kê #2', { exact: true }).waitFor()
    assert.deepEqual(mutations[1], { items: [{ ingredientId: 1, actualQuantity: 0, note: '' }] })
    assert.equal(mutations.length, 2)
    pass(`${label}: explicitly counted zero is retained and untouched rows stay omitted`)
    await page.screenshot({ path: `.cache/phase3-review/stocktake-${width}-${reducedMotion}.png`, fullPage: true })
    await context.close()
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(unexpected, [])
  await writeFile('.cache/phase3-review/browser-results.json', JSON.stringify({ results, errors, unexpected }, null, 2))
  console.log(`PASS ${results.length} browser scenarios, no page errors or unexpected API traffic`)
} catch (error) {
  console.log(JSON.stringify({ url: currentPage?.url(), body: await currentPage?.locator('body').innerText(), errors, unexpected }))
  throw error
} finally { await browser.close() }
