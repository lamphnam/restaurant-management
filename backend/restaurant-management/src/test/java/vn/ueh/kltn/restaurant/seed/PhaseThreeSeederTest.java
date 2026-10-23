package vn.ueh.kltn.restaurant.seed;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import static vn.ueh.kltn.restaurant.TestFixtures.CLOCK;
import static vn.ueh.kltn.restaurant.TestFixtures.account;
import static vn.ueh.kltn.restaurant.TestFixtures.id;

import org.junit.jupiter.api.Test;

import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.entity.Ingredient;
import vn.ueh.kltn.restaurant.entity.StockReceipt;
import vn.ueh.kltn.restaurant.entity.Stocktake;
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
import java.util.List;

class PhaseThreeSeederTest {

    @Test
    void seederGatesRunIndependentlyAndSecondRunDoesNotDuplicate() {
        AccountRepository accounts = mock(AccountRepository.class);
        IngredientRepository ingredients = mock(IngredientRepository.class);
        IngredientLotRepository ingredientLots = mock(IngredientLotRepository.class);
        StockMovementRepository stockMovements = mock(StockMovementRepository.class);
        StockReceiptRepository stockReceipts = mock(StockReceiptRepository.class);
        StockReceiptItemRepository stockReceiptItems = mock(StockReceiptItemRepository.class);
        StocktakeRepository stocktakes = mock(StocktakeRepository.class);
        StocktakeItemRepository stocktakeItems = mock(StocktakeItemRepository.class);

        Account headChef = id(new Account("Bếp Trưởng", "0900000006", "hash", Role.HEAD_CHEF), 6L);
        when(accounts.findAll()).thenReturn(List.of(headChef));

        Ingredient thitBo =
                id(new Ingredient("Thịt bò", "kg", new BigDecimal("2"), true, true), 1L);
        Ingredient rauThom =
                id(new Ingredient("Rau thơm", "kg", new BigDecimal("1"), false, false), 2L);
        Ingredient trung =
                id(new Ingredient("Trứng", "quả", new BigDecimal("10"), false, false), 3L);
        when(ingredients.findAll()).thenReturn(List.of(thitBo, rauThom, trung));

        // First run: count == 0; second run: count > 0
        when(stockReceipts.count()).thenReturn(0L, 1L);
        when(stocktakes.count()).thenReturn(0L, 1L);

        when(stockReceipts.save(any(StockReceipt.class)))
                .thenAnswer(inv -> id(inv.getArgument(0), 10L));
        when(stocktakes.save(any(Stocktake.class)))
                .thenAnswer(inv -> id(inv.getArgument(0), 20L));
        when(stockMovements.sumQuantityByIngredientId(any())).thenReturn(new BigDecimal("50.000"));

        var properties =
                new AppProperties(
                        "Asia/Ho_Chi_Minh",
                        true,
                        new AppProperties.Jwt("test-secret-for-phase-three-only-32", 12),
                        new AppProperties.Alert(7),
                        new AppProperties.Reservation(60));

        var seeder =
                new PhaseThreeSeeder(
                        properties,
                        accounts,
                        ingredients,
                        ingredientLots,
                        stockMovements,
                        stockReceipts,
                        stockReceiptItems,
                        stocktakes,
                        stocktakeItems,
                        CLOCK);

        // Run 1: seeds
        seeder.run();

        // Run 2: skips (does not duplicate)
        seeder.run();

        verify(stockReceipts, times(1)).save(any(StockReceipt.class));
        verify(stocktakes, times(1)).save(any(Stocktake.class));
    }

    @Test
    void seederDoesNothingWhenSeedDisabled() {
        StockReceiptRepository stockReceipts = mock(StockReceiptRepository.class);
        StocktakeRepository stocktakes = mock(StocktakeRepository.class);

        var properties =
                new AppProperties(
                        "Asia/Ho_Chi_Minh",
                        false, // seed disabled!
                        new AppProperties.Jwt("test-secret-for-phase-three-only-32", 12),
                        new AppProperties.Alert(7),
                        new AppProperties.Reservation(60));

        var seeder =
                new PhaseThreeSeeder(
                        properties,
                        mock(AccountRepository.class),
                        mock(IngredientRepository.class),
                        mock(IngredientLotRepository.class),
                        mock(StockMovementRepository.class),
                        stockReceipts,
                        mock(StockReceiptItemRepository.class),
                        stocktakes,
                        mock(StocktakeItemRepository.class),
                        CLOCK);

        seeder.run();

        verify(stockReceipts, never()).count();
        verify(stocktakes, never()).count();
    }
}
