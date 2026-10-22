package vn.ueh.kltn.restaurant.controller;
import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.ueh.kltn.restaurant.dto.request.*;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.enums.MenuItemStatus;
import vn.ueh.kltn.restaurant.service.MenuService;
@RestController
@RequestMapping("/api/menu-items")
@RequiredArgsConstructor
public class MenuController {
    private final MenuService menu;
    @GetMapping @PreAuthorize("isAuthenticated()")
    public List<MenuItemResponse> list(@RequestParam(required=false) MenuItemStatus status, @RequestParam(required=false) String q) { return menu.list(status, q); }
    @PostMapping @PreAuthorize("hasRole('OWNER')")
    public MenuItemResponse create(@Valid @RequestBody SaveMenuItemRequest r) { return menu.create(r); }
    @PutMapping("/{id}") @PreAuthorize("hasRole('OWNER')")
    public MenuItemResponse update(@PathVariable Long id, @Valid @RequestBody SaveMenuItemRequest r) { return menu.update(id, r); }
    @PatchMapping("/{id}/discontinue") @PreAuthorize("hasRole('OWNER')")
    public MenuItemResponse discontinue(@PathVariable Long id) { return menu.discontinue(id); }
    @PatchMapping("/{id}/reactivate") @PreAuthorize("hasRole('OWNER')")
    public MenuItemResponse reactivate(@PathVariable Long id) { return menu.reactivate(id); }
    @GetMapping("/{id}/recipe") @PreAuthorize("hasAnyRole('OWNER','HEAD_CHEF')")
    public List<RecipeLineResponse> recipe(@PathVariable Long id) { return menu.recipe(id); }
    @PutMapping("/{id}/recipe") @PreAuthorize("hasAnyRole('OWNER','HEAD_CHEF')")
    public List<RecipeLineResponse> saveRecipe(@PathVariable Long id, @Valid @RequestBody SaveRecipeRequest r) { return menu.saveRecipe(id, r); }
}
