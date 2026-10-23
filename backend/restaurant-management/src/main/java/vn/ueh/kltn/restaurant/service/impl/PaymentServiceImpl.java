package vn.ueh.kltn.restaurant.service.impl;

import jakarta.persistence.criteria.Predicate;

import lombok.RequiredArgsConstructor;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.ueh.kltn.restaurant.dto.request.PaySessionRequest;
import vn.ueh.kltn.restaurant.dto.response.InvoiceResponse;
import vn.ueh.kltn.restaurant.dto.response.OpenSessionPaymentResponse;
import vn.ueh.kltn.restaurant.dto.response.PageResponse;
import vn.ueh.kltn.restaurant.dto.response.PaymentPreviewResponse;
import vn.ueh.kltn.restaurant.entity.Account;
import vn.ueh.kltn.restaurant.entity.FoodOrder;
import vn.ueh.kltn.restaurant.entity.Invoice;
import vn.ueh.kltn.restaurant.entity.OrderItem;
import vn.ueh.kltn.restaurant.entity.ServiceSession;
import vn.ueh.kltn.restaurant.enums.OrderItemStatus;
import vn.ueh.kltn.restaurant.enums.PaymentMethod;
import vn.ueh.kltn.restaurant.enums.SessionStatus;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.mapper.PaymentMapper;
import vn.ueh.kltn.restaurant.realtime.RealtimeEvent;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.FoodOrderRepository;
import vn.ueh.kltn.restaurant.repository.InvoiceRepository;
import vn.ueh.kltn.restaurant.repository.ServiceSessionRepository;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.PaymentService;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentServiceImpl implements PaymentService {

    private final ServiceSessionRepository sessions;
    private final FoodOrderRepository foodOrders;
    private final InvoiceRepository invoices;
    private final AccountRepository accounts;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    @Override
    public List<OpenSessionPaymentResponse> listOpenSessions() {
        List<ServiceSession> activeSessions =
                sessions.findByStatusWithTableAndArea(SessionStatus.ACTIVE);
        if (activeSessions.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> sessionIds =
                activeSessions.stream().map(ServiceSession::getId).toList();
        List<FoodOrder> allOrders = foodOrders.findDetailsBySessionIdIn(sessionIds);

        Map<Long, List<FoodOrder>> ordersBySession =
                allOrders.stream()
                        .collect(Collectors.groupingBy(order -> order.getSession().getId()));

        List<OpenSessionPaymentResponse> results = new ArrayList<>();
        for (ServiceSession session : activeSessions) {
            List<FoodOrder> sessionOrders =
                    ordersBySession.getOrDefault(session.getId(), Collections.emptyList());

            BigDecimal provisionalTotal =
                    sessionOrders.stream()
                            .map(FoodOrder::calculateTotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

            boolean hasPendingOrCooking =
                    sessionOrders.stream()
                            .flatMap(order -> order.getItems().stream())
                            .anyMatch(
                                    item ->
                                            item.getStatus() == OrderItemStatus.PENDING
                                                    || item.getStatus()
                                                            == OrderItemStatus.COOKING);

            int totalItems =
                    sessionOrders.stream()
                            .mapToInt(order -> order.getItems().size())
                            .sum();

            results.add(
                    PaymentMapper.toOpenSessionResponse(
                            session, provisionalTotal, hasPendingOrCooking, totalItems));
        }

        return results;
    }

    @Override
    public PaymentPreviewResponse previewSession(Long sessionId) {
        ServiceSession session =
                sessions.findDetailById(sessionId)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                "Không tìm thấy phiên phục vụ"));

        List<FoodOrder> orders = foodOrders.findDetailsBySessionId(sessionId);

        BigDecimal provisionalTotal =
                orders.stream()
                        .map(FoodOrder::calculateTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PaymentPreviewResponse.BlockingItemResponse> blockingItems = new ArrayList<>();
        boolean hasPendingOrCooking = false;

        for (FoodOrder order : orders) {
            for (OrderItem item : order.getItems()) {
                if (item.getStatus() == OrderItemStatus.PENDING
                        || item.getStatus() == OrderItemStatus.COOKING) {
                    hasPendingOrCooking = true;
                    blockingItems.add(
                            new PaymentPreviewResponse.BlockingItemResponse(
                                    item.getId(),
                                    item.getMenuItem().getName(),
                                    item.getQuantity(),
                                    item.getStatus(),
                                    order.getCreatedAt()));
                }
            }
        }

        return PaymentMapper.toPreviewResponse(
                session, orders, provisionalTotal, hasPendingOrCooking, blockingItems);
    }

    @Override
    @Transactional
    public InvoiceResponse pay(PaySessionRequest request) {
        ServiceSession session =
                sessions.findLockedById(request.sessionId())
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                ErrorCode.NOT_FOUND,
                                                "Không tìm thấy phiên phục vụ"));

        if (session.getStatus() != SessionStatus.ACTIVE
                || invoices.existsBySessionId(session.getId())) {
            throw new BusinessException(
                    ErrorCode.SESSION_ALREADY_PAID, "Phiên phục vụ đã được thanh toán");
        }

        List<FoodOrder> orders = foodOrders.findDetailsBySessionId(session.getId());

        boolean hasBlocking =
                orders.stream()
                        .flatMap(order -> order.getItems().stream())
                        .anyMatch(
                                item ->
                                        item.getStatus() == OrderItemStatus.PENDING
                                                || item.getStatus()
                                                        == OrderItemStatus.COOKING);

        if (hasBlocking) {
            throw new BusinessException(
                    ErrorCode.PAYMENT_BLOCKED_PENDING_ITEMS,
                    "Không thể thanh toán khi còn món đang chờ chế biến hoặc đang nấu");
        }

        BigDecimal total =
                orders.stream()
                        .map(FoodOrder::calculateTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        Account cashier =
                accounts.findById(currentUser.accountId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        Instant now = clock.instant();

        Invoice invoice =
                new Invoice(session, cashier, request.paymentMethod(), total, now);
        Invoice savedInvoice = invoices.save(invoice);

        session.close(now);
        session.getTable().release();

        events.publishEvent(new RealtimeEvent(RealtimeEvent.Type.FLOOR_PLAN, session.getId()));

        return PaymentMapper.toInvoiceResponse(savedInvoice);
    }

    @Override
    public PageResponse<InvoiceResponse> listInvoices(
            Instant from, Instant to, PaymentMethod paymentMethod, int page, int size) {
        Specification<Invoice> spec =
                (root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    if (from != null) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("paidAt"), from));
                    }
                    if (to != null) {
                        predicates.add(cb.lessThanOrEqualTo(root.get("paidAt"), to));
                    }
                    if (paymentMethod != null) {
                        predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
                    }
                    return cb.and(predicates.toArray(Predicate[]::new));
                };

        PageRequest pageRequest =
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "paidAt", "id"));
        Page<Invoice> invoicePage = invoices.findAll(spec, pageRequest);

        return PageResponse.from(invoicePage.map(PaymentMapper::toInvoiceResponse));
    }
}
