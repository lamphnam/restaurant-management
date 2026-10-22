package vn.ueh.kltn.restaurant.service.impl;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static vn.ueh.kltn.restaurant.TestFixtures.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.ueh.kltn.restaurant.dto.request.*;
import vn.ueh.kltn.restaurant.enums.*;
import vn.ueh.kltn.restaurant.exception.*;
import vn.ueh.kltn.restaurant.repository.AccountRepository;
import vn.ueh.kltn.restaurant.security.CurrentUser;
class AccountServiceImplTest {
    private final AccountRepository accounts = mock(AccountRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final CurrentUser user = mock(CurrentUser.class);
    private final AccountServiceImpl service = new AccountServiceImpl(accounts, encoder, user);
    private CreateAccountRequest request() { return new CreateAccountRequest("Nhân viên", "0910000001", "Demo@123", Role.WAITER); }
    @Test void duplicatePhoneIsBlockedBeforeHashing() {
        when(accounts.existsByPhone("0910000001")).thenReturn(true);
        assertEquals(ErrorCode.PHONE_ALREADY_EXISTS, assertThrows(BusinessException.class, () -> service.create(request())).getErrorCode());
        verifyNoInteractions(encoder);
    }
    @Test void duplicateRaceHasSpecificCode() {
        when(encoder.encode(any())).thenReturn("hash"); when(accounts.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("unique"));
        assertEquals(ErrorCode.PHONE_ALREADY_EXISTS, assertThrows(BusinessException.class, () -> service.create(request())).getErrorCode());
    }
    @Test void creatingAccountHashesPasswordAndStartsActive() {
        when(encoder.encode("Demo@123")).thenReturn("hash"); when(accounts.saveAndFlush(any())).thenAnswer(a -> id(a.getArgument(0), 10L));
        var result = service.create(request()); assertEquals(AccountStatus.ACTIVE, result.status());
        verify(accounts).saveAndFlush(argThat(a -> a.getPasswordHash().equals("hash")));
    }
    @Test void cannotModifySelfIncludingUnlock() {
        when(user.accountId()).thenReturn(2L);
        assertEquals(ErrorCode.CANNOT_MODIFY_SELF, assertThrows(BusinessException.class, () -> service.lock(2L)).getErrorCode());
        assertThrows(BusinessException.class, () -> service.unlock(2L));
        assertThrows(BusinessException.class, () -> service.changeRole(2L, new ChangeRoleRequest(Role.OWNER)));
        verifyNoInteractions(accounts);
    }
    @Test void lockUnlockAndSameRoleAreIdempotent() {
        when(user.accountId()).thenReturn(1L); var a = account(); when(accounts.findById(2L)).thenReturn(Optional.of(a));
        service.lock(2L); assertEquals(AccountStatus.LOCKED, service.lock(2L).status());
        service.unlock(2L); assertEquals(AccountStatus.ACTIVE, service.unlock(2L).status());
        assertEquals(Role.MANAGER, service.changeRole(2L, new ChangeRoleRequest(Role.MANAGER)).role());
    }
    @Test void missingAccountIs404() { when(user.accountId()).thenReturn(1L); assertEquals(ErrorCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.lock(99L)).getErrorCode()); }
}
