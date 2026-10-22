package vn.ueh.kltn.restaurant.service.impl;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;
import vn.ueh.kltn.restaurant.dto.request.*;
import vn.ueh.kltn.restaurant.dto.response.*;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.mapper.MenuMapper;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.service.MenuService;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuServiceImpl implements MenuService {
    private final MenuItemRepository menuItems;
    private final RecipeItemRepository recipes;
    private final IngredientRepository ingredients;
    public List<MenuItemResponse> list(MenuItemStatus status, String q) {
        Specification<MenuItem> filter = (root, query, cb) -> {
            var conditions = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (status != null) conditions.add(cb.equal(root.get("status"), status));
            if (q != null && !q.isBlank()) conditions.add(cb.like(cb.lower(root.get("name")), "%" + q.trim().toLowerCase(Locale.ROOT) + "%"));
            return cb.and(conditions.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return menuItems.findAll(filter, Sort.by("id")).stream().map(MenuMapper::toResponse).toList();
    }
    @Transactional public MenuItemResponse create(SaveMenuItemRequest r) {
        return MenuMapper.toResponse(menuItems.save(new MenuItem(r.name(), r.price())));
    }
    @Transactional public MenuItemResponse update(Long id, SaveMenuItemRequest r) {
        var item = item(id); item.updateInfo(r.name(), r.price()); return MenuMapper.toResponse(item);
    }
    @Transactional public MenuItemResponse discontinue(Long id) { var item = item(id); item.discontinue(); return MenuMapper.toResponse(item); }
    @Transactional public MenuItemResponse reactivate(Long id) { var item = item(id); item.activate(); return MenuMapper.toResponse(item); }
    public List<RecipeLineResponse> recipe(Long id) { item(id); return recipes.findByMenuItemId(id).stream().map(MenuMapper::toRecipeLine).toList(); }
    @Transactional public List<RecipeLineResponse> saveRecipe(Long id, SaveRecipeRequest request) {
        var item = item(id);
        var ids = new LinkedHashSet<Long>();
        for (var line : request.lines()) {
            if (!ids.add(line.ingredientId())) throw new BusinessException(ErrorCode.DUPLICATE_RECIPE_INGREDIENT);
            if (line.quantityPerServing() == null || line.quantityPerServing().signum() <= 0)
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Định lượng phải lớn hơn 0");
        }
        var selected = ingredients.findAllById(ids);
        if (selected.size() != ids.size()) throw new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy nguyên vật liệu");
        var byId = new HashMap<Long, Ingredient>();
        for (var ingredient : selected) {
            if (ingredient.getStatus() != IngredientStatus.ACTIVE) throw new BusinessException(ErrorCode.INGREDIENT_INACTIVE);
            byId.put(ingredient.getId(), ingredient);
        }
        var existing = recipes.findByMenuItemId(id);
        var retained = new HashMap<Long, RecipeItem>();
        var removed = new ArrayList<RecipeItem>();
        for (var line : existing) {
            if (ids.contains(line.getIngredient().getId())) retained.put(line.getIngredient().getId(), line);
            else removed.add(line);
        }
        recipes.deleteAll(removed);
        var added = new ArrayList<RecipeItem>();
        var result = new ArrayList<RecipeItem>();
        for (var line : request.lines()) {
            var old = retained.get(line.ingredientId());
            if (old != null) { old.changeQuantity(line.quantityPerServing()); result.add(old); }
            else {
                var created = new RecipeItem(item, byId.get(line.ingredientId()), line.quantityPerServing());
                added.add(created); result.add(created);
            }
        }
        recipes.saveAll(added);
        recipes.flush();
        return result.stream().sorted(Comparator.comparing(r -> r.getIngredient().getName())).map(MenuMapper::toRecipeLine).toList();
    }
    private MenuItem item(Long id) { return menuItems.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy món ăn")); }
}
