package vn.ueh.kltn.restaurant.service.impl;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import vn.ueh.kltn.restaurant.dto.request.OpenSessionRequest;
import vn.ueh.kltn.restaurant.dto.response.OpenSessionResponse;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.mapper.ServiceSessionMapper;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.ServiceSessionService;
@Service
@RequiredArgsConstructor
public class ServiceSessionServiceImpl implements ServiceSessionService {
    private final DiningTableRepository tables;
    private final ReservationRepository reservations;
    private final ServiceSessionRepository sessions;
    private final AccountRepository accounts;
    private final CurrentUser currentUser;
    private final Clock clock;
    @Transactional
    public OpenSessionResponse open(OpenSessionRequest request) {
        // Fixed lock order: DiningTable, then Reservation. Cancel never locks a table.
        var table = tables.findLockedById(request.tableId()).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy bàn"));
        if (table.getStatus() == TableStatus.INACTIVE) throw new BusinessException(ErrorCode.TABLE_INACTIVE);
        if (sessions.existsByTableIdAndStatus(table.getId(), SessionStatus.ACTIVE)) throw new BusinessException(ErrorCode.SESSION_ALREADY_ACTIVE);
        if (table.getStatus() != TableStatus.AVAILABLE) throw new BusinessException(ErrorCode.TABLE_NOT_AVAILABLE);
        var now = clock.instant();
        Reservation reservation = null;
        if (request.reservationId() != null) {
            reservation = reservations.findLockedById(request.reservationId()).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy đặt bàn"));
            if (reservation.getStatus() != ReservationStatus.CONFIRMED) throw new BusinessException(ErrorCode.RESERVATION_NOT_CONFIRMED);
            if (!reservation.getTable().getId().equals(table.getId())) throw new BusinessException(ErrorCode.RESERVATION_TABLE_MISMATCH);
            if (!reservation.getEndTime().isAfter(now)) throw new BusinessException(ErrorCode.RESERVATION_EXPIRED);
            reservation.confirmSeated();
        }
        var session = new ServiceSession(table, reservation, accounts.getReferenceById(currentUser.accountId()), now);
        table.occupy();
        try { sessions.saveAndFlush(session); }
        catch (DataIntegrityViolationException exception) { throw new BusinessException(ErrorCode.SESSION_ALREADY_ACTIVE); }
        // Phase 2: publish FLOOR_PLAN (+ RESERVATION when attached), delivered after commit.
        return ServiceSessionMapper.toResponse(session);
    }
}
