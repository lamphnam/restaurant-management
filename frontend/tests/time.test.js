import { expect, test } from 'bun:test'
import dayjs from 'dayjs'
import { formatTime, toInstant } from '../src/utils/time'

test('UTC instants display in Vietnam regardless of browser timezone', () => {
  expect(formatTime('2026-10-23T11:00:00Z')).toBe('23/10/2026 18:00')
})

test('picker wall-clock time is sent as the corresponding UTC instant', () => {
  expect(toInstant(dayjs('2026-10-23T18:00:00'))).toBe('2026-10-23T11:00:00.000Z')
})

test('Vietnam day boundary displays the next local date', () => {
  expect(formatTime('2026-10-22T18:30:00Z')).toBe('23/10/2026 01:30')
})
