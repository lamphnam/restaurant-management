package vn.ueh.kltn.restaurant.mapper;
import java.time.Instant;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.entity.Reservation;
import vn.ueh.kltn.restaurant.enums.ReservationStatus;
public final class ReservationMapper {
    private ReservationMapper() { }
    public static ReservationResponse toResponse(Reservation r, Instant now) {
        return new ReservationResponse(r.getId(), r.getTable().getId(), r.getTable().getName(), r.getCustomerName(), r.getCustomerPhone(),
                r.getGuestCount(), r.getStartTime(), r.getEndTime(), r.getNote(), r.getStatus(), r.getCreatedAt(), r.getCreatedBy().getId(),
                r.getStatus() == ReservationStatus.CONFIRMED && r.getEndTime().isBefore(now));
    }
    public static UpcomingReservationResponse upcoming(Reservation r) {
        return new UpcomingReservationResponse(r.getId(), r.getCustomerName(), r.getGuestCount(), r.getStartTime(), r.getEndTime());
    }
}
