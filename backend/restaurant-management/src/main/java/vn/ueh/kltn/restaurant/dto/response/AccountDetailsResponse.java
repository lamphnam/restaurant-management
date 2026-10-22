package vn.ueh.kltn.restaurant.dto.response;

public record AccountDetailsResponse(Long id, String fullName, String phone, vn.ueh.kltn.restaurant.enums.Role role, vn.ueh.kltn.restaurant.enums.AccountStatus status) { }
