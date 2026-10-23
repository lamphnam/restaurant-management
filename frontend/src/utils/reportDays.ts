import dayjs from 'dayjs'
import { APP_TIMEZONE } from './time'
import type { DailyRevenue } from '../types/reconciliation'

// Render only one calendar page; long date ranges do not allocate a row for every day.
export function dailyRevenuePage(daily: DailyRevenue[], firstDate: string, calendarDays: number, page: number, pageSize: number): DailyRevenue[] {
  const byDate = new Map(daily.map((day) => [day.date, day]))
  const start = (page - 1) * pageSize
  const length = Math.max(0, Math.min(pageSize, calendarDays - start))
  return Array.from({ length }, (_, index) => {
    const date = dayjs.tz(firstDate, APP_TIMEZONE).add(start + index, 'day').format('YYYY-MM-DD')
    return byDate.get(date) ?? { date, invoiceCount: 0, revenue: 0, cashRevenue: 0, bankTransferRevenue: 0 }
  })
}
