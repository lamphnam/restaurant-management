import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { requireWriteApproval } from '../qa-write-guard.mjs'

test('write approval must name main explicitly', () => {
  for (const value of [undefined, '', 'true', 'qa']) {
    assert.throws(() => requireWriteApproval('test', { PHASE1_QA_ALLOW_WRITES: value }), /Set PHASE1_QA_ALLOW_WRITES=main/)
  }
  assert.doesNotThrow(() => requireWriteApproval('test', { PHASE1_QA_ALLOW_WRITES: 'main' }))
})

for (const script of ['phase1-api-check', 'phase1-browser-check', 'phase1-review-api-check', 'phase2-api-check', 'phase2-browser-check', 'phase2-layout-check', 'phase2-review-api-check', 'phase2-review-browser-check']) {
  test(`${script} refuses before HTTP requests or browser setup`, () => {
    const environment = { ...process.env, API_URL: 'http://127.0.0.1:1', FRONTEND_URL: 'http://127.0.0.1:1', PLAYWRIGHT_MODULE: 'missing-module' }
    delete environment.PHASE1_QA_ALLOW_WRITES
    const result = spawnSync(process.execPath, [`scripts/${script}.mjs`], { env: environment, encoding: 'utf8', timeout: 10_000 })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Set PHASE1_QA_ALLOW_WRITES=main/)
    assert.doesNotMatch(result.stderr, /fetch failed|ERR_MODULE_NOT_FOUND/)
  })
}
