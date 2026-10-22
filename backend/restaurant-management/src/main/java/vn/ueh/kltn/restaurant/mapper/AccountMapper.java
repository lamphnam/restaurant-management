package vn.ueh.kltn.restaurant.mapper;

import vn.ueh.kltn.restaurant.dto.response.AccountResponse;
import vn.ueh.kltn.restaurant.entity.Account;

public final class AccountMapper {
    private AccountMapper() { }

    public static AccountResponse toResponse(Account account) {
        return new AccountResponse(account.getId(), account.getFullName(), account.getRole());
    }
}
