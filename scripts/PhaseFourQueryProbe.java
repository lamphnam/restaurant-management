import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.ueh.kltn.restaurant.RestaurantApplication;
import vn.ueh.kltn.restaurant.dto.response.RevenueSummaryResponse;
import vn.ueh.kltn.restaurant.dto.response.TopMenuItemResponse;
import vn.ueh.kltn.restaurant.dto.response.DailyRevenueResponse;
import vn.ueh.kltn.restaurant.repository.InvoiceRepository;
import vn.ueh.kltn.restaurant.repository.OrderItemRepository;
import vn.ueh.kltn.restaurant.enums.OrderItemStatus;
import org.springframework.data.domain.PageRequest;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.ZoneId;
import vn.ueh.kltn.restaurant.enums.PaymentMethod;
import java.util.ArrayList;
import java.util.TreeMap;
import vn.ueh.kltn.restaurant.service.InventoryService;
import vn.ueh.kltn.restaurant.service.PaymentService;
import vn.ueh.kltn.restaurant.service.ReconciliationService;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import vn.ueh.kltn.restaurant.dto.request.CreateStocktakeRequest;
import vn.ueh.kltn.restaurant.dto.request.StocktakeItemRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStockDisposalRequest;
import vn.ueh.kltn.restaurant.dto.response.StocktakeResponse;
import vn.ueh.kltn.restaurant.dto.response.ReconciliationResponse;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.enums.Role;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.repository.AccountRepository;

/** Read-only real Neon query checks; no synthetic Invoice or historical timestamp changes. */
public class PhaseFourQueryProbe {
    private static int checks;

    public static void main(String[] args) {
        boolean writes = List.of(args).contains("--writes");
        if (writes && !"main".equals(System.getenv("PHASE1_QA_ALLOW_WRITES"))) {
            throw new IllegalStateException("Live QA writes require PHASE1_QA_ALLOW_WRITES=main");
        }
        try (ConfigurableApplicationContext context = SpringApplication.run(RestaurantApplication.class,
                "--spring.profiles.active=local", "--server.port=0", "--app.seed=false",
                "--spring.main.banner-mode=off", "--logging.level.root=ERROR",
                "--spring.jpa.properties.hibernate.generate_statistics=true")) {
            PaymentService payments = context.getBean(PaymentService.class);
            InventoryService inventory = context.getBean(InventoryService.class);
            ReconciliationService reconciliations = context.getBean(ReconciliationService.class);
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            Statistics stats = context.getBean(EntityManagerFactory.class).unwrap(SessionFactory.class).getStatistics();
            Map<String, Long> before = snapshot(jdbc);
            System.out.println("DB_BEFORE " + before);
            check(jdbc.queryForObject("select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name <> 'flyway_schema_history'", Long.class) == 18, "18 domain tables");
            Instant from = Instant.parse("2000-01-01T00:00:00Z");
            Instant to = Instant.parse("2100-01-01T00:00:00Z");
            compareRevenue(jdbc, payments, from, to);
            List<Instant> paidTimes = jdbc.query("select distinct paid_at from invoice order by paid_at", (row, n) -> row.getTimestamp(1).toInstant());
            check(!paidTimes.isEmpty(), "existing real invoices available for exact boundaries");
            for (Instant paidAt : paidTimes) {
                compareRevenue(jdbc, payments, paidAt, paidAt.plusNanos(1000));
                compareRevenue(jdbc, payments, paidAt.minusNanos(1000), paidAt);
            }
            RevenueSummaryResponse empty = payments.summarizeRevenue(Instant.EPOCH, Instant.EPOCH.plusSeconds(1));
            check(empty.invoiceCount() == 0 && empty.systemRevenue().signum() == 0 && empty.methods().size() == 2, "empty period returns zeros and both methods");
            List<TopMenuItemResponse> expected = jdbc.query("""
                    select i.menu_item_id, m.name, sum(i.quantity), sum(i.quantity * i.unit_price_at_order)
                    from order_item i join food_order o on o.id=i.order_id join menu_item m on m.id=i.menu_item_id
                    where i.status not in ('CANCELLED','UNAVAILABLE') and exists
                    (select 1 from invoice v where v.session_id=o.session_id and v.paid_at>=? and v.paid_at<?)
                    group by i.menu_item_id,m.name order by sum(i.quantity) desc,i.menu_item_id
                    """, (row, n) -> new TopMenuItemResponse(row.getLong(1), row.getString(2), row.getLong(3), row.getBigDecimal(4)), Timestamp.from(from), Timestamp.from(to));
            check(payments.summary(from, to).topItems().equals(expected.stream().limit(10).toList()), "top10 quantity/status/Invoice.paidAt/snapshot match SQL independently");
            OrderItemRepository items = context.getBean(OrderItemRepository.class);
            check(items.summarizeTopItems(from, to, OrderItemStatus.NON_BILLABLE, PageRequest.of(0, 1)).equals(expected.stream().limit(1).toList()), "top query applies requested limit1 in SQL");
            check(items.summarizeTopItems(from, to, OrderItemStatus.NON_BILLABLE, PageRequest.of(1, 1)).equals(expected.stream().skip(1).limit(1).toList()), "top query honors offset and stable ordering");
            Clock clock = context.getBean(Clock.class);
            LocalDate today = clock.instant().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
            long elapsedDays = ChronoUnit.DAYS.between(from.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate(), today) + 1;
            check(payments.summary(from, to).analysis().calendarDays() == elapsedDays, "summary average excludes future calendar days");
            Instant futureStart = today.plusMonths(2).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            check(payments.summary(futureStart, futureStart.plusSeconds(86400)).analysis().calendarDays() == 0
                    && payments.summary(futureStart, futureStart.plusSeconds(86400)).analysis().averageDailyRevenue().signum() == 0,
                    "future-only report has zero days and average");
            try {
                reconciliations.preview(from, clock.instant().plusSeconds(3600));
                throw new AssertionError("future preview must be rejected");
            } catch (BusinessException error) {
                check(error.getErrorCode() == ErrorCode.INVALID_INPUT, "real reconciliation preview rejects future end");
            }
            checkDailyRevenue(jdbc, context.getBean(InvoiceRepository.class), payments, from, to);
            queryCount(stats, "revenue preview", 1, () -> payments.summarizeRevenue(from, to));
            queryCount(stats, "summary", 3, () -> payments.summary(from, to));
            for (int size : List.of(1, 50)) {
                queryCount(stats, "reconciliations size=" + size, 2, () -> reconciliations.list(null, 0, size));
                queryCount(stats, "invoices size=" + size, 2, () -> payments.listInvoices(null, null, null, 0, size));
                queryCount(stats, "movements size=" + size, 2, () -> inventory.listMovements(null, null, null, null, 0, size));
                queryCount(stats, "receipts size=" + size, 3, () -> inventory.listReceipts(null, null, 0, size));
                queryCount(stats, "stocktakes size=" + size, 3, () -> inventory.listStocktakes(null, null, 0, size));
            }
            if (writes) checkTransactions(context, inventory, reconciliations, args);
            Map<String, Long> after = snapshot(jdbc);
            if (!writes) check(before.equals(after), "read-only probe and seed=false preserve all row counts");
            System.out.println("DB_AFTER " + after);
            System.out.println("CHECKS " + checks);
        }
    }

    private record PaidInvoice(Instant paidAt, BigDecimal amount, String method) {}

    private static void checkDailyRevenue(JdbcTemplate jdbc, InvoiceRepository invoices,
            PaymentService payments, Instant from, Instant to) {
        List<PaidInvoice> paid = jdbc.query("select paid_at,amount,payment_method from invoice where paid_at>=? and paid_at<?",
                (row, n) -> new PaidInvoice(row.getTimestamp(1).toInstant(), row.getBigDecimal(2), row.getString(3)),
                Timestamp.from(from), Timestamp.from(to));
        for (String timezone : List.of("Asia/Ho_Chi_Minh", "America/Los_Angeles")) {
            Map<String, List<PaidInvoice>> groups = new TreeMap<>();
            for (PaidInvoice invoice : paid) {
                String date = invoice.paidAt().atZone(ZoneId.of(timezone)).toLocalDate().toString();
                groups.computeIfAbsent(date, ignored -> new ArrayList<>()).add(invoice);
            }
            List<DailyRevenueResponse> expected = new ArrayList<>();
            groups.forEach((date, rows) -> expected.add(new DailyRevenueResponse(date, rows.size(),
                    rows.stream().map(PaidInvoice::amount).reduce(BigDecimal.ZERO, BigDecimal::add),
                    rows.stream().filter(row -> row.method().equals("CASH")).map(PaidInvoice::amount).reduce(BigDecimal.ZERO, BigDecimal::add),
                    rows.stream().filter(row -> row.method().equals("BANK_TRANSFER")).map(PaidInvoice::amount).reduce(BigDecimal.ZERO, BigDecimal::add))));
            check(invoices.summarizeDailyRevenue(from, to, timezone, PaymentMethod.CASH.name(), PaymentMethod.BANK_TRANSFER.name()).equals(expected), "daily native projection matches raw invoices grouped by Java timezone " + timezone);
            if (timezone.equals("Asia/Ho_Chi_Minh")) {
                check(payments.summary(from, to).dailyRevenue().equals(expected), "summary daily rows use configured Vietnam timezone");
            }
        }
        for (PaidInvoice invoice : paid) {
            Instant exact = invoice.paidAt();
            List<DailyRevenueResponse> included = invoices.summarizeDailyRevenue(exact, exact.plusNanos(1000), "Asia/Ho_Chi_Minh", PaymentMethod.CASH.name(), PaymentMethod.BANK_TRANSFER.name());
            check(included.stream().mapToLong(DailyRevenueResponse::invoiceCount).sum() >= 1, "daily aggregate includes paidAt exactly at start");
            List<DailyRevenueResponse> excluded = invoices.summarizeDailyRevenue(exact.minusNanos(1000), exact, "Asia/Ho_Chi_Minh", PaymentMethod.CASH.name(), PaymentMethod.BANK_TRANSFER.name());
            long expectedCount = paid.stream().filter(row -> !row.paidAt().isBefore(exact.minusNanos(1000)) && row.paidAt().isBefore(exact)).count();
            check(excluded.stream().mapToLong(DailyRevenueResponse::invoiceCount).sum() == expectedCount, "daily aggregate excludes paidAt exactly at end");
        }
    }

    private static void checkTransactions(ConfigurableApplicationContext context, InventoryService inventory,
            ReconciliationService reconciliations, String[] args) {
        long ingredientId = argument(args, "--ingredient-id=");
        long reconciliationId = argument(args, "--reconciliation-id=");
        check(inventory.listIngredients("[QA] Phase4 ", null, false).stream().anyMatch(item -> item.id() == ingredientId && item.name().startsWith("[QA] Phase4 ")),
                "write probe reuses verified Phase4 QA ingredient");
        ReconciliationResponse initial = reconciliations.list(false, 0, 100).items().stream()
                .filter(item -> item.id() == reconciliationId).findFirst().orElseThrow();
        check(initial.startTime().equals(Instant.parse("2000-01-01T00:00:00Z")) && initial.endTime().equals(Instant.parse("2100-01-01T00:00:00Z")), "verified QA reconciliation from run manifest");
        Account manager = context.getBean(AccountRepository.class).findAll().stream().filter(account -> account.getRole() == Role.MANAGER).findFirst().orElseThrow();
        Account chef = context.getBean(AccountRepository.class).findAll().stream().filter(account -> account.getRole() == Role.HEAD_CHEF).findFirst().orElseThrow();
        TransactionTemplate tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        tx.setTimeout(20);
        try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
            CountDownLatch locked = new CountDownLatch(1), release = new CountDownLatch(1);
            Future<ReconciliationResponse> first = workers.submit(() -> as(manager, () -> tx.execute(status -> {
                ReconciliationResponse response = reconciliations.confirm(reconciliationId);
                locked.countDown(); await(release); return response;
            })));
            try {
                await(locked);
                Future<ErrorCode> second = workers.submit(() -> as(manager, () -> {
                    try { reconciliations.confirm(reconciliationId); return null; }
                    catch (BusinessException error) { return error.getErrorCode(); }
                }));
                blocked(second, "confirm waits while first transaction holds reconciliation lock");
                release.countDown();
                ReconciliationResponse confirmed = first.get(15, TimeUnit.SECONDS);
                check(second.get(15, TimeUnit.SECONDS) == ErrorCode.INVALID_STATE, "waiting confirm rereads manager and returns 409");
                check(confirmed.reconciledAt().equals(initial.reconciledAt()) && confirmed.systemRevenue().equals(initial.systemRevenue())
                        && confirmed.actualAmount().equals(initial.actualAmount()), "held-lock confirm preserves audit and snapshot");
            } finally { release.countDown(); }

            inventory.activateIngredient(ingredientId);
            as(chef, () -> inventory.createStocktake(count(ingredientId, "10")));
            CountDownLatch stockHeld = new CountDownLatch(1), stockRelease = new CountDownLatch(1);
            Future<StocktakeResponse> stockA = workers.submit(() -> as(chef, () -> tx.execute(status -> {
                StocktakeResponse response = inventory.createStocktake(count(ingredientId, "8"));
                stockHeld.countDown(); await(stockRelease); return response;
            })));
            try {
                await(stockHeld);
                Future<StocktakeResponse> stockB = workers.submit(() -> as(chef, () -> inventory.createStocktake(count(ingredientId, "8"))));
                blocked(stockB, "stocktake waits for prior Ingredient lock");
                stockRelease.countDown();
                check(stockA.get(15, TimeUnit.SECONDS).items().getFirst().difference().compareTo(new BigDecimal("-2")) == 0, "first counted 8 adjusts -2");
                StocktakeResponse second = stockB.get(15, TimeUnit.SECONDS);
                check(second.items().getFirst().systemQuantity().compareTo(new BigDecimal("8")) == 0 && second.items().getFirst().difference().signum() == 0,
                        "waiting stocktake sees committed 8 and adds no movement");
            } finally { stockRelease.countDown(); }

            CountDownLatch disposalHeld = new CountDownLatch(1), disposalRelease = new CountDownLatch(1);
            Future<?> disposal = workers.submit(() -> as(chef, () -> tx.execute(status -> {
                inventory.createDisposal(new CreateStockDisposalRequest(ingredientId, null, new BigDecimal("3"), "[QA] Phase4 lock regression"));
                disposalHeld.countDown(); await(disposalRelease); return null;
            })));
            try {
                await(disposalHeld);
                Future<StocktakeResponse> stock = workers.submit(() -> as(chef, () -> inventory.createStocktake(count(ingredientId, "8"))));
                blocked(stock, "stocktake shares Ingredient lock with disposal");
                disposalRelease.countDown(); disposal.get(15, TimeUnit.SECONDS);
                StocktakeResponse response = stock.get(15, TimeUnit.SECONDS);
                check(response.items().getFirst().systemQuantity().compareTo(new BigDecimal("5")) == 0 && response.items().getFirst().difference().compareTo(new BigDecimal("3")) == 0,
                        "waiting count sees disposal balance 5 then adjusts +3");
            } finally { disposalRelease.countDown(); }
        } catch (Exception error) { throw new IllegalStateException("QA transaction probe failed", error); }
        finally {
            as(chef, () -> inventory.createStocktake(count(ingredientId, "0")));
            inventory.deactivateIngredient(ingredientId);
        }
    }

    private static long argument(String[] args, String prefix) {
        return List.of(args).stream().filter(value -> value.startsWith(prefix)).mapToLong(value -> Long.parseLong(value.substring(prefix.length()))).findFirst().orElseThrow();
    }

    private static CreateStocktakeRequest count(long id, String value) {
        return new CreateStocktakeRequest(List.of(new StocktakeItemRequest(id, new BigDecimal(value), "[QA] Phase4 lock regression")));
    }

    private static <T> T as(Account actor, Supplier<T> operation) {
        Jwt jwt = Jwt.withTokenValue("qa-in-process").header("alg", "HS256").subject(actor.getId().toString()).claim("role", actor.getRole().name()).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + actor.getRole().name()))));
        try { return operation.get(); } finally { SecurityContextHolder.clearContext(); }
    }

    private static void await(CountDownLatch latch) {
        try { if (!latch.await(12, TimeUnit.SECONDS)) throw new AssertionError("QA lock latch timed out"); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IllegalStateException(error); }
    }

    private static void blocked(Future<?> future, String label) throws Exception {
        try { future.get(500, TimeUnit.MILLISECONDS); throw new AssertionError("Did not block: " + label); }
        catch (TimeoutException expected) { check(true, label); }
    }

    private static void compareRevenue(JdbcTemplate jdbc, PaymentService payments, Instant from, Instant to) {
        RevenueSummaryResponse response = payments.summarizeRevenue(from, to);
        BigDecimal total = jdbc.queryForObject("select coalesce(sum(amount),0) from invoice where paid_at>=? and paid_at<?", BigDecimal.class, Timestamp.from(from), Timestamp.from(to));
        Long count = jdbc.queryForObject("select count(*) from invoice where paid_at>=? and paid_at<?", Long.class, Timestamp.from(from), Timestamp.from(to));
        check(response.systemRevenue().compareTo(total) == 0 && response.invoiceCount() == count,
                "Invoice revenue/count exact [" + from + "," + to + ")");
        check(response.methods().stream().map(method -> method.revenue()).reduce(BigDecimal.ZERO, BigDecimal::add).compareTo(total) == 0,
                "breakdown equals total for exact interval");
    }

    private static void queryCount(Statistics stats, String label, long maximum, Supplier<?> call) {
        stats.clear();
        call.get();
        long actual = stats.getPrepareStatementCount();
        check(actual <= maximum, label + " SQL=" + actual + " <= " + maximum);
    }

    private static Map<String, Long> snapshot(JdbcTemplate jdbc) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table : List.of("account", "reservation", "service_session", "food_order", "order_item", "invoice", "revenue_reconciliation", "ingredient", "ingredient_lot", "stock_receipt", "stock_receipt_item", "stocktake", "stocktake_item", "stock_movement")) {
            counts.put(table, jdbc.queryForObject("select count(*) from " + table, Long.class));
        }
        return counts;
    }

    private static void check(boolean valid, String label) {
        if (!valid) throw new AssertionError(label);
        checks++;
        System.out.println("PASS " + label);
    }
}
