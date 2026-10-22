package vn.ueh.kltn.restaurant.service;

import vn.ueh.kltn.restaurant.dto.response.IngredientOptionResponse;
import vn.ueh.kltn.restaurant.enums.IngredientStatus;

import java.util.List;

public interface IngredientService {
    List<IngredientOptionResponse> list(IngredientStatus status);
}
