package vn.ueh.kltn.restaurant.mapper;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.entity.*;
public final class MenuMapper {
    private MenuMapper() { }
    public static MenuItemResponse toResponse(MenuItem item) { return new MenuItemResponse(item.getId(), item.getName(), item.getPrice(), item.getStatus()); }
    public static RecipeLineResponse toRecipeLine(RecipeItem item) {
        var ingredient = item.getIngredient();
        return new RecipeLineResponse(ingredient.getId(), ingredient.getName(), ingredient.getUnit(), item.getQuantityPerServing());
    }
}
