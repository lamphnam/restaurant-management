package vn.ueh.kltn.restaurant.dto.response;

import vn.ueh.kltn.restaurant.enums.IngredientStatus;

import java.math.BigDecimal;

public record IngredientResponse(
        Long id,
        String name,
        String unit,
        BigDecimal minStock,
        boolean trackLot,
        boolean trackExpiry,
        IngredientStatus status,
        BigDecimal currentStock,
        boolean belowMinStock) {}
