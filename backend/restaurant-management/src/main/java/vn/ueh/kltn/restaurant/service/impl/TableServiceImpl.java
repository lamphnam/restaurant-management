package vn.ueh.kltn.restaurant.service.impl;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.dto.response.FloorPlanAreaResponse;
import vn.ueh.kltn.restaurant.dto.response.FloorPlanTableResponse;
import vn.ueh.kltn.restaurant.dto.response.UpcomingReservationResponse;
import vn.ueh.kltn.restaurant.entity.DiningArea;
import vn.ueh.kltn.restaurant.entity.DiningTable;
import vn.ueh.kltn.restaurant.enums.SessionStatus;
import vn.ueh.kltn.restaurant.mapper.ReservationMapper;
import vn.ueh.kltn.restaurant.mapper.TableMapper;
import vn.ueh.kltn.restaurant.repository.DiningTableRepository;
import vn.ueh.kltn.restaurant.repository.ReservationRepository;
import vn.ueh.kltn.restaurant.repository.ServiceSessionRepository;
import vn.ueh.kltn.restaurant.service.TableService;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;

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
        List<DiningTable> all = tables.findFloorPlanTables();
        if (all.isEmpty()) return List.of();
        List<Long> ids = all.stream().map(t -> t.getId()).toList();
        var active = new HashMap<Long, Long>();
        sessions.findByTableIdInAndStatus(ids, SessionStatus.ACTIVE)
                .forEach(s -> active.put(s.getTable().getId(), s.getId()));
        Instant now = clock.instant();
        var upcoming = new HashMap<Long, UpcomingReservationResponse>();
        reservations
                .findUpcoming(
                        ids,
                        now,
                        now.plus(
                                properties.reservation().upcomingWarningMinutes(),
                                ChronoUnit.MINUTES))
                .forEach(
                        r ->
                                upcoming.putIfAbsent(
                                        r.getTable().getId(), ReservationMapper.upcoming(r)));
        var areas = new LinkedHashMap<Long, List<FloorPlanTableResponse>>();
        var names = new HashMap<Long, String>();
        for (DiningTable table : all) {
            DiningArea area = table.getArea();
            names.put(area.getId(), area.getName());
            areas.computeIfAbsent(area.getId(), ignored -> new ArrayList<>())
                    .add(
                            TableMapper.floor(
                                    table, active.get(table.getId()), upcoming.get(table.getId())));
        }
        return areas.entrySet().stream()
                .map(
                        a ->
                                new FloorPlanAreaResponse(
                                        a.getKey(), names.get(a.getKey()), a.getValue()))
                .toList();
    }
}
