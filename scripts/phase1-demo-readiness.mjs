import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

// Read-only: login and GET only. Does not refresh seed dates or release occupied tables.
const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000),
  body: JSON.stringify({ phone: '0900000002', password: process.env.DEMO_PASSWORD ?? 'Demo@123' }),
})
assert.equal(login.status, 200, 'Manager login')
const { accessToken } = await login.json()
async function get(path) {
  const response = await fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(20_000) })
  assert.equal(response.status, 200, path)
  return response.json()
}
const floor = await get('/tables/floor-plan')
const tables = floor.flatMap((area) => area.tables)
const reservations = []
for (let page = 0; ; page++) {
  const data = await get(`/reservations?status=CONFIRMED&page=${page}&size=100`)
  reservations.push(...data.items)
  if ((page + 1) * data.size >= data.total) break
}
const now = Date.now()
const demoDate = '2026-10-27'
const dateInVietnam = (instant) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant))
const summary = {
  checkedAt: new Date(now).toISOString(), demoDate,
  availableTables: tables.filter((table) => table.status === 'AVAILABLE' && !table.activeSessionId).length,
  activeSessions: tables.filter((table) => table.activeSessionId).length,
  confirmedReservations: reservations.length,
  expiredConfirmed: reservations.filter((reservation) => Date.parse(reservation.endTime) <= now).length,
  unexpiredConfirmed: reservations.filter((reservation) => Date.parse(reservation.endTime) > now).length,
  confirmedOnDemoDate: reservations.filter((reservation) => dateInVietnam(reservation.startTime) === demoDate).length,
  upcomingTableBadges: tables.filter((table) => table.upcomingReservation).length,
}
await mkdir('.cache/phase1-review', { recursive: true })
await writeFile('.cache/phase1-review/demo-readiness.json', JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
if (summary.availableTables < 5) console.log('Full phase1-api-check needs five free tables; do not rerun it against this state.')
if (!summary.confirmedOnDemoDate) console.log('No confirmed booking for 27/10 yet. Prepare fresh bookings through the app before the demo; no seed dates were changed.')
