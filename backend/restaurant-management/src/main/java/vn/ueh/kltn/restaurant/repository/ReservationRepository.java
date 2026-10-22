package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.Reservation;

public interface ReservationRepository extends JpaRepository<Reservation, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Reservation> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from Reservation r where r.id = :id")
    java.util.Optional<Reservation> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query("""
            select (count(r) > 0) from Reservation r where r.table.id = :tableId and r.status in :statuses
            and :startTime < r.endTime and :endTime > r.startTime
            """)
    boolean existsOverlap(@org.springframework.data.repository.query.Param("tableId") Long tableId,
            @org.springframework.data.repository.query.Param("startTime") java.time.Instant startTime,
            @org.springframework.data.repository.query.Param("endTime") java.time.Instant endTime,
            @org.springframework.data.repository.query.Param("statuses") java.util.Collection<vn.ueh.kltn.restaurant.enums.ReservationStatus> statuses);

    @org.springframework.data.jpa.repository.Query("""
            select r from Reservation r where r.table.id in :tableIds
            and r.status = vn.ueh.kltn.restaurant.enums.ReservationStatus.CONFIRMED
            and r.endTime > :now and r.startTime < :warningEnd order by r.startTime, r.id
            """)
    java.util.List<Reservation> findUpcoming(@org.springframework.data.repository.query.Param("tableIds") java.util.Collection<Long> tableIds,
            @org.springframework.data.repository.query.Param("now") java.time.Instant now,
            @org.springframework.data.repository.query.Param("warningEnd") java.time.Instant warningEnd);

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"table", "createdBy"})
    org.springframework.data.domain.Page<Reservation> findAll(org.springframework.data.jpa.domain.Specification<Reservation> spec,
            org.springframework.data.domain.Pageable pageable);
}
