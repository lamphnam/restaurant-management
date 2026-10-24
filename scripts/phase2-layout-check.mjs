import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll, selectQaSession } from './phase2-qa-support.mjs'

// Focused real-data viewport check with populated PENDING/COOKING and READY/UNAVAILABLE columns.
requireWriteApproval('phase2-layout-check')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright')
const auth = await loginAll()
const frontend = process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173'
async function call(role, method, path, body) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${auth[role].accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) })
  assert.equal(response.status, 200, `${method} ${path}`)
  return response.json()
}
const fixture = JSON.parse(await readFile('.cache/phase2/browser-results.json', 'utf8'))
const menu = (await call('OWNER', 'GET', '/menu-items')).find((item) => item.id === fixture.menuId && item.name.startsWith('[QA] Phase2 UI'))
assert(menu, 'Verify existing QA dish through API')
const session = await selectQaSession(call), before = databaseSnapshot()
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true })
const errors = [], results = []
let pending, cooking
async function pageFor(role) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'vi-VN' })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  const account = auth[role]
  await page.goto(`${frontend}/login`)
  await page.evaluate((session) => localStorage.setItem('restaurant.session', JSON.stringify(session)), { accessToken: account.accessToken, expiresAt: account.expiresAt })
  return page
}
async function layouts(page, name) {
  for (const [width, height] of [[1024, 768], [768, 1024], [375, 812]]) {
    await page.setViewportSize({ width, height })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${width}px overflow`)
    results.push(`${name}: populated columns at ${width}×${height}`)
    if (width === 1024) await page.screenshot({ path: `.cache/phase2/screenshots/${name}-populated-tablet.png`, fullPage: true })
  }
}
try {
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/reactivate`)
  const order = await call('WAITER', 'POST', `/sessions/${session.sessionId}/orders`, { items: [
    { menuItemId: menu.id, quantity: 1, note: '[QA] Phase2 tablet: ghi chú dài cho món chờ chế biến, không tràn ngang.' },
    { menuItemId: menu.id, quantity: 2, note: '[QA] Phase2 tablet: món đang chế biến và hoàn thành.' },
  ] })
  ;[pending, cooking] = order.items
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${cooking.id}/start`)
  const kitchen = await pageFor('KITCHEN_STAFF')
  await kitchen.goto(`${frontend}/kitchen`)
  await kitchen.locator(`[data-item-id="${pending.id}"]`).waitFor()
  await kitchen.locator(`[data-item-id="${cooking.id}"]`).waitFor()
  await layouts(kitchen, 'kitchen')
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${cooking.id}/complete`)
  await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${pending.id}/unavailable`, { reason: '[QA] Phase2 tablet: kiểm tra lý do nhiều dòng cho phục vụ.' })
  const waiter = await pageFor('WAITER')
  await waiter.goto(`${frontend}/awaiting-service`)
  await waiter.locator(`[data-item-id="${pending.id}"]`).waitFor()
  await waiter.locator(`[data-item-id="${cooking.id}"]`).getByRole('button', { name: 'Đã phục vụ', exact: true }).waitFor()
  await layouts(waiter, 'awaiting')
  await call('WAITER', 'PATCH', `/sessions/items/${cooking.id}/serve`)
  assert.equal(errors.length, 0)
  await mkdir('.cache/phase2', { recursive: true })
  await writeFile('.cache/phase2/layout-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, results, errors, before, after: databaseSnapshot() }, null, 2))
  console.log(`PASS ${results.length} populated-column viewport checks on real app/API/Neon.`)
} finally {
  await call('OWNER', 'PATCH', `/menu-items/${menu.id}/discontinue`)
  await browser.close()
}
