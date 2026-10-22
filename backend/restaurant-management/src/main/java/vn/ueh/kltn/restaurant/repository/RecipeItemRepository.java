package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.RecipeItem;
import vn.ueh.kltn.restaurant.entity.RecipeItemId;

public interface RecipeItemRepository extends JpaRepository<RecipeItem, RecipeItemId> {
    @org.springframework.data.jpa.repository.Query("select r from RecipeItem r join fetch r.ingredient where r.menuItem.id = :menuItemId order by r.ingredient.name")
    java.util.List<RecipeItem> findByMenuItemId(@org.springframework.data.repository.query.Param("menuItemId") Long menuItemId);
}
