package vn.ueh.kltn.restaurant.service.impl;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.dto.response.IngredientOptionResponse;
import vn.ueh.kltn.restaurant.enums.IngredientStatus;
import vn.ueh.kltn.restaurant.mapper.IngredientMapper;
import vn.ueh.kltn.restaurant.repository.IngredientRepository;
import vn.ueh.kltn.restaurant.service.IngredientService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IngredientServiceImpl implements IngredientService {
    private final IngredientRepository ingredients;

    public List<IngredientOptionResponse> list(IngredientStatus status) {
        return (status == null
                        ? ingredients.findAllByOrderByNameAsc()
                        : ingredients.findByStatusOrderByNameAsc(status))
                .stream().map(IngredientMapper::toOption).toList();
    }
}
