package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.IngredientLot;

public interface IngredientLotRepository extends JpaRepository<IngredientLot, Long> {
}
