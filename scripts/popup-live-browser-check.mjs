import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { base, loginAll, selectQaSession } from './phase2-qa-support.mjs'

// Real authentication, REST reads and SSE. Block every business mutation at the browser boundary.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
const auth = await loginAll()
const call = async (role, method, pathname) => {
  assert.equal(method, 'GET')
  const response = await fetch(`${base}/api${pathname}`, { headers: { Authorization: `Bearer ${auth[role].accessToken}` } })
  assert.equal(response.status, 200)
  return response.json()
}
const session = await selectQaSession(call)
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = [], errors = [], blockedWrites = []
const pass = (label) => { results.push(label); console.log(`PASS ${label}`) }
await mkdir('.cache/popup-qa', { recursive: true })

async function fixture(role, reducedMotion) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN', reducedMotion })
  const { accessToken, expiresAt } = auth[role]
  await context.addInitScript((session) => localStorage.setItem('restaurant.session', JSON.stringify(session)), { accessToken, expiresAt })
  await context.route('**/api/**', (route) => {
    const request = route.request(), pathname = new URL(request.url()).pathname
    if (!pathname.startsWith('/api/') || request.method() === 'GET') return route.continue()
    blockedWrites.push(`${request.method()} ${pathname}`)
    return route.abort('blockedbyclient')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  page.on('pageerror', (error) => errors.push(error.message))
  return { page, context }
}

async function openSelect(page, input) {
  await input.click()
  const popup = page.locator('.ant-select-dropdown:visible').last()
  await popup.waitFor()
  await page.waitForTimeout(500)
  const visible = await popup.evaluate((node) => {
    const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && !!hit && node.contains(hit)
  })
  assert(visible, 'Popup must remain inside the viewport and above the modal/table')
  assert.equal(await input.getAttribute('aria-expanded'), 'true')
  assert(await popup.locator('.ant-select-item-option').count() > 0, 'Real API must provide options')
  return popup
}

try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const owner = await fixture('OWNER', reducedMotion), op = owner.page
    await op.goto(`${frontend}/accounts`)
    const role = op.getByRole('combobox').nth(1)
    const popup = await openSelect(op, role)
    assert.equal(await popup.locator('.ant-select-item-option').count(), 6)
    await role.press('Escape')
    pass(`${reducedMotion}: real account-role options open and remain on screen`)
    await op.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click()
    let dialog = op.getByRole('dialog')
    const createRole = dialog.getByRole('combobox')
    const choices = await openSelect(op, createRole)
    await choices.locator('.ant-select-item-option').filter({ hasText: /^Bếp trưởng$/ }).click()
    await dialog.locator('button.ant-modal-close').click()
    pass(`${reducedMotion}: real create-account Modal role selection works without submitting`)
    await op.goto(`${frontend}/menu`)
    await op.getByRole('button', { name: 'Định lượng', exact: true }).first().click()
    dialog = op.getByRole('dialog')
    // Use a new draft line even if the menu currently has no recipe.
    await dialog.getByRole('button', { name: 'Thêm nguyên vật liệu', exact: true }).click()
    const ingredient = dialog.getByRole('combobox').last()
    const ingredients = await openSelect(op, ingredient)
    await ingredients.locator('.ant-select-item-option').first().click()
    await dialog.locator('button.ant-drawer-close').click()
    pass(`${reducedMotion}: real ingredient options in recipe Drawer work without saving`)
    await owner.context.close()

    const waiter = await fixture('WAITER', reducedMotion), wp = waiter.page
    await wp.goto(`${frontend}/sessions/${session.sessionId}`)
    await wp.getByRole('button', { name: /^(Gọi món|Gọi thêm)$/ }).click()
    dialog = wp.getByRole('dialog')
    const order = dialog.getByRole('combobox')
    const options = await openSelect(wp, order)
    await wp.screenshot({ path: `.cache/popup-qa/live-order-${reducedMotion}.png` })
    await options.locator('.ant-select-item-option').first().click()
    assert.equal(await order.getAttribute('aria-expanded'), 'false')
    await dialog.locator('button.ant-modal-close').click()
    await dialog.waitFor({ state: 'hidden' })
    pass(`${reducedMotion}: real menu options open on click and select without sending an order`)
    await waiter.context.close()
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(blockedWrites, [])
  pass('Real app/API/Neon reads: no browser JavaScript error or attempted business mutation')
  await writeFile('.cache/popup-qa/live-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, results, errors, blockedWrites, sessionId: session.sessionId, apiMode: 'real-read-only' }, null, 2))
  console.log(`PASS ${results.length} popup checks on real app/API (read only)`)
} finally { await browser.close() }
