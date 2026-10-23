import { api } from './client'
import type { OrderItem, OrderQueueItem } from '../types/sessions'

export const kitchenApi = {
  queue: async (signal?: AbortSignal) => (await api.get<OrderQueueItem[]>('/kitchen/queue', { signal })).data,
  start: async (id: number) => (await api.patch<OrderItem>(`/kitchen/items/${id}/start`)).data,
  complete: async (id: number) => (await api.patch<OrderItem>(`/kitchen/items/${id}/complete`)).data,
  unavailable: async (id: number, reason: string) => (await api.patch<OrderItem>(`/kitchen/items/${id}/unavailable`, { reason })).data,
}
