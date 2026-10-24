package vn.ueh.kltn.restaurant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import vn.ueh.kltn.restaurant.enums.OrderItemStatus;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;

import java.math.BigDecimal;

@Entity
@Table(name = "order_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private FoodOrder order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "note", nullable = true, length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderItemStatus status;

    @Column(name = "unavailable_reason", nullable = true, length = 500)
    private String unavailableReason;

    @Column(name = "unit_price_at_order", nullable = false, precision = 14, scale = 0)
    private BigDecimal unitPriceAtOrder;

    public OrderItem(MenuItem menuItem, int quantity, String note) {
        if (quantity <= 0)
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Số lượng món phải lớn hơn 0");
        this.menuItem = menuItem;
        this.quantity = quantity;
        this.note = note;
        this.unitPriceAtOrder = menuItem.getPrice();
        this.status = OrderItemStatus.PENDING;
    }

    void attachTo(FoodOrder order) {
        if (this.order != null)
            throw new BusinessException(ErrorCode.INVALID_STATE, "Món đã thuộc một đợt gọi món");
        this.order = order;
    }

    public BigDecimal calculateSubtotal() {
        return OrderItemStatus.NON_BILLABLE.contains(status)
                ? BigDecimal.ZERO
                : unitPriceAtOrder.multiply(BigDecimal.valueOf(quantity));
    }

    public void startCooking() {
        if (status == OrderItemStatus.COOKING) return;
        requireStatus(OrderItemStatus.PENDING);
        status = OrderItemStatus.COOKING;
    }

    public void markUnavailable(String reason) {
        if (status == OrderItemStatus.UNAVAILABLE) return;
        if (status != OrderItemStatus.PENDING && status != OrderItemStatus.COOKING)
            throw new BusinessException(
                    ErrorCode.INVALID_STATE,
                    "Không thể báo không chế biến được ở trạng thái hiện tại");
        if (reason == null || reason.isBlank())
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT, "Vui lòng nhập lý do không thể chế biến");
        unavailableReason = reason.trim();
        status = OrderItemStatus.UNAVAILABLE;
    }

    public void markReady() {
        if (status == OrderItemStatus.READY || status == OrderItemStatus.SERVED) return;
        requireStatus(OrderItemStatus.COOKING);
        status = OrderItemStatus.READY;
    }

    public void markServed() {
        if (status == OrderItemStatus.SERVED) return;
        requireStatus(OrderItemStatus.READY);
        status = OrderItemStatus.SERVED;
    }

    public void cancel() {
        if (status == OrderItemStatus.CANCELLED) return;
        requireStatus(OrderItemStatus.PENDING);
        status = OrderItemStatus.CANCELLED;
    }

    private void requireStatus(OrderItemStatus expected) {
        if (status != expected)
            throw new BusinessException(
                    ErrorCode.INVALID_STATE,
                    "Không thể chuyển trạng thái món ở trạng thái hiện tại");
    }
}
