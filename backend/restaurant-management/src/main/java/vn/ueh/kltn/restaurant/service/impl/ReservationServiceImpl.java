package vn.ueh.kltn.restaurant.service.impl;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.dto.request.CreateReservationRequest;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.mapper.*;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.ReservationService;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationServiceImpl implements ReservationService {
    private static final Set<ReservationStatus> BLOCKING = Set.of(ReservationStatus.CONFIRMED, ReservationStatus.SEATED);
    private final ReservationRepository reservations;
    private final DiningTableRepository tables;
    private final AccountRepository accounts;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final AppProperties properties;
    public PageResponse<ReservationResponse> list(LocalDate date, ReservationStatus status, String q, int page, int size) {
        var zone = ZoneId.of(properties.timezone());
        var from = date == null ? null : date.atStartOfDay(zone).toInstant();
        var to = date == null ? null : date.plusDays(1).atStartOfDay(zone).toInstant();
        Specification<Reservation> filter = (root, query, cb) -> {
            var conditions = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (from != null) {
                conditions.add(cb.greaterThanOrEqualTo(root.get("startTime"), from));
                conditions.add(cb.lessThan(root.get("startTime"), to));
            }
            if (status != null) conditions.add(cb.equal(root.get("status"), status));
            if (q != null && !q.isBlank()) {
                var term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                conditions.add(cb.or(cb.like(cb.lower(root.get("customerName")), term), cb.like(root.get("customerPhone"), term)));
            }
            return cb.and(conditions.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        var now = clock.instant();
        return PageResponse.from(reservations.findAll(filter, PageRequest.of(page, size, Sort.by("startTime").and(Sort.by("id"))))
                .map(r -> ReservationMapper.toResponse(r, now)));
    }
    public List<AvailableTableResponse> available(Instant start, Instant end, int guestCount) {
        validateInterval(start, end);
        if (guestCount <= 0) throw new BusinessException(ErrorCode.INVALID_INPUT, "Số khách phải lớn hơn 0");
        return tables.findAvailable(start, end, guestCount, BLOCKING).stream().map(TableMapper::available).toList();
    }
    @Transactional public ReservationResponse create(CreateReservationRequest request) {
        return createWithCreator(request, accounts.getReferenceById(currentUser.accountId()));
    }
    @Transactional public ReservationResponse createForSeed(CreateReservationRequest request, Account creator) {
        return createWithCreator(request, creator);
    }
    private ReservationResponse createWithCreator(CreateReservationRequest r, Account creator) {
        var table = tables.findLockedById(r.tableId()).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy bàn"));
        if (table.getStatus() == TableStatus.INACTIVE) throw new BusinessException(ErrorCode.TABLE_INACTIVE);
        if (!table.hasEnoughCapacity(r.guestCount())) throw new BusinessException(ErrorCode.TABLE_CAPACITY_EXCEEDED);
        validateInterval(r.startTime(), r.endTime());
        checkOverlap(table.getId(), r.startTime(), r.endTime());
        var now = clock.instant();
        var saved = reservations.save(new Reservation(table, creator, r.customerName(), r.customerPhone(), r.guestCount(),
                r.startTime(), r.endTime(), r.note(), now));
        // Phase 2: publish RESERVATION here; delivery must happen after commit.
        return ReservationMapper.toResponse(saved, now);
    }
    public void checkOverlap(Long tableId, Instant start, Instant end) {
        if (reservations.existsOverlap(tableId, start, end, BLOCKING)) throw new BusinessException(ErrorCode.RESERVATION_OVERLAP);
    }
    @Transactional public ReservationResponse cancel(Long id) {
        var reservation = reservations.findLockedById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy đặt bàn"));
        if (reservation.getStatus() == ReservationStatus.SEATED) throw new BusinessException(ErrorCode.RESERVATION_NOT_CONFIRMED);
        reservation.cancel();
        // Phase 2: publish RESERVATION after a real change, delivered after commit.
        return ReservationMapper.toResponse(reservation, clock.instant());
    }
    private void validateInterval(Instant start, Instant end) {
        if (start == null || end == null || !start.isBefore(end)) throw new BusinessException(ErrorCode.INVALID_INPUT, "Giờ kết thúc phải sau giờ bắt đầu");
    }
}
