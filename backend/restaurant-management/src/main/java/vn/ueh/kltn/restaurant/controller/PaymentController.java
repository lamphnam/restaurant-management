package vn.ueh.kltn.restaurant.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.ueh.kltn.restaurant.dto.request.PaySessionRequest;
import vn.ueh.kltn.restaurant.dto.response.InvoiceResponse;
import vn.ueh.kltn.restaurant.dto.response.OpenSessionPaymentResponse;
import vn.ueh.kltn.restaurant.dto.response.PageResponse;
import vn.ueh.kltn.restaurant.dto.response.PaymentPreviewResponse;
import vn.ueh.kltn.restaurant.enums.PaymentMethod;
import vn.ueh.kltn.restaurant.service.PaymentService;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/payments/open-sessions")
    @PreAuthorize("hasRole('CASHIER')")
    public List<OpenSessionPaymentResponse> openSessions() {
        return paymentService.listOpenSessions();
    }

    @GetMapping("/payments/sessions/{id}")
    @PreAuthorize("hasRole('CASHIER')")
    public PaymentPreviewResponse previewSession(@PathVariable Long id) {
        return paymentService.previewSession(id);
    }

    @PostMapping("/payments")
    @PreAuthorize("hasRole('CASHIER')")
    public InvoiceResponse pay(@Valid @RequestBody PaySessionRequest request) {
        return paymentService.pay(request);
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasAnyRole('CASHIER','MANAGER','OWNER')")
    public PageResponse<InvoiceResponse> invoices(
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    Instant from,
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    Instant to,
            @RequestParam(required = false) PaymentMethod paymentMethod,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return paymentService.listInvoices(from, to, paymentMethod, page, size);
    }
}
