package vn.ueh.kltn.restaurant.service.impl;

import lombok.RequiredArgsConstructor;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.dto.response.OrderItemResponse;
import vn.ueh.kltn.restaurant.dto.response.OrderQueueItemResponse;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.entity.OrderItem;
import vn.ueh.kltn.restaurant.entity.RecipeItem;
import vn.ueh.kltn.restaurant.entity.StockMovement;
import vn.ueh.kltn.restaurant.enums.MovementType;
import vn.ueh.kltn.restaurant.enums.OrderItemStatus;
import vn.ueh.kltn.restaurant.enums.SessionStatus;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.mapper.FoodOrderMapper;
import vn.ueh.kltn.restaurant.realtime.RealtimeEvent;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.OrderItemRepository;
import vn.ueh.kltn.restaurant.repository.RecipeItemRepository;
import vn.ueh.kltn.restaurant.repository.StockMovementRepository;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.KitchenService;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KitchenServiceImpl implements KitchenService {
    private final OrderItemRepository items;
    private final RecipeItemRepository recipes;
    private final StockMovementRepository movements;
    private final AccountRepository accounts;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public List<OrderQueueItemResponse> queue() {
        return items
                .findQueue(
                        SessionStatus.ACTIVE,
                        Set.of(OrderItemStatus.PENDING, OrderItemStatus.COOKING))
                .stream()
                .map(FoodOrderMapper::queueItem)
                .toList();
    }

    @Transactional
    public OrderItemResponse start(Long id) {
        OrderItem item = locked(id);
        OrderItemStatus before = item.getStatus();
        item.startCooking();
        publishIfChanged(item, before);
        return FoodOrderMapper.item(item);
    }

    @Transactional
    public OrderItemResponse unavailable(Long id, String reason) {
        OrderItem item = locked(id);
        OrderItemStatus before = item.getStatus();
        item.markUnavailable(reason);
        publishIfChanged(item, before);
        return FoodOrderMapper.item(item);
    }

    @Transactional
    public OrderItemResponse complete(Long id) {
        OrderItem item = locked(id);
        if (item.getStatus() == OrderItemStatus.READY
                || item.getStatus() == OrderItemStatus.SERVED) {
            return FoodOrderMapper.item(item);
        }
        if (item.getStatus() != OrderItemStatus.COOKING) {
            throw new BusinessException(
                    ErrorCode.INVALID_STATE, "Chỉ hoàn thành món đang chế biến");
        }
        List<RecipeItem> recipe = recipes.findByMenuItemId(item.getMenuItem().getId());
        Account performer = accounts.getReferenceById(currentUser.accountId());
        Instant now = clock.instant();
        // Includes retained INACTIVE ingredients. No stock check: negative stock is allowed (D5).
        List<StockMovement> consumption =
                recipe.stream()
                        .map(
                                line ->
                                        new StockMovement(
                                                line.getIngredient(),
                                                null,
                                                null,
                                                item,
                                                null,
                                                performer,
                                                MovementType.CONSUMPTION,
                                                line.calculateConsumption(item.getQuantity())
                                                        .negate(),
                                                null,
                                                now))
                        .toList();
        movements.saveAll(consumption);
        item.markReady();
        events.publishEvent(
                new RealtimeEvent(RealtimeEvent.Type.ORDER, item.getOrder().getSession().getId()));
        return FoodOrderMapper.item(item);
    }

    private OrderItem locked(Long id) {
        return items.findLockedById(id)
                .orElseThrow(
                        () ->
                                new BusinessException(
                                        ErrorCode.NOT_FOUND, "Không tìm thấy món trong đơn"));
    }

    private void publishIfChanged(OrderItem item, OrderItemStatus before) {
        if (before != item.getStatus()) {
            events.publishEvent(
                    new RealtimeEvent(
                            RealtimeEvent.Type.ORDER, item.getOrder().getSession().getId()));
        }
    }
}
