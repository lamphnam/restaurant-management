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

/** Read-only Phase 3 ledger evidence. Never updates rows or exposes connection settings. */
public class PhaseThreeDbCheck {
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
                            "service_session",
                            "invoice",
                            "ingredient",
                            "ingredient_lot",
                            "stock_receipt",
                            "stock_receipt_item",
                            "stocktake",
                            "stocktake_item",
                            "stock_movement")) {
                try (Statement statement = connection.createStatement();
                        ResultSet result =
                                statement.executeQuery("select count(*) from " + table)) {
                    result.next();
                    sections.add(quote(table) + ":" + result.getLong(1));
                }
            }
            List<String> movements = new ArrayList<>();
            try (Statement statement = connection.createStatement();
                    ResultSet result =
                            statement.executeQuery(
                                    """
                                    select m.id, m.movement_type, m.ingredient_id, m.quantity_change,
                                           m.receipt_item_id, m.stocktake_item_id, m.order_item_id
                                    from stock_movement m order by m.id
                                    """)) {
                while (result.next()) {
                    movements.add(
                            "{\"id\":"
                                    + result.getLong(1)
                                    + ",\"type\":"
                                    + quote(result.getString(2))
                                    + ",\"ingredientId\":"
                                    + result.getLong(3)
                                    + ",\"change\":"
                                    + result.getBigDecimal(4)
                                    + ",\"receiptItemId\":"
                                    + result.getObject(5)
                                    + ",\"stocktakeItemId\":"
                                    + result.getObject(6)
                                    + ",\"orderItemId\":"
                                    + result.getObject(7)
                                    + "}");
                }
            }
            System.out.println(
                    "{\"counts\":{"
                            + String.join(",", sections)
                            + "},\"movements\":["
                            + String.join(",", movements)
                            + "]}");
        }
    }

    private static String quote(String raw) {
        return "\"" + raw.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
