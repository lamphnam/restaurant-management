package vn.ueh.kltn.restaurant.mapper;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.entity.DiningTable;
public final class TableMapper {
    private TableMapper() { }
    public static AvailableTableResponse available(DiningTable table) {
        return new AvailableTableResponse(table.getId(), table.getName(), table.getCapacity(), table.getArea().getName());
    }
    public static FloorPlanTableResponse floor(DiningTable t, Long sessionId, UpcomingReservationResponse upcoming) {
        return new FloorPlanTableResponse(t.getId(), t.getName(), t.getCapacity(), t.getStatus(), sessionId, upcoming);
    }
}
