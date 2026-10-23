import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { requireWriteApproval } from './qa-write-guard.mjs'
import { base, databaseSnapshot, loginAll, roles } from './phase3-qa-support.mjs'

requireWriteApproval('phase3-api-check')
const auth = await loginAll()
const results = []
const check = (condition, label) => {
  assert(condition, label)
  results.push(label)
}

async function call(role, method, path, body, expected = 200) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth[role].accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  const value = await response.json()
  assert.equal(
    response.status,
    expected,
    `${role} ${method} ${path}: got ${response.status} (code: ${value.code ?? 'none'}), expected ${expected}`
  )
  results.push(`${role} ${method} ${path} → ${expected}`)
  return value
}

console.log('--- 1. Testing Role Matrix & Endpoint Security ---')
// Payments: CASHIER only per §13.9; WAITER, MANAGER, OWNER, KITCHEN_STAFF 403
await call('CASHIER', 'GET', '/payments/open-sessions', undefined, 200)
await call('MANAGER', 'GET', '/payments/open-sessions', undefined, 403)
await call('OWNER', 'GET', '/payments/open-sessions', undefined, 403)
await call('WAITER', 'GET', '/payments/open-sessions', undefined, 403)
await call('KITCHEN_STAFF', 'GET', '/payments/open-sessions', undefined, 403)

// Invoices: CASHIER, MANAGER, OWNER can access per §13.9; WAITER 403
await call('CASHIER', 'GET', '/invoices', undefined, 200)
await call('MANAGER', 'GET', '/invoices', undefined, 200)
await call('OWNER', 'GET', '/invoices', undefined, 200)
await call('WAITER', 'GET', '/invoices', undefined, 403)

// Inventory:
// GET ingredients: OWNER, HEAD_CHEF per §13.8; others 403
await call('OWNER', 'GET', '/inventory/ingredients', undefined, 200)
await call('HEAD_CHEF', 'GET', '/inventory/ingredients', undefined, 200)
await call('MANAGER', 'GET', '/inventory/ingredients', undefined, 403)
await call('CASHIER', 'GET', '/inventory/ingredients', undefined, 403)
await call('WAITER', 'GET', '/inventory/ingredients', undefined, 403)
// POST ingredients: OWNER only
await call('WAITER', 'POST', '/inventory/ingredients', { name: 'Hack', unit: 'kg', minStock: 1 }, 403)
await call('HEAD_CHEF', 'POST', '/inventory/ingredients', { name: 'Hack', unit: 'kg', minStock: 1 }, 403)
await call('CASHIER', 'POST', '/inventory/ingredients', { name: 'Hack', unit: 'kg', minStock: 1 }, 403)

// Lots attention: OWNER, HEAD_CHEF per §13.8; CASHIER, WAITER 403
await call('HEAD_CHEF', 'GET', '/inventory/lots/attention', undefined, 200)
await call('OWNER', 'GET', '/inventory/lots/attention', undefined, 200)
await call('CASHIER', 'GET', '/inventory/lots/attention', undefined, 403)
await call('WAITER', 'GET', '/inventory/lots/attention', undefined, 403)

// Receipts: HEAD_CHEF per §13.8; CASHIER, WAITER 403
await call('HEAD_CHEF', 'GET', '/inventory/receipts', undefined, 200)
await call('CASHIER', 'GET', '/inventory/receipts', undefined, 403)

// Stocktakes template & list: HEAD_CHEF per §13.8; CASHIER, WAITER 403
await call('HEAD_CHEF', 'GET', '/inventory/stocktakes/template', undefined, 200)
await call('HEAD_CHEF', 'GET', '/inventory/stocktakes', undefined, 200)
await call('CASHIER', 'GET', '/inventory/stocktakes', undefined, 403)

// Disposals: HEAD_CHEF per §13.8; WAITER 403, CASHIER 403
await call('WAITER', 'POST', '/inventory/disposals', { ingredientId: 1, quantity: 1, reason: 'x' }, 403)
await call('CASHIER', 'POST', '/inventory/disposals', { ingredientId: 1, quantity: 1, reason: 'x' }, 403)

// Movements: OWNER, HEAD_CHEF per §13.8; CASHIER, WAITER 403
await call('HEAD_CHEF', 'GET', '/inventory/movements', undefined, 200)
await call('OWNER', 'GET', '/inventory/movements', undefined, 200)
await call('CASHIER', 'GET', '/inventory/movements', undefined, 403)
console.log('PASS: Security matrix verified across all 6 roles')

console.log('--- 2. Testing Inventory Management Workflows ---')
// List ingredients & verify Phase 3 seeder
const ingredients = await call('HEAD_CHEF', 'GET', '/inventory/ingredients')
check(ingredients.length >= 10, 'At least 10 initial ingredients present')
const lowStock = ingredients.filter((ing) => ing.belowMinStock)
check(lowStock.length >= 2, `Seeded at least 2 ingredients below min stock (got ${lowStock.length})`)

// Attention lots check
const attentionLots = await call('HEAD_CHEF', 'GET', '/inventory/lots/attention')
check(attentionLots.some((lot) => lot.lotNumber === 'LOT-TB-001' && lot.status === 'EXPIRED'), 'Seeded expired lot LOT-TB-001 found')
check(attentionLots.some((lot) => lot.lotNumber === 'LOT-TB-002' && lot.status === 'EXPIRING_SOON'), 'Seeded expiring-soon lot LOT-TB-002 found')

// OWNER creates test ingredient
const prefix = `[QA] NL-${Date.now()}`
const newIng = await call('OWNER', 'POST', '/inventory/ingredients', {
  name: `${prefix} Nước sốt tiêu đen`,
  unit: 'hũ',
  minStock: 5,
})
check(newIng.id > 0, 'Ingredient created by OWNER')
check(Number(newIng.currentStock) === 0, 'Initial stock is 0')

// OWNER updates ingredient name and minStock
const updatedIng = await call('OWNER', 'PUT', `/inventory/ingredients/${newIng.id}`, {
  name: `${prefix} Nước sốt tiêu đen đặc biệt`,
  unit: 'hũ',
  minStock: 8,
})
check(updatedIng.name.includes('đặc biệt'), 'Ingredient name updated')
check(Number(updatedIng.minStock) === 8, 'Ingredient minStock updated')

// HEAD_CHEF creates Stock Receipt (with lot)
const receipt = await call('HEAD_CHEF', 'POST', '/inventory/receipts', {
  items: [
    {
      ingredientId: newIng.id,
      quantity: 20,
      lotNumber: `LOT-${Date.now()}`,
      expiryDate: '2026-11-23',
    },
  ],
})
check(receipt.id > 0, 'Receipt created')
check(receipt.items.length === 1, 'Receipt item recorded')

// Verify stock increased to 20
const ingAfterReceipt = await call('HEAD_CHEF', 'GET', `/inventory/ingredients`)
const foundIng = ingAfterReceipt.find((i) => i.id === newIng.id)
check(Number(foundIng.currentStock) === 20, `Stock increased to 20 (got ${foundIng.currentStock})`)

// Verify D12 rule: Cannot change unit once movements exist
await call('OWNER', 'PUT', `/inventory/ingredients/${newIng.id}`, {
  name: `${prefix} Nước sốt tiêu đen đặc biệt`,
  unit: 'kg', // changed from 'hũ'
  minStock: 8,
}, 409)
check(true, 'D12 verified: Changing unit on ingredient with movements correctly rejected with 409')

// Verify Stocktake Template
const template = await call('HEAD_CHEF', 'GET', '/inventory/stocktakes/template')
const itemInTemplate = template.find((t) => t.ingredientId === newIng.id)
check(itemInTemplate && Number(itemInTemplate.currentStock) === 20, 'Template lists ingredient with current stock 20')

// Perform Stocktake: actualQuantity = 18 (difference = -2)
const stocktake = await call('HEAD_CHEF', 'POST', '/inventory/stocktakes', {
  items: [
    {
      ingredientId: newIng.id,
      actualQuantity: 18,
      note: '[QA] Kiểm kê định kỳ',
    },
  ],
})
check(stocktake.id > 0, 'Stocktake created')
check(Number(stocktake.items[0].difference) === -2, 'Stocktake recorded difference of -2')

// Verify stock updated to 18
const ingAfterStocktake = await call('HEAD_CHEF', 'GET', `/inventory/ingredients`)
const foundAfterStocktake = ingAfterStocktake.find((i) => i.id === newIng.id)
check(Number(foundAfterStocktake.currentStock) === 18, 'Stock adjusted to 18 after stocktake')

// Perform Disposal: test over-disposal rejection
await call('HEAD_CHEF', 'POST', '/inventory/disposals', {
  ingredientId: newIng.id,
  quantity: 999,
  reason: 'Hỏng hóc',
}, 400)
check(true, 'Over-disposal (> current stock) rejected with 400 INSUFFICIENT_STOCK')

// Perform valid Disposal: 3 units
const disposal = await call('HEAD_CHEF', 'POST', '/inventory/disposals', {
  ingredientId: newIng.id,
  quantity: 3,
  reason: '[QA] Vỡ bao bì',
})
check(disposal.movementType === 'DISPOSAL', 'Disposal movement created')
check(Number(disposal.quantityChange) === -3, 'Disposal quantity change is -3')

// Verify stock is now 15
const ingAfterDisposal = await call('HEAD_CHEF', 'GET', `/inventory/ingredients`)
const foundAfterDisposal = ingAfterDisposal.find((i) => i.id === newIng.id)
check(Number(foundAfterDisposal.currentStock) === 15, 'Stock is 15 after disposing 3 units')

// Verify movements history for this ingredient
const movements = await call('HEAD_CHEF', 'GET', `/inventory/movements?ingredientId=${newIng.id}`)
check(movements.total >= 3, 'Recorded 3 movements for new ingredient')
const types = movements.items.map((m) => m.movementType)
check(types.includes('RECEIPT'), 'RECEIPT movement present')
check(types.includes('STOCKTAKE_ADJUSTMENT'), 'STOCKTAKE_ADJUSTMENT movement present')
check(types.includes('DISPOSAL'), 'DISPOSAL movement present')
console.log('PASS: All Inventory operations & D7/D12 rules verified')

console.log('--- 3. Testing Payment & Billing Workflows ---')
// Check existing invoices
const existingInvoices = await call('CASHIER', 'GET', '/invoices')
check(existingInvoices.items.length >= 2, 'Previous invoices exist in ledger')

// Verify duplicate payment on already paid session returns 409
await call('CASHIER', 'POST', '/payments', {
  sessionId: 2,
  paymentMethod: 'CASH',
}, 409)
check(true, 'Duplicate payment returns 409 SESSION_ALREADY_PAID')

// Now test full live payment workflow on session 11 (Table 2):
const sessionToPay = 11
let preview = await call('CASHIER', 'GET', `/payments/sessions/${sessionToPay}`)
let itemId
if (preview.orders.length === 0) {
  const order = await call('WAITER', 'POST', `/sessions/${sessionToPay}/orders`, {
    items: [{ menuItemId: 1, quantity: 2, note: '[QA] Phase 3 Payment Check' }],
  })
  itemId = order.items[0].id
  preview = await call('CASHIER', 'GET', `/payments/sessions/${sessionToPay}`)
} else {
  itemId = preview.orders[0].items[0].id
}

const expectedTotal = Number(preview.provisionalTotal)
check(expectedTotal > 0, `Provisional total is positive: ${expectedTotal}`)
check(preview.hasPendingOrCookingItems === true, 'Session with pending item is NOT payable')

// Attempting to pay must return 400 PAYMENT_BLOCKED_PENDING_ITEMS
await call('CASHIER', 'POST', '/payments', {
  sessionId: sessionToPay,
  paymentMethod: 'CASH',
}, 400)
check(true, 'Paying session with pending items correctly blocked with 400')

// Kitchen starts cooking
await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${itemId}/start`)

// Kitchen completes cooking (consumes recipe ingredients)
await call('KITCHEN_STAFF', 'PATCH', `/kitchen/items/${itemId}/complete`)

// Waiter serves the item
await call('WAITER', 'PATCH', `/sessions/items/${itemId}/serve`)

// Preview now payable
const previewReady = await call('CASHIER', 'GET', `/payments/sessions/${sessionToPay}`)
check(!previewReady.hasPendingOrCookingItems, 'Session is payable after item served')
check(Number(previewReady.provisionalTotal) === expectedTotal, `Provisional total matches: ${expectedTotal}`)

// Pay with BANK_TRANSFER
const liveInvoice = await call('CASHIER', 'POST', '/payments', {
  sessionId: sessionToPay,
  paymentMethod: 'BANK_TRANSFER',
})
check(liveInvoice.id > 0, 'Live invoice created')
check(Number(liveInvoice.amount) === expectedTotal, `Live invoice amount matches: ${expectedTotal}`)
check(liveInvoice.paymentMethod === 'BANK_TRANSFER', 'Payment method is BANK_TRANSFER')
check(liveInvoice.cashierName.length > 0, 'Cashier name recorded on invoice')

// Duplicate pay on sessionToPay returns 409
await call('CASHIER', 'POST', '/payments', {
  sessionId: sessionToPay,
  paymentMethod: 'CASH',
}, 409)
check(true, 'Duplicate payment on sessionToPay returns 409 SESSION_ALREADY_PAID')

// Verify table 2 is released to AVAILABLE
const floorAfter = await call('WAITER', 'GET', '/tables/floor-plan')
const table2 = floorAfter.flatMap((a) => a.tables).find((t) => t.id === 2)
check(table2.status === 'AVAILABLE', 'Table 2 released to AVAILABLE after payment')
check(table2.activeSessionId === null, 'Table 2 has activeSessionId == null')

// Test D8 Rule: Zero-amount session payment on an available table
const freeTable = floorAfter.flatMap((a) => a.tables).find((t) => t.status === 'AVAILABLE' && !t.activeSessionId)
check(freeTable !== undefined, 'Free table found for zero-amount test')
const sessionZero = await call('WAITER', 'POST', '/sessions', { tableId: freeTable.id })
check(sessionZero.sessionId > 0, `Opened zero-amount session on Table ${freeTable.name}`)

const previewZero = await call('CASHIER', 'GET', `/payments/sessions/${sessionZero.sessionId}`)
check(Number(previewZero.provisionalTotal) === 0, 'Session has 0 total amount')
check(!previewZero.hasPendingOrCookingItems, 'D8 verified: Zero-amount session is payable')

const invoiceZero = await call('CASHIER', 'POST', '/payments', {
  sessionId: sessionZero.sessionId,
  paymentMethod: 'CASH',
})
check(invoiceZero.id > 0, 'Invoice created for 0đ session')
check(Number(invoiceZero.amount) === 0, 'Invoice amount is 0đ')

// Free table released
const freeTableAfter = (await call('WAITER', 'GET', '/tables/floor-plan')).flatMap((a) => a.tables).find((t) => t.id === freeTable.id)
check(freeTableAfter.status === 'AVAILABLE', `Table ${freeTable.name} released after 0đ payment`)

console.log('--- 4. Testing Invoices Queries & Details ---')
const invoices = await call('CASHIER', 'GET', '/invoices')
check(invoices.total >= 4, `Invoices list contains all paid invoices (got ${invoices.total})`)

// Filter by payment method
const bankInvoices = await call('CASHIER', 'GET', '/invoices?paymentMethod=BANK_TRANSFER')
check(bankInvoices.items.every((i) => i.paymentMethod === 'BANK_TRANSFER'), 'Filter by paymentMethod works')

// Verify invoice in list matches
const invoiceDetail = invoices.items.find((i) => i.id === liveInvoice.id)
check(invoiceDetail && invoiceDetail.id === liveInvoice.id, 'Invoice detail matches in list')
check(invoiceDetail && Number(invoiceDetail.amount) === expectedTotal, 'Invoice total matches in list')

console.log('PASS: All Payment & Invoices tests succeeded!')

const after = databaseSnapshot()
console.log('Database state after QA:', JSON.stringify(after.counts))
await mkdir('.cache/phase3', { recursive: true })
await writeFile('.cache/phase3/api-check-results.json', JSON.stringify({ results, database: after }, null, 2))
console.log(`\n=== ALL ${results.length} CHECKS PASSED SUCCESSFULLY ===`)
