package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import vn.ueh.kltn.restaurant.entity.StockMovement;

import java.math.BigDecimal;
import java.util.List;

public interface StockMovementRepository
        extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {

    boolean existsByIngredientId(Long ingredientId);

    @Query(
            "select coalesce(sum(sm.quantityChange), 0) from StockMovement sm where"
                    + " sm.ingredient.id = :ingredientId")
    BigDecimal sumQuantityByIngredientId(@Param("ingredientId") Long ingredientId);

    @Query(
            "select sm.ingredient.id, coalesce(sum(sm.quantityChange), 0) from StockMovement sm"
                    + " group by sm.ingredient.id")
    List<Object[]> sumQuantityGroupedByIngredient();
}
