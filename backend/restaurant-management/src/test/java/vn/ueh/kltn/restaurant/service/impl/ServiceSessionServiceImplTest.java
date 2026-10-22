package vn.ueh.kltn.restaurant.service.impl;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.ueh.kltn.restaurant.TestFixtures.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;
import vn.ueh.kltn.restaurant.dto.request.OpenSessionRequest;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.security.CurrentUser;
class ServiceSessionServiceImplTest {
    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final ServiceSessionRepository sessions = mock(ServiceSessionRepository.class);
    private final AccountRepository accounts = mock(AccountRepository.class);
    private final CurrentUser user = mock(CurrentUser.class);
    private ServiceSessionServiceImpl service;
    private DiningTable table;
    @BeforeEach void setup() {
        service = new ServiceSessionServiceImpl(tables, reservations, sessions, accounts, user, CLOCK);
        table = table(1L, 4); when(tables.findLockedById(1L)).thenReturn(Optional.of(table));
        when(user.accountId()).thenReturn(2L); when(accounts.getReferenceById(2L)).thenReturn(account());
        when(sessions.saveAndFlush(any())).thenAnswer(a -> id(a.getArgument(0), 7L));
    }
    @Test void walkInOccupiesTableWithoutConsultingReservations() {
        var result = service.open(new OpenSessionRequest(1L, null));
        assertEquals(7L, result.sessionId()); assertNull(result.reservationId());
        assertEquals(SessionStatus.ACTIVE, result.status()); assertEquals(TableStatus.OCCUPIED, table.getStatus());
        verifyNoInteractions(reservations);
    }
    @Test void reservationSeatsAndLocksAfterTable() {
        var r = reservation(table); when(reservations.findLockedById(1L)).thenReturn(Optional.of(r));
        assertEquals(1L, service.open(new OpenSessionRequest(1L, 1L)).reservationId());
        assertEquals(ReservationStatus.SEATED, r.getStatus()); assertEquals(TableStatus.OCCUPIED, table.getStatus());
        var order = inOrder(tables, reservations); order.verify(tables).findLockedById(1L); order.verify(reservations).findLockedById(1L);
    }
    private ErrorCode failure(Long reservationId) { return assertThrows(BusinessException.class, () -> service.open(new OpenSessionRequest(1L, reservationId))).getErrorCode(); }
    @Test void inactiveIsRejected() { ReflectionTestUtils.setField(table, "status", TableStatus.INACTIVE); assertEquals(ErrorCode.TABLE_INACTIVE, failure(null)); }
    @Test void existingActiveSessionIsRejectedBeforeTableStatus() {
        table.occupy(); when(sessions.existsByTableIdAndStatus(1L, SessionStatus.ACTIVE)).thenReturn(true);
        assertEquals(ErrorCode.SESSION_ALREADY_ACTIVE, failure(null));
    }
    @Test void occupiedWithoutSessionIsNotAvailable() { table.occupy(); assertEquals(ErrorCode.TABLE_NOT_AVAILABLE, failure(null)); }
    @Test void reservationTableMustMatch() {
        when(reservations.findLockedById(1L)).thenReturn(Optional.of(reservation(table(2L, 4))));
        assertEquals(ErrorCode.RESERVATION_TABLE_MISMATCH, failure(1L));
    }
    @Test void cancelledReservationIsRejected() {
        var r = reservation(table); r.cancel(); when(reservations.findLockedById(1L)).thenReturn(Optional.of(r));
        assertEquals(ErrorCode.RESERVATION_NOT_CONFIRMED, failure(1L));
    }
    @Test void expiredReservationIsRejected() {
        var r = reservation(table); ReflectionTestUtils.setField(r, "endTime", NOW);
        when(reservations.findLockedById(1L)).thenReturn(Optional.of(r)); assertEquals(ErrorCode.RESERVATION_EXPIRED, failure(1L));
    }
    @Test void databaseRaceIsClean409Code() {
        doThrow(new DataIntegrityViolationException("unique")).when(sessions).saveAndFlush(any());
        assertEquals(ErrorCode.SESSION_ALREADY_ACTIVE, failure(null));
    }
    @Test void missingReservationIs404() { assertEquals(ErrorCode.NOT_FOUND, failure(99L)); }
}
