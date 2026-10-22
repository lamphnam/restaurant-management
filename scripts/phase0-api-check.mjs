import assert from 'node:assert/strict'

// Read-only against the shared DB: login and HTTP validation only.
const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
let checks = 0
async function check(path, options, expectedStatus, expectedCode) {
  const response = await fetch(`${base}${path}`, options)
  assert.equal(response.status, expectedStatus, `${options?.method ?? 'GET'} ${path}`)
  const body = await response.json()
  if (expectedCode) assert.equal(body.code, expectedCode)
  checks++
  return { response, body }
}
const postJson = (body, headers = {}) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
const roles = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF', 'HEAD_CHEF']
const tokens = []
for (const [index, role] of roles.entries()) {
  const { body } = await check('/api/auth/login', postJson({ phone: `090000000${index + 1}`, password: process.env.DEMO_PASSWORD ?? 'Demo@123' }), 200)
  assert.equal(body.account.role, role)
  tokens.push(body.accessToken)
  const me = await check('/api/auth/me', { headers: { Authorization: `Bearer ${body.accessToken}` } }, 200)
  assert.equal(me.body.role, role)
}
const headers = { Authorization: `Bearer ${tokens[0]}` }
const wrong = await check('/api/auth/login', postJson({ phone: '0900000001', password: 'Wrong@123' }), 401, 'INVALID_CREDENTIALS')
const unknown = await check('/api/auth/login', postJson({ phone: '0900000099', password: 'Wrong@123' }), 401, 'INVALID_CREDENTIALS')
assert.equal(wrong.body.message, unknown.body.message)
await check('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hello' }, 415, 'UNSUPPORTED_MEDIA_TYPE')
const method = await check('/api/auth/login', { headers }, 405, 'METHOD_NOT_ALLOWED')
assert(method.response.headers.get('Allow')?.includes('POST'))
await check('/api/auth/me', { method: 'POST', headers }, 405, 'METHOD_NOT_ALLOWED')
await check('/api/auth/me', { headers: { ...headers, Accept: 'text/plain' } }, 406, 'NOT_ACCEPTABLE')
const blank = await check('/api/auth/login', postJson({ phone: '', password: '' }), 400, 'INVALID_INPUT')
assert.equal(blank.body.fieldErrors.phone, 'Vui lòng nhập số điện thoại')
await check('/api/auth/me', {}, 401, 'UNAUTHORIZED')
await check('/api/auth/me', { headers: { Authorization: 'Bearer invalid.jwt.token' } }, 401, 'UNAUTHORIZED')
// Phase 0 reserves this namespace; replace the probe after AccountController exists.
await check('/api/accounts', { headers: { Authorization: `Bearer ${tokens[3]}` } }, 403, 'FORBIDDEN')
console.log(`PASS ${checks} live API checks; no DB fixtures changed.`)
