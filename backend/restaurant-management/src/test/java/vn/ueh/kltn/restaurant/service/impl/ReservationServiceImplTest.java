package vn.ueh.kltn.restaurant.service.impl;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.ueh.kltn.restaurant.TestFixtures.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.dto.request.CreateReservationRequest;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.security.CurrentUser;
class ReservationServiceImplTest {
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final AccountRepository accounts = mock(AccountRepository.class);
    private final CurrentUser user = mock(CurrentUser.class);
    private ReservationServiceImpl service;
    private DiningTable table;
    @BeforeEach void setup() {
        var properties = new AppProperties("Asia/Ho_Chi_Minh", false, new AppProperties.Jwt("x".repeat(40), 12), new AppProperties.Alert(3), new AppProperties.Reservation(60));
        service = new ReservationServiceImpl(reservations, tables, accounts, user, CLOCK, properties);
        table = table(1L, 4);
        when(tables.findLockedById(1L)).thenReturn(Optional.of(table));
        when(user.accountId()).thenReturn(2L); when(accounts.getReferenceById(2L)).thenReturn(account());
        when(reservations.save(any())).thenAnswer(a -> id(a.getArgument(0), 9L));
    }
    private CreateReservationRequest request(int guests) { return new CreateReservationRequest(1L, "Khách", "0910000001", guests, NOW, NOW.plusSeconds(7200), "Ghi chú"); }
    @Test void rejectsOverlap() {
        when(reservations.existsOverlap(eq(1L), any(), any(), any())).thenReturn(true);
        assertEquals(ErrorCode.RESERVATION_OVERLAP, assertThrows(BusinessException.class, () -> service.create(request(2))).getErrorCode());
        verify(reservations, never()).save(any());
    }
    @Test void touchingBoundaryIsAcceptedAndUsesCurrentCreator() {
        var r = service.create(new CreateReservationRequest(1L, "Khách", "0910000001", 2, NOW.plusSeconds(7200), NOW.plusSeconds(14400), null));
        assertEquals(ReservationStatus.CONFIRMED, r.status()); assertEquals(2L, r.createdById());
        verify(reservations).existsOverlap(1L, NOW.plusSeconds(7200), NOW.plusSeconds(14400), Set.of(ReservationStatus.CONFIRMED, ReservationStatus.SEATED));
    }
    @Test void rejectsCapacity() { assertEquals(ErrorCode.TABLE_CAPACITY_EXCEEDED, assertThrows(BusinessException.class, () -> service.create(request(5))).getErrorCode()); }
    @Test void rejectsInactiveTable() {
        ReflectionTestUtils.setField(table, "status", TableStatus.INACTIVE);
        assertEquals(ErrorCode.TABLE_INACTIVE, assertThrows(BusinessException.class, () -> service.create(request(2))).getErrorCode());
    }
    @Test void rejectsInvalidIntervalButDoesNotBanPast() {
        assertEquals(ErrorCode.INVALID_INPUT, assertThrows(BusinessException.class, () -> service.available(NOW, NOW, 2)).getErrorCode());
        when(tables.findAvailable(any(), any(), anyInt(), any())).thenReturn(List.of(table));
        assertEquals(1, service.available(NOW.minusSeconds(7200), NOW.minusSeconds(3600), 2).size());
    }
    @Test void cancelConfirmedAndCancelledIsIdempotent() {
        var r = reservation(table); when(reservations.findLockedById(1L)).thenReturn(Optional.of(r));
        assertEquals(ReservationStatus.CANCELLED, service.cancel(1L).status());
        assertEquals(ReservationStatus.CANCELLED, service.cancel(1L).status());
    }
    @Test void cannotCancelSeated() {
        var r = reservation(table); r.confirmSeated(); when(reservations.findLockedById(1L)).thenReturn(Optional.of(r));
        assertEquals(ErrorCode.RESERVATION_NOT_CONFIRMED, assertThrows(BusinessException.class, () -> service.cancel(1L)).getErrorCode());
    }
    @Test void missingReservationIs404() { assertEquals(ErrorCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.cancel(99L)).getErrorCode()); }
}
