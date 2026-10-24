import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll } from './phase3-qa-support.mjs'

requireWriteApproval('phase4-stocktake-ui-check')
const auth = await loginAll(), fixture = JSON.parse(await readFile('.cache/phase4-api/results.json', 'utf8'))
const id = fixture.created.find((entry) => entry.path === '/inventory/ingredients').id
const output = '.cache/phase4-stocktake-ui'
await mkdir(output, { recursive: true })
async function call(method, endpoint) {
  const response = await fetch(`${base}/api${endpoint}`, { method, headers: { Authorization: `Bearer ${auth.OWNER.accessToken}` } })
  assert.equal(response.status, 200, endpoint)
  return response.json()
}
const ingredient = (await call('GET', '/inventory/ingredients')).find((item) => item.id === id)
assert(ingredient?.name.startsWith('[QA] Phase4 ') && ingredient.currentStock === 0)
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const evidence = { before: databaseSnapshot(), results: [], errors: [] }
try {
  await call('PATCH', `/inventory/ingredients/${id}/activate`)
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' })
  await context.addInitScript((session) => localStorage.setItem('restaurant.session', JSON.stringify(session)), { accessToken: auth.HEAD_CHEF.accessToken, expiresAt: auth.HEAD_CHEF.expiresAt })
  const page = await context.newPage()
  page.on('pageerror', (error) => evidence.errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/inventory/stocktake')
  const actual = page.getByRole('spinbutton', { name: `Số lượng thực tế ${ingredient.name}`, exact: true })
  await actual.waitFor()
  assert.equal(await actual.inputValue(), '')
  const submit = page.getByRole('button', { name: /Xác nhận & Lưu phiếu kiểm kê/ })
  assert(await submit.isDisabled())
  await actual.fill('1')
  await actual.fill('')
  await actual.press('Tab')
  assert(await submit.isDisabled())
  evidence.results.push('Real UI starts blank and clearing the only actual leaves no counted line')
  await actual.fill('0')
  await submit.click()
  const request = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/inventory/stocktakes'))
  await page.locator('.ant-popconfirm').getByRole('button', { name: 'Xác nhận kiểm kê', exact: true }).click()
  const response = await request
  assert.equal(response.status(), 200)
  const payload = response.request().postDataJSON(), saved = await response.json()
  evidence.payload = payload
  evidence.stocktakeId = saved.id
  assert.deepEqual(payload.items.map(({ ingredientId, actualQuantity }) => ({ ingredientId, actualQuantity })), [{ ingredientId: id, actualQuantity: 0 }])
  assert(!payload.items[0].note, 'No note was entered')
  assert.equal(saved.items[0].difference, 0)
  evidence.results.push('Real POST includes only explicitly counted zero, not untouched active ingredients')
  await page.waitForFunction(() => [...document.querySelectorAll('input[role="spinbutton"]')].every((input) => input.value === ''))
  const after = databaseSnapshot()
  assert.equal(after.counts.stock_movement, evidence.before.counts.stock_movement)
  assert.equal(after.counts.stocktake, evidence.before.counts.stocktake + 1)
  assert.equal(after.counts.stocktake_item, evidence.before.counts.stocktake_item + 1)
  evidence.results.push('Success resets real form; zero difference creates no ledger movement')
  await page.screenshot({ path: `${output}/stocktake.png`, fullPage: true })
  assert.deepEqual(evidence.errors, [])
  evidence.completed = true
} finally {
  await call('PATCH', `/inventory/ingredients/${id}/deactivate`)
  evidence.after = databaseSnapshot()
  await writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
  await browser.close()
  console.log(JSON.stringify({ completed: evidence.completed ?? false, checks: evidence.results.length, stocktakeId: evidence.stocktakeId }))
}
