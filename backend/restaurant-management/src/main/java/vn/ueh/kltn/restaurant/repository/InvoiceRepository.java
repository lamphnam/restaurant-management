package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import vn.ueh.kltn.restaurant.entity.Invoice;

import java.util.Optional;

public interface InvoiceRepository
        extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {

    @Override
    @EntityGraph(attributePaths = {"session.table.area", "cashier"})
    Page<Invoice> findAll(Specification<Invoice> spec, Pageable pageable);

    boolean existsBySessionId(Long sessionId);

    @Query(
            "select i from Invoice i join fetch i.session s join fetch s.table t join fetch"
                    + " i.cashier c where i.session.id = :sessionId")
    Optional<Invoice> findBySessionId(@Param("sessionId") Long sessionId);
}
