package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.ueh.kltn.restaurant.entity.Ingredient;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    java.util.List<Ingredient> findByStatusOrderByNameAsc(vn.ueh.kltn.restaurant.enums.IngredientStatus status);
    java.util.List<Ingredient> findAllByOrderByNameAsc();
    Optional<Ingredient> findByName(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from Ingredient entity where entity.id = :id")
    Optional<Ingredient> findLockedById(@Param("id") Long id);
}
