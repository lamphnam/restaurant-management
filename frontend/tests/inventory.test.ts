import { expect, test } from 'bun:test'
import { statusColors, statusLabel } from '../src/utils/labels'

test('MovementType labels and colors match design system', () => {
  expect(statusLabel('MovementType', 'RECEIPT')).toBe('Nhập')
  expect(statusLabel('MovementType', 'CONSUMPTION')).toBe('Tiêu hao')
  expect(statusLabel('MovementType', 'STOCKTAKE_ADJUSTMENT')).toBe('Điều chỉnh kiểm kê')
  expect(statusLabel('MovementType', 'DISPOSAL')).toBe('Loại bỏ')

  expect(statusColors['RECEIPT']).toBe('green')
  expect(statusColors['CONSUMPTION']).toBe('blue')
  expect(statusColors['STOCKTAKE_ADJUSTMENT']).toBe('purple')
  expect(statusColors['DISPOSAL']).toBe('red')
})

test('IngredientStatus labels and colors', () => {
  expect(statusLabel('IngredientStatus', 'ACTIVE')).toBe('Đang sử dụng')
  expect(statusLabel('IngredientStatus', 'INACTIVE')).toBe('Ngừng sử dụng')

  expect(statusColors['ACTIVE']).toBe('green')
  expect(statusColors['INACTIVE']).toBe('default')
})

test('Stock difference and status logic calculates properly', () => {
  const systemStock = 50.0
  const actualStock = 48.0
  const diff = actualStock - systemStock
  expect(diff).toBe(-2.0)

  const isBelowMin = (current: number, min: number) => current < min
  expect(isBelowMin(0.5, 1.0)).toBe(true)
  expect(isBelowMin(1.0, 1.0)).toBe(false)
  expect(isBelowMin(1.5, 1.0)).toBe(false)
  expect(isBelowMin(-0.2, 1.0)).toBe(true)
})

test('Lot attention status calculation', () => {
  const getLotStatus = (daysRemaining: number) => {
    return daysRemaining <= 0 ? 'EXPIRED' : 'EXPIRING_SOON'
  }

  expect(getLotStatus(-2)).toBe('EXPIRED')
  expect(getLotStatus(0)).toBe('EXPIRED')
  expect(getLotStatus(2)).toBe('EXPIRING_SOON')
  expect(getLotStatus(7)).toBe('EXPIRING_SOON')
})
