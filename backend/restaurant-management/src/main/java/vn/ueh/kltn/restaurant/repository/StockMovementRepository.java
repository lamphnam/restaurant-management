package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.StockMovement;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
}
