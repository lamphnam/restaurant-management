package vn.ueh.kltn.restaurant.service;
import java.util.List;
import vn.ueh.kltn.restaurant.dto.request.*;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.enums.MenuItemStatus;
public interface MenuService {
    List<MenuItemResponse> list(MenuItemStatus status, String q);
    MenuItemResponse create(SaveMenuItemRequest request);
    MenuItemResponse update(Long id, SaveMenuItemRequest request);
    MenuItemResponse discontinue(Long id);
    MenuItemResponse reactivate(Long id);
    List<RecipeLineResponse> recipe(Long id);
    List<RecipeLineResponse> saveRecipe(Long id, SaveRecipeRequest request);
}
