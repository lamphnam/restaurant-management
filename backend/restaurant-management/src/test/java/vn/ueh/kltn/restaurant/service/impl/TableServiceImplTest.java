package vn.ueh.kltn.restaurant.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.ueh.kltn.restaurant.TestFixtures.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.entity.ServiceSession;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.repository.*;

class TableServiceImplTest {
    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final ServiceSessionRepository sessions = mock(ServiceSessionRepository.class);
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final AppProperties properties = new AppProperties("Asia/Ho_Chi_Minh", false, new AppProperties.Jwt("x".repeat(40), 12), new AppProperties.Alert(3), new AppProperties.Reservation(60));
    private final TableServiceImpl service = new TableServiceImpl(tables, sessions, reservations, properties, CLOCK);

    @Test void groupsTablesAndUsesNearestReservationInExactlyThreeRepositoryCalls() {
        var table = table(1L, 4);
        var inactive = table(2L, 2); ReflectionTestUtils.setField(inactive, "status", TableStatus.INACTIVE);
        var session = id(new ServiceSession(table, null, account(), NOW), 5L);
        var nearest = reservation(table); var later = id(reservation(table), 2L);
        ReflectionTestUtils.setField(later, "startTime", NOW.plusSeconds(1800));
        when(tables.findFloorPlanTables()).thenReturn(List.of(table, inactive));
        when(sessions.findByTableIdInAndStatus(List.of(1L, 2L), SessionStatus.ACTIVE)).thenReturn(List.of(session));
        when(reservations.findUpcoming(List.of(1L, 2L), NOW, NOW.plusSeconds(3600))).thenReturn(List.of(nearest, later));
        var result = service.floorPlan();
        assertEquals(1, result.size()); assertEquals(2, result.getFirst().tables().size());
        assertEquals(5L, result.getFirst().tables().getFirst().activeSessionId());
        assertEquals(1L, result.getFirst().tables().getFirst().upcomingReservation().id());
        assertEquals(TableStatus.INACTIVE, result.getFirst().tables().get(1).status());
        verify(tables).findFloorPlanTables();
        verify(sessions).findByTableIdInAndStatus(List.of(1L, 2L), SessionStatus.ACTIVE);
        verify(reservations).findUpcoming(List.of(1L, 2L), NOW, NOW.plusSeconds(3600));
        verifyNoMoreInteractions(tables, sessions, reservations);
    }
    @Test void emptyFloorDoesNotQuerySessionsOrReservations() {
        when(tables.findFloorPlanTables()).thenReturn(List.of());
        assertTrue(service.floorPlan().isEmpty()); verifyNoInteractions(sessions, reservations);
    }
}
