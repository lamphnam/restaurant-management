package vn.ueh.kltn.restaurant.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record OpenSessionPaymentResponse(
        Long sessionId,
        Long tableId,
        String tableName,
        String areaName,
        Instant openedAt,
        BigDecimal provisionalTotal,
        boolean hasPendingOrCookingItems,
        int totalItems) {}
