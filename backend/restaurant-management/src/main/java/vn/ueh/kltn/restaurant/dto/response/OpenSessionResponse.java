package vn.ueh.kltn.restaurant.dto.response;

public record OpenSessionResponse(Long sessionId, Long tableId, Long reservationId, java.time.Instant openedAt, vn.ueh.kltn.restaurant.enums.SessionStatus status) { }
