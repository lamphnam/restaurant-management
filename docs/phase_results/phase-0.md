# Kết quả Phase 0 — Nền tảng

Ngày kiểm tra: 22/10/2026 (Asia/Ho_Chi_Minh).

**Trạng thái: hoàn thành Phase 0. Chưa bắt đầu Phase 1.**

## Phạm vi đã hiện thực

- FR-01 / UC1.1: đăng nhập bằng SĐT/mật khẩu, JWT HS256, `/api/auth/me`, đăng xuất
  ở frontend, khôi phục phiên sau reload, xử lý token hết hạn.
- TR-02/03/04: Neon PostgreSQL, Flyway V1 với đúng 18 bảng domain, khóa kép
  `RecipeItem`, FK RESTRICT, CHECK và index theo §7/§16.
- TR-07 / NFR-05/11: BCrypt, stateless JWT, role authority, method security,
  controller → service → impl → repository, DTO record và mapper thủ công.
- Frontend: AuthContext, RequireAuth, RequireRole, Axios interceptor, AppLayout,
  menu/trang mặc định theo vai trò, locale Việt, nhãn cho đủ 11 enum, StatusTag,
  MoneyText và các trang khung cho những phase tiếp theo.
- Seed: 6 tài khoản, 3 khu vực, 12 bàn; chỉ chạy khi `app.seed=true` và `account`
  rỗng. Chưa seed món/NVL/định lượng/đặt bàn/nghiệp vụ kho của các phase sau.

## Build và unit test

| Kiểm tra | Kết quả |
|---|---|
| Backend `mvnw.cmd clean verify` (Java 21, Boot 4.1.1) | PASS |
| Unit test đăng nhập/JWT, không cần DB | 9 pass, 0 lỗi, 0 bỏ qua |
| Frontend `bun run build` gồm TypeScript | PASS |
| Frontend `bun run lint` | PASS, không cảnh báo lint |
| Kiểm tra whitespace bằng `git diff --check` | PASS |
| Secrets ngoài source Git và ngoài JAR | PASS |

Các test auth/JWT bổ sung ở Phase 0 không thay thế sáu nhóm test logic nghiệp vụ
trong §21.1, vẫn thuộc kế hoạch Phase 4. Maven/JVM có thể in cảnh báo metadata
repository hoặc Mockito agent của JDK 21; build/test không có lỗi.

## Kiểm tra trên ứng dụng và Neon thật

Đã chạy backend với profile `local`, áp dụng V1 trên Neon và khởi động thành công
với `ddl-auto: validate`. Tất cả 18 repository được Spring Data nhận diện.

44 assertion trực tiếp trên DB/API/HTTP đã pass:

- Đúng 18 bảng domain; Flyway V1 thành công; 6 tài khoản, 3 khu vực, 12 bàn;
  toàn bộ mật khẩu BCrypt; FK RESTRICT; đủ 5 partial unique index; PK RecipeItem.
- Cả 6 vai trò đăng nhập thành công; token có HS256, subject, role và thời hạn
  12 giờ; `/me` trả đúng vai trò và không trả mật khẩu/hash.
- SĐT không tồn tại và mật khẩu sai trả cùng lỗi `INVALID_CREDENTIALS` (401).
- Tài khoản khóa trả `ACCOUNT_LOCKED` (401) và thông báo tiếng Việt riêng.
  Sai mật khẩu của tài khoản khóa vẫn trả lỗi chung.
- D10: JWT đã cấp vẫn dùng được sau khi khóa tài khoản; tài khoản thử nghiệm
  đã được khôi phục về trạng thái ban đầu. Cả 6 tài khoản cuối kiểm tra là ACTIVE.
- WAITER gọi `GET /api/accounts` nhận JSON 403 `FORBIDDEN`; OWNER nhận 404 vì
  controller quản lý tài khoản thuộc Phase 1 và chưa được triển khai.
- Thiếu token/token sai nhận JSON 401; SĐT sai định dạng, JSON lỗi và body null
  nhận 400; lỗi validation có `fieldErrors`.
- Swagger công khai trong profile local, có endpoint auth và Bearer scheme.
- Frontend trả HTML tiếng Việt; proxy Vite chuyển tiếp được request Bearer tới `/me`.

Đối chiếu schema độc lập: đọc danh sách cột trực tiếp từ §7 của master spec,
so với `information_schema.columns` trên Neon: đúng **18 bảng / 106 cột**,
không thiếu hoặc thừa cột. Khởi động lại bản build cuối vẫn giữ nguyên 6 tài
khoản, 3 khu vực và 12 bàn; Flyway xác nhận schema ở V1.

## Kiểm tra giao diện bằng Chrome headless

Theo lựa chọn của người dùng, dùng Playwright tạm thời trong `.cache` để điều
khiển Chrome headless 155.0.8059.85; không thêm dependency kiểm thử vào ứng dụng.
33 kiểm tra UI đã pass, không có lỗi JavaScript hoặc cảnh báo console:

- Form bắt buộc SĐT/mật khẩu, lỗi tiếng Việt; sai SĐT/mật khẩu hiển thị cùng
  thông báo từ server.
- Đủ sáu vai trò: đăng nhập qua form thật → đúng trang mặc định và menu; reload
  vẫn có phiên; đăng xuất xóa token và về `/login`.
- Tài khoản seed bị khóa thật: UI hiển thị "Tài khoản đã bị khóa"; trạng thái
  gốc đã được khôi phục trong `finally` của bộ kiểm tra.
- Truy cập trực tiếp route không được phép hiển thị 403; Axios interceptor
  hiển thị lỗi 403 tiếng Việt; token sai dẫn tới xóa phiên và về đăng nhập.
- Chưa đăng nhập mà truy cập route bảo vệ thì về `/login`.
- Desktop 1440px, tablet 834px, mobile 375px không tràn ngang; drawer trên tablet
  mở được và điều hướng đúng; nút đăng nhập có chiều cao tối thiểu 44px.

Đã xem ảnh QA và điều chỉnh độ tương phản bằng token Ant Design. Kiểm tra tập
trung trên bản giao diện cuối: menu đang chọn đạt 7,69:1; placeholder và mô tả
rỗng đạt 4,91:1. Ảnh QA cục bộ ở `.cache/phase0/screenshots/` gồm đăng nhập
desktop/mobile, trang Chủ quán và giao diện tablet của Phục vụ.

## Checklist §21.2

| Mục | Nội dung | Kết quả hiện tại |
|---|---|---|
| 1 | Đăng nhập đúng → trang mặc định theo vai trò | PASS — API và UI đủ 6/6 vai trò |
| 2 | Đăng nhập sai → thông báo chung | PASS — API và UI cùng thông báo cho sai SĐT/mật khẩu |
| 3 | Tài khoản bị khóa không đăng nhập được | PASS — API và UI thật; fixture đã khôi phục |
| 4 | Gọi API sai vai trò → 403 | PASS — API thật và thông báo từ Axios interceptor |

Trang mặc định đã cấu hình theo §5: OWNER `/reports`, MANAGER `/reservations`,
CASHIER `/payment`, WAITER `/floor-plan`, KITCHEN_STAFF và HEAD_CHEF `/kitchen`.

## Khác biệt kỹ thuật so với sơ đồ thư mục mẫu

1. Giữ backend ở `backend/restaurant-management/` theo project người dùng đã
   khởi tạo. Package Java đã chuyển sang `vn.ueh.kltn.restaurant`.
2. Dùng đuôi `.yaml` thay `.yml`. `application-local.yaml` ở thư mục gốc backend,
   được profile local import, gitignore và không đóng gói trong JAR.
3. Đã thêm test auth/JWT để kiểm tra nền tảng xác thực ngay trong Phase 0.
4. Kiểm tra UI dùng Chrome headless theo lựa chọn của người dùng vì chưa có
   kết nối browser tương tác. Bộ công cụ và ảnh QA nằm trong cache, được gitignore.

Schema, vai trò, trạng thái và phạm vi nghiệp vụ giữ nguyên spec. Các trang
nghiệp vụ là khung giao diện; không tính là đã hoàn thành FR của Phase 1–4.
Quyền backend ngoài auth và namespace tài khoản được bổ sung theo đúng phase
controller nghiệp vụ tương ứng.

## Lưu ý cho phase sau

Điều kiện seed của §20 (`account` rỗng) hiện đã đóng sau Phase 0. Cần xử lý rõ
cách bổ sung seed món/NVL/đặt bàn ở Phase 1 và seed kho ở Phase 3; không tự xóa
dữ liệu hiện tại hoặc tự thay điều kiện seed.

Danh sách file: [phase-0-files.md](phase-0-files.md).
