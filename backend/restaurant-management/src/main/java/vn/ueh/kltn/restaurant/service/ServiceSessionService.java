package vn.ueh.kltn.restaurant.service;

import vn.ueh.kltn.restaurant.dto.request.OpenSessionRequest;
import vn.ueh.kltn.restaurant.dto.response.OpenSessionResponse;

public interface ServiceSessionService {
    OpenSessionResponse open(OpenSessionRequest request);
}
