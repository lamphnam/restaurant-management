package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.RecipeItem;
import vn.ueh.kltn.restaurant.entity.RecipeItemId;

public interface RecipeItemRepository extends JpaRepository<RecipeItem, RecipeItemId> {
}
