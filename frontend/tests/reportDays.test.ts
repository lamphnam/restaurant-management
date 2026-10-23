import { expect, test } from 'bun:test'
import { dailyRevenuePage } from '../src/utils/reportDays'

test('daily report fills missing dates with zero without losing invoice counts or method amounts', () => {
  const day = { date: '2026-10-02', invoiceCount: 3, revenue: 123000, cashRevenue: 100000, bankTransferRevenue: 23000 }
  const rows = dailyRevenuePage([day], '2026-10-01', 31, 1, 10)
  expect(rows).toHaveLength(10)
  expect(rows[0]).toEqual({ date: '2026-10-01', invoiceCount: 0, revenue: 0, cashRevenue: 0, bankTransferRevenue: 0 })
  expect(rows[1]).toEqual(day)
})

test('daily report pagination reaches month end, leap day and the next year', () => {
  expect(dailyRevenuePage([], '2026-10-01', 31, 4, 10).map((day) => day.date)).toEqual(['2026-10-31'])
  expect(dailyRevenuePage([], '2028-02-01', 29, 3, 10).at(-1)?.date).toBe('2028-02-29')
  expect(dailyRevenuePage([], '2026-12-31', 2, 1, 10).map((day) => day.date)).toEqual(['2026-12-31', '2027-01-01'])
})

test('daily report allocates only the current page for very long periods', () => {
  expect(dailyRevenuePage([], '2000-01-01', 36526, 1, 10)).toHaveLength(10)
  expect(dailyRevenuePage([], '2000-01-01', 36526, 3653, 10)).toHaveLength(6)
})
