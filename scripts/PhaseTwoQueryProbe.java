import jakarta.persistence.EntityManagerFactory;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import vn.ueh.kltn.restaurant.RestaurantApplication;
import vn.ueh.kltn.restaurant.service.KitchenService;
import vn.ueh.kltn.restaurant.service.ServiceSessionService;

import java.util.function.Supplier;

/** Read-only query count probe; pass a session id obtained from the app/API. */
public class PhaseTwoQueryProbe {
    public static void main(String[] args) {
        try (ConfigurableApplicationContext context =
                SpringApplication.run(
                        RestaurantApplication.class,
                        "--spring.profiles.active=local",
                        "--server.port=0",
                        "--app.seed=false",
                        "--spring.jpa.properties.hibernate.generate_statistics=true",
                        "--logging.level.root=ERROR")) {
            Statistics stats =
                    context.getBean(EntityManagerFactory.class)
                            .unwrap(SessionFactory.class)
                            .getStatistics();
            ServiceSessionService sessions = context.getBean(ServiceSessionService.class);
            KitchenService kitchen = context.getBean(KitchenService.class);
            measure(stats, "session", () -> sessions.detail(Long.valueOf(args[0])), 2);
            measure(stats, "kitchen", kitchen::queue, 1);
            measure(stats, "awaiting-service", sessions::awaitingService, 1);
        }
    }

    private static void measure(Statistics stats, String name, Supplier<?> read, long expected) {
        stats.clear();
        read.get();
        long count = stats.getPrepareStatementCount();
        if (count != expected)
            throw new AssertionError(
                    name + " expected " + expected + " SQL statements; got " + count);
        System.out.println(
                "PASS "
                        + name
                        + ": "
                        + count
                        + " SQL statements on Neon; seed disabled, no writes.");
    }
}
