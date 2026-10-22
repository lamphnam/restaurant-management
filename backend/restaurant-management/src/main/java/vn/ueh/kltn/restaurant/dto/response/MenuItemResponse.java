package vn.ueh.kltn.restaurant.dto.response;

public record MenuItemResponse(Long id, String name, java.math.BigDecimal price, vn.ueh.kltn.restaurant.enums.MenuItemStatus status) { }
