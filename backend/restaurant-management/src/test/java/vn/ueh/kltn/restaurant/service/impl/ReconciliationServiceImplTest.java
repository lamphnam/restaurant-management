package vn.ueh.kltn.restaurant.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import static vn.ueh.kltn.restaurant.TestFixtures.CLOCK;
import static vn.ueh.kltn.restaurant.TestFixtures.NOW;
import static vn.ueh.kltn.restaurant.TestFixtures.account;
import static vn.ueh.kltn.restaurant.TestFixtures.id;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InOrder;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import vn.ueh.kltn.restaurant.dto.request.CreateReconciliationRequest;
import vn.ueh.kltn.restaurant.dto.response.ReconciliationResponse;
import vn.ueh.kltn.restaurant.dto.response.RevenueSummaryResponse;
import vn.ueh.kltn.restaurant.entity.RevenueReconciliation;
import vn.ueh.kltn.restaurant.exception.BusinessException;
import vn.ueh.kltn.restaurant.exception.ErrorCode;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.repository.RevenueReconciliationRepository;
import vn.ueh.kltn.restaurant.security.CurrentUser;
import vn.ueh.kltn.restaurant.service.PaymentService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

class ReconciliationServiceImplTest {
    private final RevenueReconciliationRepository repository =
            mock(RevenueReconciliationRepository.class);
    private final PaymentService payments = mock(PaymentService.class);
    private final AccountRepository accounts = mock(AccountRepository.class);
    private final CurrentUser user = mock(CurrentUser.class);
    private final ReconciliationServiceImpl service =
            new ReconciliationServiceImpl(repository, payments, accounts, user, CLOCK);

    private void actor() {
        when(user.accountId()).thenReturn(2L);
        when(accounts.findById(2L)).thenReturn(Optional.of(account()));
    }

    @Test
    void createRecomputesAfterPreviewAndKeepsSnapshotActorAndClock() {
        actor();
        when(payments.summarizeRevenue(NOW, NOW.plusSeconds(60)))
                .thenReturn(
                        new RevenueSummaryResponse(
                                NOW, NOW.plusSeconds(60), 1, new BigDecimal("100"), List.of()),
                        new RevenueSummaryResponse(
                                NOW, NOW.plusSeconds(60), 2, new BigDecimal("200"), List.of()));
        when(repository.save(any())).thenAnswer(call -> id(call.getArgument(0), 7L));
        assertEquals(
                new BigDecimal("100"), service.preview(NOW, NOW.plusSeconds(60)).systemRevenue());
        ReconciliationResponse response =
                service.create(
                        new CreateReconciliationRequest(
                                NOW, NOW.plusSeconds(60), BigDecimal.ZERO, null));
        assertEquals(new BigDecimal("200"), response.systemRevenue());
        assertEquals(new BigDecimal("-200"), response.difference());
        assertEquals(2L, response.cashierId());
        assertEquals(NOW, response.reconciledAt());
        assertNull(response.managerId());
        assertNull(response.differenceReason());
        assertFalse(response.confirmed());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "0.1", "100000000000000"})
    void rejectsMoneyOutsideSchemaWithoutSaving(String actual) {
        assertEquals(
                ErrorCode.INVALID_INPUT,
                assertThrows(
                                BusinessException.class,
                                () ->
                                        service.create(
                                                new CreateReconciliationRequest(
                                                        NOW,
                                                        NOW.plusSeconds(60),
                                                        new BigDecimal(actual),
                                                        null)))
                        .getErrorCode());
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsAggregateOverflowWithoutRoundingOrSaving() {
        when(payments.summarizeRevenue(NOW, NOW.plusSeconds(60)))
                .thenReturn(
                        new RevenueSummaryResponse(
                                NOW,
                                NOW.plusSeconds(60),
                                2,
                                new BigDecimal("100000000000000"),
                                List.of()));
        assertThrows(
                BusinessException.class,
                () ->
                        service.create(
                                new CreateReconciliationRequest(
                                        NOW, NOW.plusSeconds(60), BigDecimal.ZERO, null)));
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsLongReasonBeforeSaving() {
        assertThrows(
                BusinessException.class,
                () ->
                        service.create(
                                new CreateReconciliationRequest(
                                        NOW,
                                        NOW.plusSeconds(60),
                                        BigDecimal.ZERO,
                                        "x".repeat(501))));
        verify(repository, never()).save(any());
    }

    @Test
    void confirmationLocksBeforeActorAndOnlyAssignsManager() {
        actor();
        RevenueReconciliation entity =
                id(
                        new RevenueReconciliation(
                                account(),
                                NOW.minusSeconds(60),
                                NOW,
                                BigDecimal.TEN,
                                BigDecimal.ONE,
                                "[QA]",
                                NOW),
                        8L);
        when(repository.findLockedById(8L)).thenReturn(Optional.of(entity));
        ReconciliationResponse result = service.confirm(8L);
        InOrder order = inOrder(repository, user, accounts);
        order.verify(repository).findLockedById(8L);
        order.verify(user).accountId();
        order.verify(accounts).findById(2L);
        assertEquals(2L, result.managerId());
        assertTrue(result.confirmed());
        assertEquals(NOW, result.reconciledAt());
        assertEquals(BigDecimal.TEN, result.systemRevenue());
        assertEquals(BigDecimal.ONE, result.actualAmount());
        assertEquals("[QA]", result.differenceReason());
        assertEquals(
                ErrorCode.INVALID_STATE,
                assertThrows(BusinessException.class, () -> service.confirm(8L)).getErrorCode());
    }

    @Test
    void missingConfirmationReturns404() {
        when(repository.findLockedById(9L)).thenReturn(Optional.empty());
        assertEquals(
                ErrorCode.NOT_FOUND,
                assertThrows(BusinessException.class, () -> service.confirm(9L)).getErrorCode());
    }

    @Test
    void paginatedListKeepsTotalAndConfirmationFlag() {
        RevenueReconciliation entity =
                id(
                        new RevenueReconciliation(
                                account(),
                                NOW.minusSeconds(60),
                                NOW,
                                BigDecimal.ONE,
                                BigDecimal.TEN,
                                null,
                                NOW),
                        8L);
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        assertEquals(1, service.list(false, 0, 20).total());
        assertEquals(
                new BigDecimal("9"), service.list(null, 0, 20).items().getFirst().difference());
    }
}
