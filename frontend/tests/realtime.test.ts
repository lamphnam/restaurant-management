import { expect, test } from 'bun:test'
import { createQueryClient } from '../src/api/queryClient'
import { eventKeys, liveQueryOptions, refreshLiveQueries } from '../src/realtime/invalidation'

test('event keys normalize session ids and retain payment compatibility', () => {
  expect(eventKeys({ type: 'ORDER', sessionId: Number('7') })).toEqual([['kitchen'], ['session', 7], ['awaiting-service'], ['payment']])
  expect(eventKeys({ type: 'FLOOR_PLAN', sessionId: 7 })).toEqual([['floor-plan'], ['payment'], ['session', 7]])
  expect(eventKeys({ type: 'RESERVATION' })).toEqual([['reservations'], ['floor-plan']])
})

test('reservation events invalidate filtered lists and table pickers by prefix', async () => {
  const cache = createQueryClient()
  try {
    const picker = ['reservations', { tableId: 5, unexpired: true }]
    const list = ['reservations', { page: 0 }]
    cache.setQueryData(picker, [])
    cache.setQueryData(list, [])
    cache.setQueryData(['session', 7], {})
    await refreshLiveQueries(cache, { type: 'RESERVATION' })
    expect(cache.getQueryState(picker)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(list)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(['session', 7])?.isInvalidated).toBe(false)
  } finally { cache.clear() }
})

test('reconnect invalidates every live prefix including inactive session detail', async () => {
  const cache = createQueryClient()
  try {
    const keys = [['floor-plan'], ['reservations', { tableId: 1 }], ['kitchen'], ['session', 7], ['awaiting-service'], ['payment']]
    keys.forEach((key) => cache.setQueryData(key, []))
    await refreshLiveQueries(cache)
    keys.forEach((key) => expect(cache.getQueryState(key)?.isInvalidated).toBe(true))
    expect(liveQueryOptions.refetchInterval).toBe(30_000)
    expect(liveQueryOptions.refetchOnWindowFocus).toBe(true)
  } finally { cache.clear() }
})
