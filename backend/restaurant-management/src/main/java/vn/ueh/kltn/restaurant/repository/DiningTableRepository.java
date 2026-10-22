package vn.ueh.kltn.restaurant.repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.ueh.kltn.restaurant.entity.DiningTable;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {
    Optional<DiningTable> findByName(String name);

    @Query("select t from DiningTable t join fetch t.area a where a.status = vn.ueh.kltn.restaurant.enums.AreaStatus.ACTIVE order by a.id, t.name")
    java.util.List<DiningTable> findFloorPlanTables();

    @Query("""
            select t from DiningTable t join fetch t.area a
            where a.status = vn.ueh.kltn.restaurant.enums.AreaStatus.ACTIVE
              and t.status <> vn.ueh.kltn.restaurant.enums.TableStatus.INACTIVE and t.capacity >= :guestCount
              and not exists (select r.id from Reservation r where r.table = t and r.status in :statuses
                              and :startTime < r.endTime and :endTime > r.startTime)
            order by t.capacity, a.id, t.name
            """)
    java.util.List<DiningTable> findAvailable(@Param("startTime") java.time.Instant startTime,
            @Param("endTime") java.time.Instant endTime, @Param("guestCount") int guestCount,
            @Param("statuses") java.util.Collection<vn.ueh.kltn.restaurant.enums.ReservationStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select entity from DiningTable entity where entity.id = :id")
    Optional<DiningTable> findLockedById(@Param("id") Long id);
}
