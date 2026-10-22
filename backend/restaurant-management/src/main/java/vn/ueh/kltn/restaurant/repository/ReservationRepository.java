package vn.ueh.kltn.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.Reservation;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
}
