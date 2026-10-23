package vn.ueh.kltn.restaurant.service;

import vn.ueh.kltn.restaurant.dto.response.OrderItemResponse;
import vn.ueh.kltn.restaurant.dto.response.OrderQueueItemResponse;

import java.util.List;

public interface KitchenService {
    List<OrderQueueItemResponse> queue();

    OrderItemResponse start(Long id);

    OrderItemResponse unavailable(Long id, String reason);

    OrderItemResponse complete(Long id);
}
