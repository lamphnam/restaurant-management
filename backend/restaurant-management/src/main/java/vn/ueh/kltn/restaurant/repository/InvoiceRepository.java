package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.Invoice;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
}
