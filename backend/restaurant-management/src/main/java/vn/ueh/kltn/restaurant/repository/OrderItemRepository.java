package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import vn.ueh.kltn.restaurant.dto.response.TopMenuItemResponse;
import vn.ueh.kltn.restaurant.entity.OrderItem;
import vn.ueh.kltn.restaurant.enums.OrderItemStatus;
import vn.ueh.kltn.restaurant.enums.SessionStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Query(
            "select new vn.ueh.kltn.restaurant.dto.response.TopMenuItemResponse(i.menuItem.id,"
                + " i.menuItem.name, sum(i.quantity), sum(i.quantity * i.unitPriceAtOrder)) from"
                + " OrderItem i where i.status not in :excluded and exists (select v.id from"
                + " Invoice v where v.session = i.order.session and v.paidAt >= :from and v.paidAt"
                + " < :to) group by i.menuItem.id, i.menuItem.name order by sum(i.quantity) desc,"
                + " i.menuItem.id")
    List<TopMenuItemResponse> summarizeTopItems(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("excluded") Collection<OrderItemStatus> excluded);

    // Scalar lookup avoids loading a stale item into the persistence context before its locks.
    @Query("select i.order.session.id from OrderItem i where i.id = :id")
    Optional<Long> findSessionIdById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from OrderItem entity where entity.id = :id")
    Optional<OrderItem> findLockedById(@Param("id") Long id);

    @Query(
            "select i from OrderItem i join fetch i.menuItem join fetch i.order o join fetch"
                + " o.session s join fetch s.table where s.status = :sessionStatus and i.status in"
                + " :statuses order by o.createdAt, o.id, i.id")
    List<OrderItem> findQueue(SessionStatus sessionStatus, Collection<OrderItemStatus> statuses);
}
