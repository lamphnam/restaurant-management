package vn.ueh.kltn.restaurant.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.ueh.kltn.restaurant.dto.response.IngredientOptionResponse;
import vn.ueh.kltn.restaurant.enums.IngredientStatus;
import vn.ueh.kltn.restaurant.service.IngredientService;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final IngredientService ingredients;

    @GetMapping("/ingredients")
    @PreAuthorize("hasAnyRole('OWNER','HEAD_CHEF')")
    public List<IngredientOptionResponse> ingredients(
            @RequestParam(required = false) IngredientStatus status) {
        return ingredients.list(status);
    }
}
