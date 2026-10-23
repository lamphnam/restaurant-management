package vn.ueh.kltn.restaurant.service.impl;

import jakarta.persistence.criteria.Predicate;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.config.AppProperties;
import vn.ueh.kltn.restaurant.dto.request.CreateIngredientRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStockDisposalRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStockReceiptRequest;
import vn.ueh.kltn.restaurant.dto.request.CreateStocktakeRequest;
import vn.ueh.kltn.restaurant.dto.request.StockReceiptItemRequest;
import vn.ueh.kltn.restaurant.dto.request.StocktakeItemRequest;
import vn.ueh.kltn.restaurant.dto.request.UpdateIngredientRequest;
import vn.ueh.kltn.restaurant.dto.response.IngredientLotAttentionResponse;
import vn.ueh.kltn.restaurant.dto.response.IngredientOptionResponse;
import vn.ueh.kltn.restaurant.dto.response.IngredientResponse;
import vn.ueh.kltn.restaurant.dto.response.PageResponse;
import vn.ueh.kltn.restaurant.dto.response.StockMovementResponse;
import vn.ueh.kltn.restaurant.dto.response.StockReceiptResponse;
import vn.ueh.kltn.restaurant.dto.response.StocktakeResponse;
import vn.ueh.kltn.restaurant.dto.response.StocktakeTemplateItemResponse;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.entity.Ingredient;
import vn.ueh.kltn.restaurant.entity.IngredientLot;
import vn.ueh.kltn.restaurant.entity.StockMovement;
import vn.ueh.kltn.restaurant.entity.StockReceipt;
import vn.ueh.kltn.restaurant.entity.StockReceiptItem;
import vn.ueh.kltn.restaurant.entity.Stocktake;
import vn.ueh.kltn.restaurant.entity.StocktakeItem;
import vn.ueh.kltn.restaurant.enums.IngredientStatus;
import vn.ueh.kltn.restaurant.enums.MovementType;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.mapper.IngredientMapper;
import vn.ueh.kltn.restaurant.mapper.InventoryMapper;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.IngredientLotRepository;
import vn.ueh.kltn.restaurant.repository.IngredientRepository;
import vn.ueh.kltn.restaurant.repository.StockMovementRepository;
import vn.ueh.kltn.restaurant.repository.StockReceiptItemRepository;
import vn.ueh.kltn.restaurant.repository.StockReceiptRepository;
import vn.ueh.kltn.restaurant.repository.StocktakeItemRepository;
import vn.ueh.kltn.restaurant.repository.StocktakeRepository;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.InventoryService;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    private final IngredientRepository ingredients;
    private final IngredientLotRepository ingredientLots;
    private final StockMovementRepository stockMovements;
    private final StockReceiptRepository stockReceipts;
    private final StockReceiptItemRepository stockReceiptItems;
    private final StocktakeRepository stocktakes;
    private final StocktakeItemRepository stocktakeItems;
    private final AccountRepository accounts;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final AppProperties properties;

    @Override
    public List<IngredientOptionResponse> list(IngredientStatus status) {
        return (status == null
                        ? ingredients.findAllByOrderByNameAsc()
                        : ingredients.findByStatusOrderByNameAsc(status))
                .stream()
                .map(IngredientMapper::toOption)
                .toList();
    }

    @Override
    public List<IngredientResponse> listIngredients(
            String q, IngredientStatus status, Boolean belowMinStockOnly) {
        Specification<Ingredient> spec =
                (root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    if (status != null) {
                        predicates.add(cb.equal(root.get("status"), status));
                    }
                    if (q != null && !q.isBlank()) {
                        String term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                        predicates.add(cb.like(cb.lower(root.get("name")), term));
                    }
                    return cb.and(predicates.toArray(Predicate[]::new));
                };

        List<Ingredient> list =
                ingredients.findAll(spec, Sort.by(Sort.Direction.ASC, "name"));
        Map<Long, BigDecimal> stockMap = getStockMapGrouped();

        List<IngredientResponse> results = new ArrayList<>();
        for (Ingredient ing : list) {
            BigDecimal currentStock = stockMap.getOrDefault(ing.getId(), BigDecimal.ZERO);
            boolean isBelow = ing.isBelowMinStock(currentStock);
            if (Boolean.TRUE.equals(belowMinStockOnly) && !isBelow) {
                continue;
            }
            results.add(InventoryMapper.toIngredientResponse(ing, currentStock));
        }

        return results;
    }

    @Override
    @Transactional
    public IngredientResponse createIngredient(CreateIngredientRequest request) {
        String name = request.name().trim();
        if (ingredients.existsByNameIgnoreCase(name)) {
            throw new BusinessException(
                    ErrorCode.DATA_CONFLICT, "Tên nguyên vật liệu đã tồn tại");
        }

        Ingredient ingredient =
                new Ingredient(
                        name,
                        request.unit().trim(),
                        request.minStock(),
                        request.trackLot(),
                        request.trackExpiry());
        Ingredient saved = ingredients.save(ingredient);
        return InventoryMapper.toIngredientResponse(saved, BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public IngredientResponse updateIngredient(Long id, UpdateIngredientRequest request) {
        Ingredient ingredient =
                ingredients.findById(id)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                "Không tìm thấy nguyên vật liệu"));

        String newName = request.name().trim();
        if (ingredients.existsByNameIgnoreCaseAndIdNot(newName, id)) {
            throw new BusinessException(
                    ErrorCode.DATA_CONFLICT, "Tên nguyên vật liệu đã tồn tại");
        }

        String newUnit = request.unit().trim();
        if (!ingredient.getUnit().equalsIgnoreCase(newUnit)) {
            if (stockMovements.existsByIngredientId(id)) {
                throw new BusinessException(
                        ErrorCode.UNIT_CHANGE_BLOCKED,
                        "Không thể thay đổi đơn vị tính của nguyên vật liệu đã có biến"
                                + " động kho");
            }
        }

        ingredient.updateInfo(
                newName,
                newUnit,
                request.minStock(),
                request.trackLot(),
                request.trackExpiry());

        BigDecimal currentStock = stockMovements.sumQuantityByIngredientId(id);
        return InventoryMapper.toIngredientResponse(ingredient, currentStock);
    }

    @Override
    @Transactional
    public IngredientResponse deactivateIngredient(Long id) {
        Ingredient ingredient =
                ingredients.findById(id)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                "Không tìm thấy nguyên vật liệu"));
        ingredient.deactivate();
        BigDecimal currentStock = stockMovements.sumQuantityByIngredientId(id);
        return InventoryMapper.toIngredientResponse(ingredient, currentStock);
    }

    @Override
    @Transactional
    public IngredientResponse activateIngredient(Long id) {
        Ingredient ingredient =
                ingredients.findById(id)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                "Không tìm thấy nguyên vật liệu"));
        ingredient.activate();
        BigDecimal currentStock = stockMovements.sumQuantityByIngredientId(id);
        return InventoryMapper.toIngredientResponse(ingredient, currentStock);
    }

    @Override
    public List<IngredientLotAttentionResponse> listAttentionLots(Integer days) {
        int alertDays = days != null ? days : properties.alert().expiryDays();
        ZoneId zone = ZoneId.of(properties.timezone());
        LocalDate today = LocalDate.now(clock.withZone(zone));
        LocalDate thresholdDate = today.plusDays(alertDays);

        List<IngredientLot> lots = ingredientLots.findAttentionLots(thresholdDate);
        if (lots.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> lotIds = lots.stream().map(IngredientLot::getId).toList();
        List<Object[]> initialRows = stockReceiptItems.findInitialQuantitiesByLotIds(lotIds);
        Map<Long, BigDecimal> initialMap = new HashMap<>();
        for (Object[] row : initialRows) {
            initialMap.put((Long) row[0], (BigDecimal) row[1]);
        }

        List<IngredientLotAttentionResponse> results = new ArrayList<>();
        for (IngredientLot lot : lots) {
            BigDecimal initialQty = initialMap.getOrDefault(lot.getId(), BigDecimal.ZERO);
            results.add(InventoryMapper.toLotAttentionResponse(lot, initialQty, today));
        }

        return results;
    }

    @Override
    @Transactional
    public StockReceiptResponse createReceipt(CreateStockReceiptRequest request) {
        Account actor =
                accounts.findById(currentUser.accountId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        Instant now = clock.instant();

        StockReceipt receipt = new StockReceipt(actor, now);
        StockReceipt savedReceipt = stockReceipts.save(receipt);

        for (StockReceiptItemRequest itemReq : request.items()) {
            Ingredient ingredient =
                    ingredients.findById(itemReq.ingredientId())
                            .orElseThrow(
                                    () ->
                                            new BusinessException(
                                                    ErrorCode.NOT_FOUND,
                                                    "Không tìm thấy nguyên vật liệu"));

            if (ingredient.getStatus() != IngredientStatus.ACTIVE) {
                throw new BusinessException(
                        ErrorCode.INGREDIENT_INACTIVE, "Nguyên vật liệu đã ngừng sử dụng");
            }

            if (itemReq.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException(
                        ErrorCode.INVALID_QUANTITY, "Số lượng nhập phải lớn hơn 0");
            }

            if (ingredient.isTrackExpiry() && itemReq.expiryDate() == null) {
                throw new BusinessException(
                        ErrorCode.EXPIRY_DATE_REQUIRED,
                        "Nguyên vật liệu có theo dõi hạn sử dụng bắt buộc phải nhập hạn sử"
                                + " dụng");
            }

            IngredientLot lot = null;
            if (ingredient.isTrackLot() || ingredient.isTrackExpiry()) {
                String lotNum =
                        itemReq.lotNumber() != null && !itemReq.lotNumber().isBlank()
                                ? itemReq.lotNumber().trim()
                                : null;
                lot = new IngredientLot(ingredient, lotNum, itemReq.expiryDate());
                lot = ingredientLots.save(lot);
            }

            StockReceiptItem item =
                    new StockReceiptItem(ingredient, lot, itemReq.quantity());
            savedReceipt.addItem(item);
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
                            itemReq.quantity(),
                            null,
                            now);
            stockMovements.save(movement);
        }

        return InventoryMapper.toReceiptResponse(savedReceipt);
    }

    @Override
    public PageResponse<StockReceiptResponse> listReceipts(
            Instant from, Instant to, int page, int size) {
        Specification<StockReceipt> spec =
                (root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    if (from != null) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
                    }
                    if (to != null) {
                        predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
                    }
                    return cb.and(predicates.toArray(Predicate[]::new));
                };

        PageRequest pageRequest =
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        Page<StockReceipt> receiptPage = stockReceipts.findAll(spec, pageRequest);

        return PageResponse.from(receiptPage.map(InventoryMapper::toReceiptResponse));
    }

    @Override
    public List<StocktakeTemplateItemResponse> getStocktakeTemplate() {
        List<Ingredient> activeIngredients =
                ingredients.findByStatusOrderByNameAsc(IngredientStatus.ACTIVE);
        Map<Long, BigDecimal> stockMap = getStockMapGrouped();

        List<StocktakeTemplateItemResponse> results = new ArrayList<>();
        for (Ingredient ing : activeIngredients) {
            BigDecimal currentStock = stockMap.getOrDefault(ing.getId(), BigDecimal.ZERO);
            results.add(
                    new StocktakeTemplateItemResponse(
                            ing.getId(), ing.getName(), ing.getUnit(), currentStock));
        }

        return results;
    }

    @Override
    @Transactional
    public StocktakeResponse createStocktake(CreateStocktakeRequest request) {
        Account actor =
                accounts.findById(currentUser.accountId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        Instant now = clock.instant();

        Stocktake stocktake = new Stocktake(actor, now);
        Stocktake savedStocktake = stocktakes.save(stocktake);

        for (StocktakeItemRequest itemReq : request.items()) {
            Ingredient ingredient =
                    ingredients.findById(itemReq.ingredientId())
                            .orElseThrow(
                                    () ->
                                            new BusinessException(
                                                    ErrorCode.NOT_FOUND,
                                                    "Không tìm thấy nguyên vật liệu"));

            if (itemReq.actualQuantity().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException(
                        ErrorCode.INVALID_STOCKTAKE, "Số lượng thực tế không được âm");
            }

            String note =
                    itemReq.note() != null && !itemReq.note().isBlank()
                            ? itemReq.note().trim()
                            : null;

            // D7: Recompute ledger sum at confirmation time
            BigDecimal systemQuantity =
                    stockMovements.sumQuantityByIngredientId(ingredient.getId());

            StocktakeItem item =
                    new StocktakeItem(
                            ingredient, systemQuantity, itemReq.actualQuantity(), note);
            savedStocktake.addItem(item);
            StocktakeItem savedItem = stocktakeItems.save(item);

            BigDecimal difference = item.calculateDifference();
            if (difference.compareTo(BigDecimal.ZERO) != 0) {
                StockMovement movement =
                        new StockMovement(
                                ingredient,
                                null,
                                null,
                                null,
                                savedItem,
                                actor,
                                MovementType.STOCKTAKE_ADJUSTMENT,
                                difference,
                                note,
                                now);
                stockMovements.save(movement);
            }
        }

        return InventoryMapper.toStocktakeResponse(savedStocktake);
    }

    @Override
    public PageResponse<StocktakeResponse> listStocktakes(
            Instant from, Instant to, int page, int size) {
        Specification<Stocktake> spec =
                (root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    if (from != null) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
                    }
                    if (to != null) {
                        predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
                    }
                    return cb.and(predicates.toArray(Predicate[]::new));
                };

        PageRequest pageRequest =
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        Page<Stocktake> stocktakePage = stocktakes.findAll(spec, pageRequest);

        return PageResponse.from(stocktakePage.map(InventoryMapper::toStocktakeResponse));
    }

    @Override
    @Transactional
    public StockMovementResponse createDisposal(CreateStockDisposalRequest request) {
        Ingredient ingredient =
                ingredients.findLockedById(request.ingredientId())
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                "Không tìm thấy nguyên vật liệu"));

        if (request.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    ErrorCode.INVALID_DISPOSAL, "Số lượng xuất hủy phải lớn hơn 0");
        }

        if (request.reason() == null || request.reason().isBlank()) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT, "Vui lòng nhập lý do xuất hủy");
        }

        IngredientLot lot = null;
        if (request.lotId() != null) {
            lot =
                    ingredientLots.findById(request.lotId())
                            .orElseThrow(
                                    () ->
                                            new BusinessException(
                                                    ErrorCode.LOT_NOT_FOUND,
                                                    "Không tìm thấy lô nguyên vật liệu"));
            if (!lot.getIngredient().getId().equals(ingredient.getId())) {
                throw new BusinessException(
                        ErrorCode.LOT_INGREDIENT_MISMATCH,
                        "Lô nguyên vật liệu không thuộc về nguyên vật liệu đã chọn");
            }
        }

        BigDecimal totalStock =
                stockMovements.sumQuantityByIngredientId(ingredient.getId());
        if (request.quantity().compareTo(totalStock) > 0) {
            throw new BusinessException(
                    ErrorCode.INSUFFICIENT_STOCK, "Số lượng tồn kho không đủ để xuất hủy");
        }

        Account actor =
                accounts.findById(currentUser.accountId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        Instant now = clock.instant();

        StockMovement movement =
                new StockMovement(
                        ingredient,
                        lot,
                        null,
                        null,
                        null,
                        actor,
                        MovementType.DISPOSAL,
                        request.quantity().negate(),
                        request.reason().trim(),
                        now);
        StockMovement savedMovement = stockMovements.save(movement);

        return InventoryMapper.toMovementResponse(savedMovement);
    }

    @Override
    public PageResponse<StockMovementResponse> listMovements(
            Long ingredientId,
            MovementType movementType,
            Instant from,
            Instant to,
            int page,
            int size) {
        Specification<StockMovement> spec =
                (root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    if (ingredientId != null) {
                        predicates.add(
                                cb.equal(root.get("ingredient").get("id"), ingredientId));
                    }
                    if (movementType != null) {
                        predicates.add(cb.equal(root.get("movementType"), movementType));
                    }
                    if (from != null) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
                    }
                    if (to != null) {
                        predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
                    }
                    return cb.and(predicates.toArray(Predicate[]::new));
                };

        PageRequest pageRequest =
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt", "id"));
        Page<StockMovement> movementPage = stockMovements.findAll(spec, pageRequest);

        return PageResponse.from(movementPage.map(InventoryMapper::toMovementResponse));
    }

    private Map<Long, BigDecimal> getStockMapGrouped() {
        List<Object[]> rows = stockMovements.sumQuantityGroupedByIngredient();
        Map<Long, BigDecimal> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((Long) row[0], (BigDecimal) row[1]);
        }
        return map;
    }
}
