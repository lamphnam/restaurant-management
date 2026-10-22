package vn.ueh.kltn.restaurant.dto.request;

import jakarta.validation.constraints.*;

public record ChangeRoleRequest(@NotNull(message="Vui lòng chọn vai trò") vn.ueh.kltn.restaurant.enums.Role role) { }
