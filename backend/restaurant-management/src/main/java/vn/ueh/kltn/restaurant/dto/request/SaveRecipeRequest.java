package vn.ueh.kltn.restaurant.dto.request;

import jakarta.validation.constraints.*;

public record SaveRecipeRequest(@NotNull(message="Vui lòng gửi danh sách định lượng") java.util.List<@jakarta.validation.Valid @NotNull(message="Dòng định lượng không được để trống") RecipeLineRequest> lines) { }
