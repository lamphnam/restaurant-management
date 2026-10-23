package vn.ueh.kltn.restaurant.enums;

import java.util.Set;

public enum OrderItemStatus {
    PENDING,
    COOKING,
    READY,
    SERVED,
    UNAVAILABLE,
    CANCELLED;

    public static final Set<OrderItemStatus> NON_BILLABLE = Set.of(CANCELLED, UNAVAILABLE);
}
