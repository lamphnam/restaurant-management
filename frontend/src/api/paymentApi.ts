import { api } from './client'
import type {
  Invoice,
  InvoiceFilter,
  OpenSessionPayment,
  PaymentPreview,
  PaySessionPayload,
} from '../types/payment'

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export const paymentApi = {
  listOpenSessions: async (signal?: AbortSignal) =>
    (await api.get<OpenSessionPayment[]>('/payments/open-sessions', { signal })).data,

  getPreview: async (sessionId: number, signal?: AbortSignal) =>
    (await api.get<PaymentPreview>(`/payments/sessions/${sessionId}`, { signal })).data,

  pay: async (payload: PaySessionPayload) =>
    (await api.post<Invoice>('/payments', payload)).data,

  listInvoices: async (filter?: InvoiceFilter, signal?: AbortSignal) =>
    (
      await api.get<PageResponse<Invoice>>('/invoices', {
        params: filter,
        signal,
      })
    ).data,
}
