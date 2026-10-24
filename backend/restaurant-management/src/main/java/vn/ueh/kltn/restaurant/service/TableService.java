package vn.ueh.kltn.restaurant.service;

import vn.ueh.kltn.restaurant.dto.response.FloorPlanAreaResponse;

import java.util.List;

public interface TableService {
    List<FloorPlanAreaResponse> floorPlan();
}
