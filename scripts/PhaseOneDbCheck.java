import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Read-only QA snapshot. Usage: java -cp <pgjdbc.jar> scripts/PhaseOneDbCheck.java <local-yaml> [output-json] */
public class PhaseOneDbCheck {
    public static void main(String[] args) throws Exception {
        var settings = new HashMap<String, String>();
        for (var line : Files.readAllLines(Path.of(args[0]))) {
            int separator = line.indexOf(':');
            if (separator > 0) {
                var value = line.substring(separator + 1).trim();
                if (value.startsWith("\"") && value.endsWith("\"")) value = value.substring(1, value.length() - 1);
                settings.put(line.substring(0, separator), value);
            }
        }
        var properties = new Properties();
        properties.setProperty("user", settings.get("DB_USERNAME")); properties.setProperty("password", settings.get("DB_PASSWORD"));
        var counts = new LinkedHashMap<String, Long>();
        try (var connection = DriverManager.getConnection(settings.get("DB_URL"), properties)) {
            connection.setReadOnly(true);
            for (var table : List.of("account", "dining_area", "dining_table", "menu_item", "ingredient", "recipe_item", "reservation", "service_session", "food_order", "stock_movement")) {
                try (var statement = connection.createStatement(); var result = statement.executeQuery("select count(*) from " + table)) { result.next(); counts.put(table, result.getLong(1)); }
            }
            try (var statement = connection.createStatement(); var result = statement.executeQuery("""
                    select (select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name <> 'flyway_schema_history'),
                    (select count(*) from information_schema.columns where table_schema='public' and table_name <> 'flyway_schema_history'),
                    (select count(*) from pg_constraint where contype='f' and connamespace='public'::regnamespace and confdeltype='r'),
                    (select count(*) from pg_indexes where schemaname='public' and indexdef like '%UNIQUE%WHERE%'),
                    (select count(distinct menu_item_id) from recipe_item),
                    (select count(*) from ingredient where track_expiry)
                    """)) {
                result.next(); counts.put("domain_tables", result.getLong(1)); counts.put("domain_columns", result.getLong(2));
                counts.put("restrict_fks", result.getLong(3)); counts.put("partial_unique_indexes", result.getLong(4));
                counts.put("menus_with_recipe", result.getLong(5)); counts.put("expiry_ingredients", result.getLong(6));
                if (counts.get("domain_tables") != 18 || counts.get("domain_columns") != 106 || counts.get("restrict_fks") != 31 || counts.get("partial_unique_indexes") != 5) throw new AssertionError("Schema changed unexpectedly");
            }
        }
        var rows = counts.entrySet().stream().map(e -> "  \"" + e.getKey() + "\": " + e.getValue()).toList();
        var json = "{\n" + String.join(",\n", rows) + "\n}\n";
        if (args.length > 1) { var output = Path.of(args[1]); Files.createDirectories(output.toAbsolutePath().getParent()); Files.writeString(output, json); }
        System.out.print(json);
    }
}
