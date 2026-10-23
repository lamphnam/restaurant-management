package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import vn.ueh.kltn.restaurant.entity.OrderItem;
import vn.ueh.kltn.restaurant.enums.OrderItemStatus;
import vn.ueh.kltn.restaurant.enums.SessionStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from OrderItem entity where entity.id = :id")
    Optional<OrderItem> findLockedById(@Param("id") Long id);

    @Query(
            "select i from OrderItem i join fetch i.menuItem join fetch i.order o join fetch"
                + " o.session s join fetch s.table where s.status = :sessionStatus and i.status in"
                + " :statuses order by o.createdAt, o.id, i.id")
    List<OrderItem> findQueue(SessionStatus sessionStatus, Collection<OrderItemStatus> statuses);
}
