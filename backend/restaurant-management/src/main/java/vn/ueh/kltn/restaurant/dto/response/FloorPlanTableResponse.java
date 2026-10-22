package vn.ueh.kltn.restaurant.dto.response;

public record FloorPlanTableResponse(Long id, String name, int capacity, vn.ueh.kltn.restaurant.enums.TableStatus status, Long activeSessionId, UpcomingReservationResponse upcomingReservation) { }
