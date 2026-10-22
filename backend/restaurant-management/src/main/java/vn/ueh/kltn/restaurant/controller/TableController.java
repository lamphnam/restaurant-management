package vn.ueh.kltn.restaurant.controller;
import java.time.*;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.ueh.kltn.restaurant.dto.request.CreateReservationRequest;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.enums.ReservationStatus;
import vn.ueh.kltn.restaurant.service.*;
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TableController {
    private final TableService tables;
    private final ReservationService reservations;
    @GetMapping("/tables/floor-plan") @PreAuthorize("hasAnyRole('WAITER','MANAGER','CASHIER','OWNER')")
    public List<FloorPlanAreaResponse> floorPlan() { return tables.floorPlan(); }
    @GetMapping("/reservations") @PreAuthorize("hasAnyRole('MANAGER','WAITER','OWNER')")
    public PageResponse<ReservationResponse> list(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required=false) ReservationStatus status, @RequestParam(required=false) String q,
            @RequestParam(defaultValue="0") @Min(value=0, message="Số trang phải lớn hơn hoặc bằng 0") int page,
            @RequestParam(defaultValue="20") @Min(value=1, message="Kích thước trang phải lớn hơn 0") @Max(value=100, message="Mỗi trang tối đa 100 dòng") int size) {
        return reservations.list(date, status, q, page, size);
    }
    @GetMapping("/reservations/available-tables") @PreAuthorize("hasRole('MANAGER')")
    public List<AvailableTableResponse> available(@RequestParam Instant startTime, @RequestParam Instant endTime,
            @RequestParam @Min(value=1, message="Số khách phải lớn hơn 0") int guestCount) {
        return reservations.available(startTime, endTime, guestCount);
    }
    @PostMapping("/reservations") @PreAuthorize("hasRole('MANAGER')")
    public ReservationResponse create(@Valid @RequestBody CreateReservationRequest request) { return reservations.create(request); }
    @PatchMapping("/reservations/{id}/cancel") @PreAuthorize("hasRole('MANAGER')")
    public ReservationResponse cancel(@PathVariable Long id) { return reservations.cancel(id); }
}
