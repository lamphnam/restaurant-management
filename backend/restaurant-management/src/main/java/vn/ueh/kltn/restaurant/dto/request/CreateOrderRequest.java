package vn.ueh.kltn.restaurant.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateOrderRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một món")
                List<@Valid @NotNull(message = "Dòng món không được để trống") OrderLineRequest>
                        items) {}
