# Sửa review Phase 0 — 22/10/2026

Phạm vi: sửa nền tảng FR-01/UC1.1, TR-07, NFR-04/05/11; không bắt đầu Phase 1. Không sửa entity, migration V1 hay schema 18 bảng. Giữ Neon main và dữ liệu hiện có.

## Quyết định và thay đổi

| Review | Kết quả |
|---|---|
| A1 | Trả đúng 405/406/415, giữ header Allow/header giao thức. Thiếu query param, sai kiểu, method validation đầu vào → 400 có fieldErrors; lỗi cấp class dùng `_global`. Validation kết quả controller vẫn là 500. Ngắt async/SSE chỉ debug, không ghi body. |
| A2 | §20: seed nền tảng @Order(0) giữ cổng account rỗng. Runner các phase sau có thứ tự/cổng riêng theo khối, không bị account đã có chặn. Chưa tạo runner/dữ liệu nghiệp vụ Phase 1/3. Không reset/branch bắt buộc; mốc tương đối không tự làm mới khi restart. |
| A3 | Theo lựa chọn chủ dự án: JWT giữ quyền cũ tối đa 12h khi khóa/đổi role; /me lấy role từ token, tên từ DB. Đăng nhập mới nhận role mới. Đã cập nhật D10, CLAUDE.md và README. |
| B1 | Thêm MockMvc cho handler/security, validation request/config, ROLE_* của đủ 6 vai trò, từ chối alg=none/HS512, CurrentUser và D10. Thêm Bun tests và script API/browser vào repo. Chuyển trạng thái entity/khóa dòng còn chờ workflow; chưa coi B1 đã phủ toàn hệ thống. |
| B2 | Phần mới có nền tảng ghi Đang làm (Phase 0). Giữ phân loại phạm vi §19 riêng; NFR-11/12 chưa nghiệm thu toàn hệ thống. |
| B5 | Chỉ xóa phiên khi bearer của request bị 401 trùng token hiện tại. Response cũ không xóa phiên mới. |
| B6 | Query không retry 4xx; lỗi mạng/5xx giữ tối đa 3 lần retry. Toast dùng key chung, 401 đồng thời chỉ phát một sự kiện hết phiên. Đổi tài khoản từ tab khác hủy bootstrap cũ và xóa Query cache. |
| B7 | Storage bị chặn không làm app trắng. Đọc/xóa an toàn; lưu thất bại báo rõ trên trang đăng nhập và không nhận đăng nhập thành công. |
| B9 | Phone rỗng/toàn khoảng trắng chỉ báo lỗi bắt buộc; phone sai định dạng báo lỗi định dạng. |
| B10 | Seed khai báo rõ bộ role/tên/SĐT, không dựa thứ tự enum. |
| B11 | Từ chối JWT secret placeholder bắt đầu bằng < (kể cả sau khoảng trắng). Giữ app.seed: true theo spec; chưa đổi mặc định triển khai. |

## Phần giữ lại cho đúng workflow

- B3: siết confirmSeated() khi làm POST mở phiên Phase 1; rà close()/release() cùng thanh toán Phase 3. Giữ idempotency của PATCH theo §13.1.
- B4: chuyển rule OWNER từ URL sang @PreAuthorize khi thêm AccountController Phase 1. Hiện vẫn giữ namespace đã bảo vệ của Phase 0.
- B8: đưa BCrypt ra ngoài transaction là tối ưu tùy chọn, chưa đổi ở lần sửa này.
- B12: thay recipe bằng diff hoặc delete + flush trước insert; làm/test khi có PUT recipe Phase 1.
- CASHIER xem sơ đồ bàn theo §13.4/§15 như hiện tại; sự thiếu nhất quán trong §5 còn ghi nhận. DTO nghiệp vụ cần @Size, ErrorCode cụ thể theo contract khi được thêm.

## Chạy lại từ repo

Từ thư mục backend:

```powershell
cd backend/restaurant-management
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

Cấu hình Neon/JWT riêng trong application-local.yaml theo README. Unit/MockMvc test không cần DB. Máy hiện tại dùng Maven cache trong .cache/maven; có thể đặt MAVEN_USER_HOME và -Dmaven.repo.local trỏ cache này, thêm -o nếu dependencies đã đủ.

Từ thư mục frontend, ở terminal khác:

```powershell
cd frontend
bun install --frozen-lockfile
bun run test
bun run lint
bun run build
bun run dev -- --host 127.0.0.1
```

Từ gốc repo khi app đang chạy:

```powershell
node scripts/phase0-api-check.mjs
```

Script dùng API_URL (mặc định localhost:8080), DEMO_PASSWORD (mặc định Demo@123); không in token/không sửa DB. Yêu cầu 6 tài khoản demo đang ACTIVE. Khóa tài khoản được kiểm bằng test service; không khóa tài khoản chung để thử UI.

Chrome headless dùng Playwright cài riêng trong cache, không thêm dependency production:

```powershell
New-Item -ItemType Directory -Force .cache/phase0-browser | Out-Null
bun add --cwd .cache/phase0-browser playwright@1.64.1
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase0-browser/node_modules/playwright/index.mjs).Path
node scripts/phase0-browser-check.mjs
```

Cần Chrome đã cài; dùng BROWSER_CHANNEL=msedge nếu dùng Edge. FRONTEND_URL mặc định localhost:5173. Script chạy với Vite dev server vì kiểm trực tiếp interceptor/cache của app. URL module theo timestamp HMR lấy từ Vite để kiểm đúng instance đang dùng. UI tài khoản khóa mock HTTP; các trường hợp còn lại dùng API thật, riêng 401 đến muộn được mô phỏng để kiểm nhiều tab.

## Bằng chứng lần chạy này

- Backend clean verify: 38 tests, 0 lỗi.
- Frontend: 10 Bun tests pass; lint và TypeScript/Vite build pass.
- Live API: 22 kiểm tra pass, gồm 6 login + /me, lỗi credentials, 400/401/403/405/406/415. Log app không ghi ERROR cho các lỗi client này.
- Neon chỉ đọc: 18 bảng/106 cột khớp spec; vẫn 6 tài khoản ACTIVE, 3 khu vực, 12 bàn.
- Chrome headless: 26 kiểm tra pass, không có lỗi JavaScript. Đã kiểm 6 role vào đúng trang/reload/logout; sai mật khẩu; UI tài khoản khóa bằng HTTP mock; route 403 và toast API 403; đổi tài khoản giữa hai tab xóa cache; 401 cũ không xóa phiên mới; tablet 834px không tràn ngang; localStorage bị chặn hiển thị lỗi thay vì trắng màn hình.

Checklist 1–4 đã chạy lại: (1) 6 login/trang mặc định, (2) thông báo credentials chung, (3) khóa tài khoản kiểm service thật với mock repository và UI mock HTTP, (4) backend/API và route guard 403. Checklist 3 lần này không đổi status tài khoản trên Neon.

Danh sách file thay đổi: [phase-0-review-files.md](phase-0-review-files.md). App đã chạy lại ở backend localhost:8080, frontend Vite localhost:5173; Flyway/JPA validate thành công, không có migration mới. Bản JAR không chứa application-local.yaml; kiểm tra giá trị DB_PASSWORD/JWT_SECRET riêng không xuất hiện trong file được Git theo dõi hoặc chưa ignore.

Giới hạn: 409 kiểm qua MockMvc với DataIntegrityViolationException, chưa cố tình vi phạm constraint trên Neon. Ngắt SSE được mô phỏng qua exception; endpoint SSE thực thuộc Phase 2. Khóa dòng/các transaction nghiệp vụ chưa có workflow để nghiệm thu. Không dùng lại bộ kiểm tra tạm có sửa trạng thái tài khoản trên DB chung.
