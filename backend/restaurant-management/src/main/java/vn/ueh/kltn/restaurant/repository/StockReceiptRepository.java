package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.StockReceipt;

public interface StockReceiptRepository extends JpaRepository<StockReceipt, Long> {
}
