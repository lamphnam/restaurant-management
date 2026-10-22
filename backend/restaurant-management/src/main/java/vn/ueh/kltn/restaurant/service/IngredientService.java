package vn.ueh.kltn.restaurant.service;
import java.util.List;
import vn.ueh.kltn.restaurant.dto.response.IngredientOptionResponse;
import vn.ueh.kltn.restaurant.enums.IngredientStatus;
public interface IngredientService { List<IngredientOptionResponse> list(IngredientStatus status); }
