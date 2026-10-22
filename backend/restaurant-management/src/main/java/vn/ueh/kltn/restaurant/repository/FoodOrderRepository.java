package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.FoodOrder;

public interface FoodOrderRepository extends JpaRepository<FoodOrder, Long> {
}
