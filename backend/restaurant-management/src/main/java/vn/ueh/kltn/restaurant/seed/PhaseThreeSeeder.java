package vn.ueh.kltn.restaurant.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.entity.Ingredient;
import vn.ueh.kltn.restaurant.entity.IngredientLot;
import vn.ueh.kltn.restaurant.entity.StockMovement;
import vn.ueh.kltn.restaurant.entity.StockReceipt;
import vn.ueh.kltn.restaurant.entity.StockReceiptItem;
import vn.ueh.kltn.restaurant.entity.Stocktake;
import vn.ueh.kltn.restaurant.entity.StocktakeItem;
import vn.ueh.kltn.restaurant.enums.MovementType;
import vn.ueh.kltn.restaurant.enums.Role;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.IngredientLotRepository;
import vn.ueh.kltn.restaurant.repository.IngredientRepository;
import vn.ueh.kltn.restaurant.repository.StockMovementRepository;
import vn.ueh.kltn.restaurant.repository.StockReceiptItemRepository;
import vn.ueh.kltn.restaurant.repository.StockReceiptRepository;
import vn.ueh.kltn.restaurant.repository.StocktakeItemRepository;
import vn.ueh.kltn.restaurant.repository.StocktakeRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class PhaseThreeSeeder implements CommandLineRunner {

    private final AppProperties properties;
    private final AccountRepository accounts;
    private final IngredientRepository ingredients;
    private final IngredientLotRepository ingredientLots;
    private final StockMovementRepository stockMovements;
    private final StockReceiptRepository stockReceipts;
    private final StockReceiptItemRepository stockReceiptItems;
    private final StocktakeRepository stocktakes;
    private final StocktakeItemRepository stocktakeItems;
    private final Clock clock;

    @Override
    @Transactional
    public void run(String... args) {
        if (!properties.seed()) {
            return;
        }

        Account headChef =
                accounts.findAll().stream()
                        .filter(a -> a.getRole() == Role.HEAD_CHEF)
                        .findFirst()
                        .orElse(null);

        if (headChef == null) {
            log.warn("Bỏ qua seed kho Phase 3: chưa có tài khoản HEAD_CHEF");
            return;
        }

        Map<String, Ingredient> ingMap = new HashMap<>();
        ingredients.findAll().forEach(i -> ingMap.put(i.getName(), i));

        if (stockReceipts.count() == 0) {
            seedStockReceipt(headChef, ingMap);
        } else {
            log.info("Bỏ qua seed phiếu nhập kho: bảng stock_receipt đã có dữ liệu");
        }

        if (stocktakes.count() == 0) {
            seedStocktake(headChef, ingMap);
        } else {
            log.info("Bỏ qua seed kiểm kê kho: bảng stocktake đã có dữ liệu");
        }
    }

    private void seedStockReceipt(Account headChef, Map<String, Ingredient> ingMap) {
        ZoneId zone = ZoneId.of(properties.timezone());
        LocalDate today = LocalDate.now(clock.withZone(zone));
        Instant now = clock.instant();

        StockReceipt receipt = new StockReceipt(headChef, now);
        StockReceipt savedReceipt = stockReceipts.save(receipt);

        // 1. Thịt bò - Lot 1 (hết hạn 3 ngày trước)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Thịt bò"),
                headChef,
                new BigDecimal("5.000"),
                "LOT-TB-001",
                today.minusDays(3),
                now);

        // 2. Thịt bò - Lot 2 (sắp hết hạn trong 2 ngày)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Thịt bò"),
                headChef,
                new BigDecimal("10.000"),
                "LOT-TB-002",
                today.plusDays(2),
                now);

        // 3. Thịt heo - Lot 1 (còn 15 ngày)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Thịt heo"),
                headChef,
                new BigDecimal("15.000"),
                "LOT-TH-001",
                today.plusDays(15),
                now);

        // 4. Sữa đặc - Lot 1 (còn 30 ngày)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Sữa đặc"),
                headChef,
                new BigDecimal("20.000"),
                "LOT-SD-001",
                today.plusDays(30),
                now);

        // 5. Gạo (không theo dõi lô)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Gạo"),
                headChef,
                new BigDecimal("30.000"),
                null,
                null,
                now);

        // 6. Bánh phở
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Bánh phở"),
                headChef,
                new BigDecimal("10.000"),
                null,
                null,
                now);

        // 7. Bún
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Bún"),
                headChef,
                new BigDecimal("10.000"),
                null,
                null,
                now);

        // 8. Trứng
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Trứng"),
                headChef,
                new BigDecimal("50.000"),
                null,
                null,
                now);

        // 9. Cà phê - nhập ít (1.000 kg, trong khi minStock là 2.000 kg -> tồn thấp)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Cà phê"),
                headChef,
                new BigDecimal("1.000"),
                null,
                null,
                now);

        // 10. Rau thơm - nhập ít (0.500 kg, trong khi minStock là 1.000 kg -> tồn thấp)
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Rau thơm"),
                headChef,
                new BigDecimal("0.500"),
                null,
                null,
                now);

        // 11. Trà
        seedReceiptLine(
                savedReceipt,
                ingMap.get("Trà"),
                headChef,
                new BigDecimal("3.000"),
                null,
                null,
                now);

        log.info("Đã seed thành công phiếu nhập kho ban đầu ID: {}", savedReceipt.getId());
    }

    private void seedReceiptLine(
            StockReceipt receipt,
            Ingredient ingredient,
            Account actor,
            BigDecimal quantity,
            String lotNumber,
            LocalDate expiryDate,
            Instant occurredAt) {
        if (ingredient == null) {
            return;
        }

        IngredientLot lot = null;
        if (ingredient.isTrackLot() || ingredient.isTrackExpiry()) {
            lot = new IngredientLot(ingredient, lotNumber, expiryDate);
            lot = ingredientLots.save(lot);
        }

        StockReceiptItem item = new StockReceiptItem(ingredient, lot, quantity);
        receipt.addItem(item);
        StockReceiptItem savedItem = stockReceiptItems.save(item);

        StockMovement movement =
                new StockMovement(
                        ingredient,
                        lot,
                        savedItem,
                        null,
                        null,
                        actor,
                        MovementType.RECEIPT,
                        quantity,
                        null,
                        occurredAt);
        stockMovements.save(movement);
    }

    private void seedStocktake(Account headChef, Map<String, Ingredient> ingMap) {
        Instant now = clock.instant();
        Stocktake stocktake = new Stocktake(headChef, now);
        Stocktake savedStocktake = stocktakes.save(stocktake);

        for (Ingredient ing : ingMap.values()) {
            // D7: recompute current ledger sum
            BigDecimal systemQty = stockMovements.sumQuantityByIngredientId(ing.getId());

            BigDecimal actualQty = systemQty;
            String note = null;

            // Seed an adjustment on "Trứng" to demonstrate stocktake difference
            if ("Trứng".equals(ing.getName())) {
                actualQty = systemQty.subtract(new BigDecimal("2.000"));
                note = "Vỡ 2 quả trong quá trình bảo quản";
            }

            StocktakeItem item = new StocktakeItem(ing, systemQty, actualQty, note);
            savedStocktake.addItem(item);
            StocktakeItem savedItem = stocktakeItems.save(item);

            BigDecimal difference = item.calculateDifference();
            if (difference.compareTo(BigDecimal.ZERO) != 0) {
                StockMovement movement =
                        new StockMovement(
                                ing,
                                null,
                                null,
                                null,
                                savedItem,
                                headChef,
                                MovementType.STOCKTAKE_ADJUSTMENT,
                                difference,
                                note,
                                now);
                stockMovements.save(movement);
            }
        }

        log.info("Đã seed thành công phiếu kiểm kê ban đầu ID: {}", savedStocktake.getId());
    }
}
