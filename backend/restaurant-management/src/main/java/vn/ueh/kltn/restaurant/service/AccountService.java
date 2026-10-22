package vn.ueh.kltn.restaurant.service;
import java.util.List;
import vn.ueh.kltn.restaurant.dto.request.*;
import vn.ueh.kltn.restaurant.dto.response.AccountDetailsResponse;
public interface AccountService {
    List<AccountDetailsResponse> list();
    AccountDetailsResponse create(CreateAccountRequest request);
    AccountDetailsResponse lock(Long id);
    AccountDetailsResponse unlock(Long id);
    AccountDetailsResponse changeRole(Long id, ChangeRoleRequest request);
}
