package vn.ueh.kltn.restaurant.seed;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.repository.*;
import vn.ueh.kltn.restaurant.service.ReservationService;
import static vn.ueh.kltn.restaurant.TestFixtures.CLOCK;
class PhaseOneSeederTest {
    @Test void independentMenuGateDoesNotDependOnExistingAccountsAndSecondRunDoesNotDuplicate() {
        var menu = mock(MenuItemRepository.class); var ingredients = mock(IngredientRepository.class);
        var recipes = mock(RecipeItemRepository.class); var reservations = mock(ReservationRepository.class);
        var accounts = mock(AccountRepository.class); var tables = mock(DiningTableRepository.class);
        when(menu.count()).thenReturn(0L, 10L); when(ingredients.count()).thenReturn(10L);
        when(recipes.count()).thenReturn(14L); when(reservations.count()).thenReturn(3L);
        var p = new AppProperties("Asia/Ho_Chi_Minh", true, new AppProperties.Jwt("x".repeat(40), 12), new AppProperties.Alert(3), new AppProperties.Reservation(60));
        var seeder = new PhaseOneSeeder(p, menu, ingredients, recipes, reservations, tables, accounts, mock(ReservationService.class), CLOCK);
        seeder.run(); seeder.run(); verify(menu, times(10)).save(any()); verifyNoInteractions(accounts, tables);
        verify(ingredients, never()).saveAll(any()); verify(recipes, never()).saveAll(any());
    }
}
