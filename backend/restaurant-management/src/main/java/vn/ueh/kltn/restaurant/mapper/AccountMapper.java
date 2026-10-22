package vn.ueh.kltn.restaurant.mapper;

import vn.ueh.kltn.restaurant.dto.response.AccountResponse;
import vn.ueh.kltn.restaurant.entity.Account;

public final class AccountMapper {
    private AccountMapper() { }

    public static AccountResponse toResponse(Account account) {
        return new AccountResponse(account.getId(), account.getFullName(), account.getRole());
    }
    public static vn.ueh.kltn.restaurant.dto.response.AccountDetailsResponse toDetails(Account account) {
        return new vn.ueh.kltn.restaurant.dto.response.AccountDetailsResponse(
                account.getId(), account.getFullName(), account.getPhone(), account.getRole(), account.getStatus());
    }
}
