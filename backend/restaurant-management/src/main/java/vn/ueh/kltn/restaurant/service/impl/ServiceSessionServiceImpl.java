package vn.ueh.kltn.restaurant.service.impl;

import lombok.RequiredArgsConstructor;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.dto.request.OpenSessionRequest;
import vn.ueh.kltn.restaurant.dto.response.OpenSessionResponse;
import vn.ueh.kltn.restaurant.entity.DiningTable;
import vn.ueh.kltn.restaurant.entity.Reservation;
import vn.ueh.kltn.restaurant.entity.ServiceSession;
import vn.ueh.kltn.restaurant.enums.ReservationStatus;
import vn.ueh.kltn.restaurant.enums.SessionStatus;
import vn.ueh.kltn.restaurant.enums.TableStatus;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.mapper.ServiceSessionMapper;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.DiningTableRepository;
import vn.ueh.kltn.restaurant.repository.ReservationRepository;
import vn.ueh.kltn.restaurant.repository.ServiceSessionRepository;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.ServiceSessionService;

import java.time.Clock;
import java.time.Instant;

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
        DiningTable table =
                tables.findLockedById(request.tableId())
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND, "Không tìm thấy bàn"));
        if (table.getStatus() == TableStatus.INACTIVE)
            throw new BusinessException(ErrorCode.TABLE_INACTIVE);
        if (sessions.existsByTableIdAndStatus(table.getId(), SessionStatus.ACTIVE))
            throw new BusinessException(ErrorCode.SESSION_ALREADY_ACTIVE);
        if (table.getStatus() != TableStatus.AVAILABLE)
            throw new BusinessException(ErrorCode.TABLE_NOT_AVAILABLE);
        Instant now = clock.instant();
        Reservation reservation = null;
        if (request.reservationId() != null) {
            reservation =
                    reservations
                            .findLockedById(request.reservationId())
                            .orElseThrow(
                                    () ->
                                            new BusinessException(
                                                    ErrorCode.NOT_FOUND, "Không tìm thấy đặt bàn"));
            if (reservation.getStatus() != ReservationStatus.CONFIRMED)
                throw new BusinessException(ErrorCode.RESERVATION_NOT_CONFIRMED);
            if (!reservation.getTable().getId().equals(table.getId()))
                throw new BusinessException(ErrorCode.RESERVATION_TABLE_MISMATCH);
            if (!reservation.getEndTime().isAfter(now))
                throw new BusinessException(ErrorCode.RESERVATION_EXPIRED);
            reservation.confirmSeated();
        }
        var session =
                new ServiceSession(
                        table,
                        reservation,
                        accounts.getReferenceById(currentUser.accountId()),
                        now);
        table.occupy();
        try {
            sessions.saveAndFlush(session);
        } catch (DataIntegrityViolationException exception) {
            for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
                if (cause instanceof ConstraintViolationException violation
                        && "uq_active_session_table".equals(violation.getConstraintName())) {
                    throw new BusinessException(ErrorCode.SESSION_ALREADY_ACTIVE);
                }
            }
            throw exception;
        }
        // Phase 2: publish FLOOR_PLAN (+ RESERVATION when attached), delivered after commit.
        return ServiceSessionMapper.toResponse(session);
    }
}
