package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import vn.ueh.kltn.restaurant.entity.IngredientLot;

import java.time.LocalDate;
import java.util.List;

public interface IngredientLotRepository extends JpaRepository<IngredientLot, Long> {
    List<IngredientLot> findByIngredientIdOrderByExpiryDateAsc(Long ingredientId);

    @Query(
            "select l from IngredientLot l join fetch l.ingredient i where l.expiryDate is not"
                    + " null and l.expiryDate <= :thresholdDate order by l.expiryDate asc")
    List<IngredientLot> findAttentionLots(@Param("thresholdDate") LocalDate thresholdDate);
}
