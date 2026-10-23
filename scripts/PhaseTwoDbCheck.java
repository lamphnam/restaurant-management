import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/** Read-only Phase 2 ledger evidence. Never updates rows or exposes connection settings. */
public class PhaseTwoDbCheck {
    public static void main(String[] args) throws Exception {
        Map<String, String> settings = new HashMap<>();
        for (String line : Files.readAllLines(Path.of(args[0]))) {
            int separator = line.indexOf(':');
            if (separator > 0) {
                String value = line.substring(separator + 1).trim();
                if (value.startsWith("\"") && value.endsWith("\"")) {
                    value = value.substring(1, value.length() - 1);
                }
                settings.put(line.substring(0, separator), value);
            }
        }
        var properties = new Properties();
        properties.setProperty("user", settings.get("DB_USERNAME"));
        properties.setProperty("password", settings.get("DB_PASSWORD"));
        try (Connection connection =
                DriverManager.getConnection(settings.get("DB_URL"), properties)) {
            connection.setReadOnly(true);
            List<String> sections = new ArrayList<>();
            for (String table :
                    List.of(
                            "food_order",
                            "order_item",
                            "stock_movement",
                            "service_session",
                            "invoice")) {
                try (Statement statement = connection.createStatement();
                        ResultSet result =
                                statement.executeQuery("select count(*) from " + table)) {
                    result.next();
                    sections.add(quote(table) + ":" + result.getLong(1));
                }
            }
            List<String> rows = new ArrayList<>();
            try (Statement statement = connection.createStatement();
                    ResultSet result =
                            statement.executeQuery(
                                    """
                                    select m.id, m.order_item_id, m.ingredient_id, m.quantity_change, m.movement_type,
                                           m.performed_by_id, m.occurred_at, m.lot_id, m.receipt_item_id, m.stocktake_item_id
                                    from stock_movement m order by m.id
                                    """)) {
                while (result.next()) {
                    rows.add(
                            "{\"id\":"
                                    + result.getLong(1)
                                    + ",\"orderItemId\":"
                                    + result.getLong(2)
                                    + ",\"ingredientId\":"
                                    + result.getLong(3)
                                    + ",\"quantityChange\":"
                                    + result.getBigDecimal(4)
                                    + ",\"movementType\":"
                                    + quote(result.getString(5))
                                    + ",\"performedById\":"
                                    + result.getLong(6)
                                    + ",\"occurredAt\":"
                                    + quote(result.getTimestamp(7).toInstant().toString())
                                    + ",\"lotId\":"
                                    + result.getObject(8)
                                    + ",\"receiptItemId\":"
                                    + result.getObject(9)
                                    + ",\"stocktakeItemId\":"
                                    + result.getObject(10)
                                    + "}");
                }
            }
            sections.add("\"movements\":[" + String.join(",", rows) + "]");
            System.out.println("{" + String.join(",", sections) + "}");
        }
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
