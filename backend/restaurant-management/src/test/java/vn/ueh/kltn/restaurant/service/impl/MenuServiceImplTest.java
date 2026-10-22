package vn.ueh.kltn.restaurant.service.impl;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.ueh.kltn.restaurant.TestFixtures.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.ueh.kltn.restaurant.dto.request.*;
import vn.ueh.kltn.restaurant.entity.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.repository.*;
class MenuServiceImplTest {
    private final MenuItemRepository menus = mock(MenuItemRepository.class);
    private final RecipeItemRepository recipes = mock(RecipeItemRepository.class);
    private final IngredientRepository ingredients = mock(IngredientRepository.class);
    private MenuServiceImpl service;
    private final MenuItem menu = menu();
    @BeforeEach void setup() { service = new MenuServiceImpl(menus, recipes, ingredients); when(menus.findById(1L)).thenReturn(Optional.of(menu)); }
    private RecipeLineRequest line(Long id, String quantity) { return new RecipeLineRequest(id, new BigDecimal(quantity)); }
    @Test void diffDeletesUpdatesAndAddsWithoutReinsertingRetainedKey() {
        var keptIngredient = ingredient(1L); var removedIngredient = ingredient(2L); var addedIngredient = ingredient(3L);
        var kept = new RecipeItem(menu, keptIngredient, BigDecimal.ONE); var removed = new RecipeItem(menu, removedIngredient, BigDecimal.ONE);
        when(recipes.findByMenuItemId(1L)).thenReturn(List.of(kept, removed));
        when(ingredients.findAllById(any())).thenReturn(List.of(keptIngredient, addedIngredient));
        var result = service.saveRecipe(1L, new SaveRecipeRequest(List.of(line(1L, "0.250"), line(3L, "0.500"))));
        assertEquals(new BigDecimal("0.250"), kept.getQuantityPerServing()); assertEquals(2, result.size());
        verify(recipes).deleteAll(List.of(removed));
        verify(recipes).saveAll(argThat(lines -> { var all = new ArrayList<RecipeItem>(); lines.forEach(all::add); return all.size() == 1 && all.getFirst().getIngredient().getId().equals(3L); }));
        verify(recipes).flush();
    }
    @Test void emptyLinesRemoveAll() {
        var old = new RecipeItem(menu, ingredient(1L), BigDecimal.ONE); when(recipes.findByMenuItemId(1L)).thenReturn(List.of(old));
        assertTrue(service.saveRecipe(1L, new SaveRecipeRequest(List.of())).isEmpty()); verify(recipes).deleteAll(List.of(old));
    }
    @Test void duplicateIngredientIs400() {
        var failure = assertThrows(BusinessException.class, () -> service.saveRecipe(1L, new SaveRecipeRequest(List.of(line(1L, "1"), line(1L, "2")))));
        assertEquals(ErrorCode.DUPLICATE_RECIPE_INGREDIENT, failure.getErrorCode()); verify(recipes, never()).deleteAll(any());
    }
    @Test void inactiveIngredientIs400() {
        var i = ingredient(1L); i.deactivate(); when(ingredients.findAllById(any())).thenReturn(List.of(i));
        assertEquals(ErrorCode.INGREDIENT_INACTIVE, assertThrows(BusinessException.class, () -> service.saveRecipe(1L, new SaveRecipeRequest(List.of(line(1L, "1"))))).getErrorCode());
    }
    @Test void nonpositiveQuantityIsRejected() {
        for (String q : List.of("0", "-1")) assertEquals(ErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> service.saveRecipe(1L, new SaveRecipeRequest(List.of(line(1L, q))))).getErrorCode());
    }
    @Test void missingIngredientIs404() {
        assertEquals(ErrorCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.saveRecipe(1L, new SaveRecipeRequest(List.of(line(99L, "1"))))).getErrorCode());
    }
}
