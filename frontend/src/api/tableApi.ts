import { api } from './client'
import type { FloorArea, OpenSession } from '../types/tables'
export const tableApi = {
  floorPlan: async (signal?: AbortSignal) => (await api.get<FloorArea[]>('/tables/floor-plan', { signal })).data,
  open: async (tableId: number, reservationId?: number) => (await api.post<OpenSession>('/sessions', { tableId, reservationId })).data,
}
