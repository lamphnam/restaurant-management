package vn.ueh.kltn.restaurant.service.impl;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.enums.SessionStatus;
import vn.ueh.kltn.restaurant.mapper.*;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.service.TableService;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TableServiceImpl implements TableService {
    private final DiningTableRepository tables;
    private final ServiceSessionRepository sessions;
    private final ReservationRepository reservations;
    private final AppProperties properties;
    private final Clock clock;
    public List<FloorPlanAreaResponse> floorPlan() {
        var all = tables.findFloorPlanTables();
        if (all.isEmpty()) return List.of();
        var ids = all.stream().map(t -> t.getId()).toList();
        var active = new HashMap<Long, Long>();
        sessions.findByTableIdInAndStatus(ids, SessionStatus.ACTIVE).forEach(s -> active.put(s.getTable().getId(), s.getId()));
        var now = clock.instant();
        var upcoming = new HashMap<Long, UpcomingReservationResponse>();
        reservations.findUpcoming(ids, now, now.plus(properties.reservation().upcomingWarningMinutes(), ChronoUnit.MINUTES))
                .forEach(r -> upcoming.putIfAbsent(r.getTable().getId(), ReservationMapper.upcoming(r)));
        var areas = new LinkedHashMap<Long, List<FloorPlanTableResponse>>();
        var names = new HashMap<Long, String>();
        for (var table : all) {
            var area = table.getArea();
            names.put(area.getId(), area.getName());
            areas.computeIfAbsent(area.getId(), ignored -> new ArrayList<>()).add(TableMapper.floor(table, active.get(table.getId()), upcoming.get(table.getId())));
        }
        return areas.entrySet().stream().map(a -> new FloorPlanAreaResponse(a.getKey(), names.get(a.getKey()), a.getValue())).toList();
    }
}
