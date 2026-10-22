package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.ueh.kltn.restaurant.entity.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from OrderItem entity where entity.id = :id")
    Optional<OrderItem> findLockedById(@Param("id") Long id);
}
