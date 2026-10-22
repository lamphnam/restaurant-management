package vn.ueh.kltn.restaurant.seed;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.entity.DiningArea;
import vn.ueh.kltn.restaurant.entity.DiningTable;
import vn.ueh.kltn.restaurant.enums.Role;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.DiningAreaRepository;
import vn.ueh.kltn.restaurant.repository.DiningTableRepository;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final AppProperties properties;
    private final AccountRepository accounts;
    private final DiningAreaRepository areas;
    private final DiningTableRepository tables;
    private final PasswordEncoder encoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (!properties.seed() || accounts.count() != 0) return;
        String[] names = {"Nguyễn Minh Chủ", "Trần Minh Quản", "Lê Thu Ngân", "Phạm Phục Vụ", "Hoàng Nhân Bếp", "Vũ Bếp Trưởng"};
        Role[] roles = Role.values();
        for (int index = 0; index < roles.length; index++) {
            accounts.save(new Account(names[index], "090000000" + (index + 1), encoder.encode("Demo@123"), roles[index]));
        }
        var diningAreas = areas.saveAll(List.of(new DiningArea("Tầng 1"), new DiningArea("Tầng 2"), new DiningArea("Sân vườn")));
        int[] capacities = {2, 4, 6, 8};
        for (int index = 0; index < 12; index++) {
            tables.save(new DiningTable(diningAreas.get(index / 4), "T%02d".formatted(index + 1), capacities[index % 4]));
        }
    }
}
