package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.ueh.kltn.restaurant.entity.DiningTable;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from DiningTable entity where entity.id = :id")
    Optional<DiningTable> findLockedById(@Param("id") Long id);
}
