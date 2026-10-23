import { expect, test } from 'bun:test'
import { statusColors, statusLabel } from '../src/utils/labels'

test('PaymentMethod labels and colors match design system', () => {
  expect(statusLabel('PaymentMethod', 'CASH')).toBe('Tiền mặt')
  expect(statusLabel('PaymentMethod', 'BANK_TRANSFER')).toBe('Chuyển khoản')

  expect(statusColors['CASH']).toBe('green')
  expect(statusColors['BANK_TRANSFER']).toBe('blue')
})

test('Payment blocking items logic correctly identifies blocking states', () => {
  const items = [
    { id: 1, name: 'Phở bò', status: 'READY' },
    { id: 2, name: 'Cơm tấm', status: 'SERVED' },
    { id: 3, name: 'Trà đá', status: 'CANCELLED' },
  ]
  const hasBlocking = items.some((i) => i.status === 'PENDING' || i.status === 'COOKING')
  expect(hasBlocking).toBe(false)

  const itemsWithPending = [...items, { id: 4, name: 'Bún chả', status: 'PENDING' }]
  expect(itemsWithPending.some((i) => i.status === 'PENDING' || i.status === 'COOKING')).toBe(true)

  const itemsWithCooking = [...items, { id: 5, name: 'Gỏi cuốn', status: 'COOKING' }]
  expect(itemsWithCooking.some((i) => i.status === 'PENDING' || i.status === 'COOKING')).toBe(true)
})

test('Billable items calculation excludes cancelled and unavailable', () => {
  const items = [
    { unitPrice: 50000, quantity: 2, status: 'READY' },
    { unitPrice: 40000, quantity: 1, status: 'SERVED' },
    { unitPrice: 60000, quantity: 3, status: 'CANCELLED' },
    { unitPrice: 45000, quantity: 2, status: 'UNAVAILABLE' },
  ]

  const total = items.reduce((sum, item) => {
    if (item.status === 'CANCELLED' || item.status === 'UNAVAILABLE') return sum
    return sum + item.unitPrice * item.quantity
  }, 0)

  expect(total).toBe(140000)
})
