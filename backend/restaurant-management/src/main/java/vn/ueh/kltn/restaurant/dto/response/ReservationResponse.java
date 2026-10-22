package vn.ueh.kltn.restaurant.dto.response;

public record ReservationResponse(Long id, Long tableId, String tableName, String customerName, String customerPhone, int guestCount, java.time.Instant startTime, java.time.Instant endTime, String note, vn.ueh.kltn.restaurant.enums.ReservationStatus status, java.time.Instant createdAt, Long createdById, boolean overdue) { }
