package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.ueh.kltn.restaurant.entity.Ingredient;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from Ingredient entity where entity.id = :id")
    Optional<Ingredient> findLockedById(@Param("id") Long id);
}
