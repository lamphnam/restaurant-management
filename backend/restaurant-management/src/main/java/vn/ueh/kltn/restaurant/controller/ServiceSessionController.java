package vn.ueh.kltn.restaurant.controller;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.ueh.kltn.restaurant.dto.request.OpenSessionRequest;
import vn.ueh.kltn.restaurant.dto.response.OpenSessionResponse;
import vn.ueh.kltn.restaurant.service.ServiceSessionService;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class ServiceSessionController {
    private final ServiceSessionService sessions;

    @PostMapping
    @PreAuthorize("hasAnyRole('WAITER','MANAGER')")
    public OpenSessionResponse open(@Valid @RequestBody OpenSessionRequest request) {
        return sessions.open(request);
    }
}
