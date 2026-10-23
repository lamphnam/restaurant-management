import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { databaseSnapshot, loginAll } from './phase3-qa-support.mjs'

// Read-only browser probe. Root task restarts its own backend after ready.json is written.
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE ?? '.cache/phase0/browser/node_modules/playwright/index.mjs')).href)
const output = '.cache/phase4-reconnect'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const auth = await loginAll()
const evidence = { checkedAt: new Date().toISOString(), before: databaseSnapshot(), streamResponses: 0, floorResponses: 0, errors: [] }
evidence.requests = []
try {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } })
  await context.addInitScript((session) => localStorage.setItem('restaurant.session', JSON.stringify(session)), { accessToken: auth.WAITER.accessToken, expiresAt: auth.WAITER.expiresAt })
  const page = await context.newPage()
  page.on('pageerror', (error) => evidence.errors.push(error.message))
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/events') evidence.requests.push({ at: new Date().toISOString(), event: 'request' }) })
  page.on('requestfailed', (request) => { if (new URL(request.url()).pathname === '/api/events') evidence.requests.push({ at: new Date().toISOString(), event: 'failed', error: request.failure()?.errorText }) })
  page.on('response', (response) => {
    if (response.status() === 200 && new URL(response.url()).pathname === '/api/events') evidence.streamResponses++
    if (response.status() === 200 && new URL(response.url()).pathname === '/api/tables/floor-plan') evidence.floorResponses++
  })
  const first = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/events' && r.status() === 200)
  await page.goto(process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173/floor-plan')
  await first
  await page.locator('.table-card').first().waitFor()
  evidence.floorBeforeRestart = evidence.floorResponses
  await writeFile(`${output}/ready.json`, JSON.stringify({ ready: true, checkedAt: new Date().toISOString() }))
  console.log('READY: restart the backend owned by the current task; browser will remain open')
  const deadline = Date.now() + 120000
  while (evidence.streamResponses < 2 && Date.now() < deadline) await page.waitForTimeout(250)
  assert(evidence.streamResponses >= 2, 'SSE did not reconnect after backend restart')
  await page.waitForResponse((r) => new URL(r.url()).pathname === '/api/tables/floor-plan' && r.status() === 200, { timeout: 5000 }).catch(() => {})
  assert(evidence.floorResponses > evidence.floorBeforeRestart, 'Reconnect should invalidate live REST query')
  evidence.after = databaseSnapshot()
  assert.deepEqual(evidence.after, evidence.before, 'Restart and seed gates preserve business row counts and ledger')
  assert.deepEqual(evidence.errors, [])
  evidence.completed = true
  console.log(`PASS real SSE reconnect (${evidence.streamResponses} streams), REST invalidation and restart persistence with no browser reload`)
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(evidence, null, 2))
  await browser.close()
}
