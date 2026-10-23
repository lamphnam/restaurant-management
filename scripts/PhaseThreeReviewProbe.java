import jakarta.persistence.EntityManagerFactory;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import vn.ueh.kltn.restaurant.RestaurantApplication;
import vn.ueh.kltn.restaurant.dto.request.CreateIngredientRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStockDisposalRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStockReceiptRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStocktakeRequest;
import vn.ueh.kltn.restaurant.dto.request.StockReceiptItemRequest;
import vn.ueh.kltn.restaurant.dto.request.StocktakeItemRequest;
import vn.ueh.kltn.restaurant.dto.response.StocktakeResponse;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.enums.Role;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.StockMovementRepository;
import vn.ueh.kltn.restaurant.service.InventoryService;
import vn.ueh.kltn.restaurant.service.PaymentService;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

/** Live service/SQL checks. Writes only one prefixed QA ingredient and its inventory history. */
public class PhaseThreeReviewProbe {
    private static int checks;

    public static void main(String[] args) throws Exception {
        boolean writes = List.of(args).contains("--writes");
        if (writes && !"main".equals(System.getenv("PHASE1_QA_ALLOW_WRITES"))) {
            throw new IllegalStateException(
                    "Set PHASE1_QA_ALLOW_WRITES=main explicitly for live QA writes");
        }
        try (ConfigurableApplicationContext context =
                SpringApplication.run(
                        RestaurantApplication.class,
                        "--spring.profiles.active=local",
                        "--server.port=8080",
                        "--app.seed=false",
                        "--spring.jpa.properties.hibernate.generate_statistics=true",
                        "--logging.level.root=ERROR")) {
            InventoryService inventory = context.getBean(InventoryService.class);
            PaymentService payments = context.getBean(PaymentService.class);
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            Statistics statistics =
                    context.getBean(EntityManagerFactory.class)
                            .unwrap(SessionFactory.class)
                            .getStatistics();
            check(
                    context.getBeansOfType(InventoryService.class).size() == 1,
                    "one InventoryService bean");
            Map<String, Long> before = snapshot(jdbc);
            System.out.println("DB_BEFORE " + before);

            for (int size : List.of(1, 50)) {
                queryCount(
                        statistics,
                        "invoices size=" + size,
                        2,
                        () -> payments.listInvoices(null, null, null, 0, size));
                queryCount(
                        statistics,
                        "movements size=" + size,
                        2,
                        () -> inventory.listMovements(null, null, null, null, 0, size));
                queryCount(
                        statistics,
                        "receipts size=" + size,
                        3,
                        () -> inventory.listReceipts(null, null, 0, size));
                queryCount(
                        statistics,
                        "stocktakes size=" + size,
                        3,
                        () -> inventory.listStocktakes(null, null, 0, size));
            }

            if (writes) {
                Path root = Path.of("../..").toAbsolutePath().normalize();
                Process readiness =
                        new ProcessBuilder(
                                        "node",
                                        root.resolve("scripts/phase1-demo-readiness.mjs")
                                                .toString())
                                .directory(root.toFile())
                                .inheritIO()
                                .start();
                check(
                        readiness.waitFor(30, TimeUnit.SECONDS) && readiness.exitValue() == 0,
                        "read-only demo readiness before writes");
                Account chef =
                        context.getBean(AccountRepository.class).findAll().stream()
                                .filter(account -> account.getRole() == Role.HEAD_CHEF)
                                .findFirst()
                                .orElseThrow();
                Long existingId =
                        List.of(args).stream()
                                .filter(arg -> arg.startsWith("--ingredient-id="))
                                .map(
                                        arg ->
                                                Long.valueOf(
                                                        arg.substring("--ingredient-id=".length())))
                                .findFirst()
                                .orElse(null);
                long ingredientId;
                if (existingId == null) {
                    ingredientId =
                            inventory
                                    .createIngredient(
                                            new CreateIngredientRequest(
                                                    "[QA] Phase3 review "
                                                            + System.currentTimeMillis(),
                                                    "kg",
                                                    BigDecimal.ONE,
                                                    false,
                                                    false))
                                    .id();
                    inventory.createReceiptForSeed(
                            new CreateStockReceiptRequest(
                                    List.of(
                                            new StockReceiptItemRequest(
                                                    ingredientId, BigDecimal.TEN, null, null))),
                            chef);
                } else {
                    check(
                            inventory.listIngredients("[QA] Phase3 review", null, false).stream()
                                    .anyMatch(
                                            item ->
                                                    item.id().equals(existingId)
                                                            && item.name()
                                                                    .startsWith(
                                                                            "[QA] Phase3 review ")),
                            "resume uses only an existing review QA ingredient");
                    ingredientId = existingId;
                    inventory.activateIngredient(ingredientId);
                    inventory.createStocktakeForSeed(count(ingredientId, "10"), chef);
                }
                System.out.println("QA_INGREDIENT " + ingredientId);
                StockMovementRepository movements = context.getBean(StockMovementRepository.class);
                check(
                        movements.sumQuantityByIngredientId(ingredientId).compareTo(BigDecimal.TEN)
                                == 0,
                        "QA baseline gives 10 kg");

                expectError(
                        () ->
                                inventory.createStocktakeForSeed(
                                        new CreateStocktakeRequest(
                                                List.of(
                                                        new StocktakeItemRequest(
                                                                ingredientId, BigDecimal.ONE, null),
                                                        new StocktakeItemRequest(
                                                                ingredientId,
                                                                BigDecimal.TEN,
                                                                null))),
                                        chef),
                        ErrorCode.INVALID_STOCKTAKE);
                inventory.deactivateIngredient(ingredientId);
                expectError(
                        () -> inventory.createStocktakeForSeed(count(ingredientId, "8"), chef),
                        ErrorCode.INGREDIENT_INACTIVE);
                inventory.activateIngredient(ingredientId);
                check(
                        movements.sumQuantityByIngredientId(ingredientId).compareTo(BigDecimal.TEN)
                                == 0,
                        "rejected stocktakes do not change ledger");

                TransactionTemplate transaction =
                        new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
                transaction.setTimeout(25);
                try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
                    CountDownLatch held = new CountDownLatch(1), release = new CountDownLatch(1);
                    Future<StocktakeResponse> first =
                            executor.submit(
                                    () ->
                                            transaction.execute(
                                                    status -> {
                                                        StocktakeResponse result =
                                                                inventory.createStocktakeForSeed(
                                                                        count(ingredientId, "8"),
                                                                        chef);
                                                        held.countDown();
                                                        await(release);
                                                        return result;
                                                    }));
                    try {
                        await(held);
                        Future<StocktakeResponse> second =
                                executor.submit(
                                        () ->
                                                inventory.createStocktakeForSeed(
                                                        count(ingredientId, "8"), chef));
                        blocked(second, "second stocktake waits for first transaction");
                        release.countDown();
                        check(
                                first.get(20, TimeUnit.SECONDS)
                                                .items()
                                                .get(0)
                                                .difference()
                                                .compareTo(new BigDecimal("-2"))
                                        == 0,
                                "first stocktake adjusts -2");
                        StocktakeResponse result = second.get(20, TimeUnit.SECONDS);
                        check(
                                result.items()
                                                        .get(0)
                                                        .systemQuantity()
                                                        .compareTo(new BigDecimal("8"))
                                                == 0
                                        && result.items().get(0).difference().signum() == 0,
                                "second stocktake rereads committed stock and creates no"
                                    + " adjustment");
                    } finally {
                        release.countDown();
                    }

                    CountDownLatch disposalHeld = new CountDownLatch(1),
                            disposalRelease = new CountDownLatch(1);
                    Future<?> disposal =
                            executor.submit(
                                    () -> {
                                        Jwt jwt =
                                                Jwt.withTokenValue("qa-in-process")
                                                        .header("alg", "HS256")
                                                        .subject(chef.getId().toString())
                                                        .claim("role", "HEAD_CHEF")
                                                        .build();
                                        SecurityContextHolder.getContext()
                                                .setAuthentication(
                                                        new JwtAuthenticationToken(
                                                                jwt,
                                                                List.of(
                                                                        new SimpleGrantedAuthority(
                                                                                "ROLE_HEAD_CHEF"))));
                                        try {
                                            return transaction.execute(
                                                    status -> {
                                                        inventory.createDisposal(
                                                                new CreateStockDisposalRequest(
                                                                        ingredientId,
                                                                        null,
                                                                        new BigDecimal("3"),
                                                                        "[QA] Phase3 review lock"));
                                                        disposalHeld.countDown();
                                                        await(disposalRelease);
                                                        return null;
                                                    });
                                        } finally {
                                            SecurityContextHolder.clearContext();
                                        }
                                    });
                    try {
                        await(disposalHeld);
                        Future<StocktakeResponse> afterDisposal =
                                executor.submit(
                                        () ->
                                                inventory.createStocktakeForSeed(
                                                        count(ingredientId, "8"), chef));
                        blocked(afterDisposal, "stocktake waits for disposal transaction");
                        disposalRelease.countDown();
                        disposal.get(20, TimeUnit.SECONDS);
                        StocktakeResponse result = afterDisposal.get(20, TimeUnit.SECONDS);
                        check(
                                result.items()
                                                .get(0)
                                                .systemQuantity()
                                                .compareTo(new BigDecimal("5"))
                                        == 0,
                                "stocktake sees disposal committed balance 5");
                        check(
                                result.items().get(0).difference().compareTo(new BigDecimal("3"))
                                        == 0,
                                "stocktake restores counted 8 with adjustment +3");
                    } finally {
                        disposalRelease.countDown();
                    }
                }
                check(
                        movements
                                        .sumQuantityByIngredientId(ingredientId)
                                        .compareTo(new BigDecimal("8"))
                                == 0,
                        "final QA stock equals counted 8");
                inventory.deactivateIngredient(ingredientId);
            }
            Map<String, Long> after = snapshot(jdbc);
            System.out.println("DB_AFTER " + after);
            if (!writes) check(before.equals(after), "read-only probe preserves row counts");
            System.out.println(
                    "PASS " + checks + " live checks; seed disabled; no reset or history deletion");
        }
    }

    private static CreateStocktakeRequest count(long id, String actual) {
        return new CreateStocktakeRequest(
                List.of(
                        new StocktakeItemRequest(
                                id, new BigDecimal(actual), "[QA] Phase3 review")));
    }

    private static void queryCount(Statistics statistics, String label, int max, Supplier<?> read) {
        statistics.clear();
        read.get();
        long count = statistics.getPrepareStatementCount();
        check(count <= max, label + " SQL=" + count + " (max " + max + ")");
    }

    private static void expectError(Runnable action, ErrorCode expected) {
        try {
            action.run();
            throw new AssertionError("Expected " + expected);
        } catch (BusinessException exception) {
            check(exception.getErrorCode() == expected, "rejects " + expected);
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(15, TimeUnit.SECONDS))
                throw new AssertionError("Transaction latch timed out");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private static void blocked(Future<?> future, String label) throws Exception {
        try {
            future.get(500, TimeUnit.MILLISECONDS);
            throw new AssertionError("Did not block: " + label);
        } catch (TimeoutException expected) {
            check(true, label);
        }
    }

    private static Map<String, Long> snapshot(JdbcTemplate jdbc) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table :
                List.of(
                        "ingredient",
                        "ingredient_lot",
                        "stock_receipt",
                        "stock_receipt_item",
                        "stocktake",
                        "stocktake_item",
                        "stock_movement",
                        "invoice",
                        "service_session")) {
            counts.put(table, jdbc.queryForObject("select count(*) from " + table, Long.class));
        }
        return counts;
    }

    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
        checks++;
        System.out.println("PASS " + label);
    }
}
