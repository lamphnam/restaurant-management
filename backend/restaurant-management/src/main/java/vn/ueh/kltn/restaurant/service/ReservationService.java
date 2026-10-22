package vn.ueh.kltn.restaurant.service;
import java.time.*;
import java.util.List;
import vn.ueh.kltn.restaurant.dto.request.CreateReservationRequest;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.enums.ReservationStatus;
public interface ReservationService {
    PageResponse<ReservationResponse> list(LocalDate date, ReservationStatus status, String q, int page, int size);
    List<AvailableTableResponse> available(Instant startTime, Instant endTime, int guestCount);
    ReservationResponse create(CreateReservationRequest request);
    ReservationResponse cancel(Long id);
    // Internal seed entry point; never accepts a creator from an HTTP request.
    ReservationResponse createForSeed(CreateReservationRequest request, Account creator);
}
