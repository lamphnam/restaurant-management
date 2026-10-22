package vn.ueh.kltn.restaurant.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.ueh.kltn.restaurant.entity.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByPhone(String phone);
}
