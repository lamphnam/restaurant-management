/** Run using Spring Boot PropertiesLauncher; see the Phase 1 report for commands. */
public class PhaseOneQueryProbe {
    public static void main(String[] args) throws Exception {
        var spring = Class.forName("org.springframework.boot.SpringApplication");
        var application = Class.forName("vn.ueh.kltn.restaurant.RestaurantApplication");
        var context = spring.getMethod("run", Class.class, String[].class).invoke(null, application, new String[]{
                "--spring.profiles.active=local", "--server.port=0", "--app.seed=false",
                "--spring.jpa.properties.hibernate.generate_statistics=true", "--logging.level.root=ERROR"});
        var contextType = Class.forName("org.springframework.context.ConfigurableApplicationContext");
        try {
            var getBean = Class.forName("org.springframework.beans.factory.BeanFactory").getMethod("getBean", String.class);
            var emf = getBean.invoke(context, "entityManagerFactory");
            var factoryType = Class.forName("org.hibernate.SessionFactory");
            var factory = Class.forName("jakarta.persistence.EntityManagerFactory").getMethod("unwrap", Class.class).invoke(emf, factoryType);
            var stats = factoryType.getMethod("getStatistics").invoke(factory);
            var statsType = Class.forName("org.hibernate.stat.Statistics");
            statsType.getMethod("clear").invoke(stats);
            var service = getBean.invoke(context, "tableServiceImpl");
            var result = (java.util.List<?>) Class.forName("vn.ueh.kltn.restaurant.service.TableService").getMethod("floorPlan").invoke(service);
            long count = (long) statsType.getMethod("getPrepareStatementCount").invoke(stats);
            if (count != 3 || result.isEmpty()) throw new AssertionError("Expected 3 statements and a non-empty floor, got " + count);
            System.out.println("PASS floor-plan executes exactly 3 SQL statements on Neon; seed disabled, no DB writes.");
        } finally { contextType.getMethod("close").invoke(context); }
    }
}
