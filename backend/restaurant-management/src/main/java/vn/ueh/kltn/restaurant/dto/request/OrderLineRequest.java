package vn.ueh.kltn.restaurant.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record OrderLineRequest(
        @NotNull(message = "Vui lòng chọn món") @Positive(message = "Mã món không hợp lệ")
                Long menuItemId,
        @NotNull(message = "Vui lòng nhập số lượng")
                @Positive(message = "Số lượng món phải lớn hơn 0")
                Integer quantity,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {}
