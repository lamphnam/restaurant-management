package vn.ueh.kltn.restaurant.dto.response;

public record UpcomingReservationResponse(Long id, String customerName, int guestCount, java.time.Instant startTime, java.time.Instant endTime) { }
