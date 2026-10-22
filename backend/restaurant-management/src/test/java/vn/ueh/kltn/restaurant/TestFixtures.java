package vn.ueh.kltn.restaurant;
import java.math.BigDecimal;
import java.time.*;
import org.springframework.test.util.ReflectionTestUtils;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.enums.*;
public final class TestFixtures {
    private TestFixtures() { }
    public static final Instant NOW = Instant.parse("2026-10-22T10:00:00Z");
    public static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    public static <T> T id(T entity, Long id) { ReflectionTestUtils.setField(entity, "id", id); return entity; }
    public static Account account() { return id(new Account("Quản lý", "0900000002", "hash", Role.MANAGER), 2L); }
    public static DiningTable table(Long id, int capacity) { return id(new DiningTable(id(new DiningArea("Tầng 1"), 1L), "T" + id, capacity), id); }
    public static Reservation reservation(DiningTable table) { return id(new Reservation(table, account(), "Khách", "0910000001", 2, NOW, NOW.plusSeconds(7200), null, NOW), 1L); }
    public static Ingredient ingredient(Long id) { return id(new Ingredient("NVL " + id, "kg", BigDecimal.ONE, false, false), id); }
    public static MenuItem menu() { return id(new MenuItem("Phở bò", new BigDecimal("50000")), 1L); }
}
