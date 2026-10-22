export type ReservationStatus = 'CONFIRMED' | 'SEATED' | 'CANCELLED'
export interface Reservation {
  id: number; tableId: number; tableName: string; customerName: string; customerPhone: string; guestCount: number
  startTime: string; endTime: string; note: string | null; status: ReservationStatus; createdAt: string; createdById: number; overdue: boolean
}
export interface UpcomingReservation { id: number; customerName: string; guestCount: number; startTime: string; endTime: string }
export interface FloorTable { id: number; name: string; capacity: number; status: 'AVAILABLE' | 'OCCUPIED' | 'INACTIVE'; activeSessionId: number | null; upcomingReservation: UpcomingReservation | null }
export interface FloorArea { id: number; name: string; tables: FloorTable[] }
export interface AvailableTable { id: number; name: string; capacity: number; areaName: string }
export interface PageResponse<T> { items: T[]; page: number; size: number; total: number }
export interface ReservationFilters { date?: string; status?: ReservationStatus; q?: string; page: number; size: number }
export interface CreateReservation { tableId: number; customerName: string; customerPhone: string; guestCount: number; startTime: string; endTime: string; note?: string }
export interface OpenSession { sessionId: number; tableId: number; reservationId: number | null; openedAt: string; status: 'ACTIVE' }
