package vn.ueh.kltn.restaurant.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Số điện thoại hoặc mật khẩu không đúng"),
    ACCOUNT_LOCKED(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khóa"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập để tiếp tục"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu yêu cầu"),
    INVALID_STATE(HttpStatus.CONFLICT, "Trạng thái hiện tại không cho phép thao tác này"),
    DATA_CONFLICT(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc không thỏa mãn ràng buộc nghiệp vụ"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Hệ thống gặp sự cố, vui lòng thử lại sau");

    private final HttpStatus status;
    private final String message;
}
