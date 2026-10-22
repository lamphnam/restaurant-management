package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.StockReceiptItem;

public interface StockReceiptItemRepository extends JpaRepository<StockReceiptItem, Long> {
}
