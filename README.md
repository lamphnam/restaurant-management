# Quản lý quán ăn phục vụ tại bàn — KLTN UEH

Prototype hỗ trợ vận hành bán hàng tại bàn và quản lý nguyên vật liệu.
Yêu cầu nghiệp vụ: `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md`.
Kế hoạch triển khai: `docs/phase_instructions/`.

## Trạng thái hiện tại — Phase 1 đã sửa review, chuẩn bị Phase 2

- Backend: Java 21, Spring Boot 4.1.1, Maven wrapper; đã có các dependencies
  theo spec, cấu hình Neon, Flyway và JPA `ddl-auto: validate`.
- Frontend: React + TypeScript + Vite + Bun; Ant Design, TanStack Query,
  React Router, Axios, dayjs và thư viện SSE đã được cài.
- Có migration V1 với đúng 18 bảng domain, entity/repository và các constraint/index
  theo spec. JPA dùng `ddl-auto: validate`, không tự sửa schema.
- Đã có đăng nhập JWT, tài khoản, thực đơn/định lượng, đọc NVL, sơ đồ bàn,
  đặt bàn và mở phiên. Bốn route Phase 1 đã có giao diện; các route còn lại
  và `/sessions/:id` vẫn là khung. Chưa có gọi món/SSE/thanh toán.
- Seed nền tảng: 6 tài khoản, 3 khu vực, 12 bàn. Seed Phase 1 có cổng riêng:
  10 món, 10 NVL, định lượng cho 7 món, 3 đặt bàn. Không seed kho ở phase này.
- QA chạy trực tiếp Neon `main` theo duyệt 22/10/2026, không tạo branch.
  Được reset/init demo khi lỗi cần đến, nhưng lần triển khai này không reset.
  Các phiên QA còn ACTIVE vì chưa có thanh toán/đóng phiên.
- Kết quả, checklist từng mục và lệnh kiểm thử: [Phase 1](docs/phase_results/phase-1.md).
- Cả 7 mục review PR #1 đã được xử lý; kết quả mới: **83 test backend**, **13 test
  frontend**, **46 kiểm tra API Neon**, **7 kiểm tra Chrome dùng API mock**,
  **4 test guard QA**. Build backend, frontend và lint đã pass trong đợt sửa review.
  Chi tiết và giới hạn: [review Phase 1](docs/phase_results/phase-1-review.md).
- Phase 2 **chưa triển khai**. Bản bàn giao: [PHASE_2_HANDOFF](docs/PHASE_2_HANDOFF.md).
  Hướng dẫn: [phase-2.md](docs/phase_instructions/phase-2.md).
  Prompt sẵn để giao việc: [phase-2-prompt.md](docs/phase_instructions/phase-2-prompt.md).

Tra cứu tài liệu từ [docs/README.md](docs/README.md). Các số liệu nghiệm thu ban đầu,
sửa review và snapshot dữ liệu có mốc thời gian riêng; không cộng chúng thành một lần chạy.

## Yêu cầu môi trường

JDK 21, Bun và Git. Maven được tải tự động bằng wrapper.

## Chạy backend

Giữ cấu trúc project backend đã khởi tạo tại `backend/restaurant-management/`.
Chạy các lệnh dưới đây từ đúng thư mục này để nạp file cấu hình local:

```powershell
cd D:\capstone_project_ueh\backend\restaurant-management
# Nếu chưa có file local:
# Copy-Item application-local.example.yaml application-local.yaml
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Backend dùng cổng 8080. File `application-local.yaml` nằm ở thư mục gốc của
project backend, được gitignore và không đưa vào JAR. Profile `local` nạp file
này qua `spring.config.import`. Có thể dùng các biến môi trường `DB_URL`,
`DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` thay thế.

Kết nối Neon dùng endpoint **direct** (hostname không có `-pooler`),
`sslmode=require&channelBinding=require`, Hikari tối đa 5 kết nối.
JWT secret cần ít nhất 32 ký tự. Không lưu secrets trong frontend.

Swagger được bật công khai trong profile `local` tại http://localhost:8080/swagger-ui.html.
Đăng nhập tại `POST /api/auth/login`, lấy `accessToken` rồi dùng nút **Authorize**
với Bearer token để thử `GET /api/auth/me`. Ngoài profile `local`, Swagger bị tắt.
API dùng JWT stateless, không dùng đăng nhập HTTP Basic hay session cookie.

```powershell
.\mvnw.cmd clean verify
```

Test `contextLoads()` mặc định đã được bỏ để build không phụ thuộc Neon.
Mốc kiểm chứng sau review Phase 1 là **83 test backend**, không cần DB: auth/JWT,
validation/exception handler, phân quyền, đặt bàn/mở phiên, tài khoản, định lượng,
sơ đồ bàn, seed gate và entity guard của Reservation. Các nhóm tổng tiền,
chuyển trạng thái OrderItem và tiêu hao thuộc Phase 2; kiểm kê/loại bỏ thuộc Phase 3.
Flyway quản lý schema; không dùng `ddl-auto: update` để tự sinh bảng.

## Chạy frontend

```powershell
cd D:\capstone_project_ueh\frontend
bun install
bun run dev
```

Frontend tại http://localhost:5173, proxy `/api` tới http://localhost:8080.
Ant Design và dayjs dùng locale tiếng Việt. Commit `bun.lock` cùng source code.

```powershell
bun run build
bun run lint
bun run test
```

## Tài khoản demo và truy vết

Mật khẩu chung: **Demo@123**. Mật khẩu được hash BCrypt trước khi lưu DB.

| Số điện thoại | Vai trò | Trang mặc định |
|---|---|---|
| 0900000001 | Chủ quán (`OWNER`) | `/reports` |
| 0900000002 | Quản lý (`MANAGER`) | `/reservations` |
| 0900000003 | Thu ngân (`CASHIER`) | `/payment` |
| 0900000004 | Phục vụ (`WAITER`) | `/floor-plan` |
| 0900000005 | Nhân viên bếp (`KITCHEN_STAFF`) | `/kitchen` |
| 0900000006 | Bếp trưởng (`HEAD_CHEF`) | `/kitchen` |

Seed nền tảng (`DataSeeder`, `@Order(0)`) chỉ chạy khi `app.seed = true` và bảng
`account` rỗng. `PhaseOneSeeder` (`@Order(1)`) có cổng riêng cho món/NVL/
định lượng/đặt bàn nên tài khoản đã có không chặn seed Phase 1. Seed kho chờ
Phase 3. Giữ Neon `main`; startup không ghi đè dữ liệu. Chủ dự án cho phép
reset/init demo khi lỗi cần đến theo chính sách QA đã ghi ở đầu README.
Mốc tương đối tính lúc seed lần đầu, không tự làm mới khi restart. Trước demo
27/10 kiểm tra ngày đặt bàn/HSD và tạo giao dịch mới qua app nếu cần.

Khóa tài khoản chặn đăng nhập mới; JWT đã cấp vẫn giữ role cũ đến khi hết hạn
12 giờ, kể cả khi đổi vai trò (D10 mở rộng đã duyệt). `/me` trả role từ token;
đăng nhập lại nhận role mới. Đăng xuất xóa token ở frontend. API quản lý tài khoản
đã có trong Phase 1; `AccountController` dùng `@PreAuthorize` cho OWNER và
không còn rule phân quyền URL riêng cho `/api/accounts/**`.

Cập nhật `docs/TRACEABILITY.md` khi hoàn thành từng requirement. Không đánh dấu
phase hoàn thành chỉ dựa vào build.

Lệnh chạy lại test và kiểm tra API/Chrome sau review Phase 0:
[phase-0-review.md](docs/phase_results/phase-0-review.md).

Sửa review Phase 1 và lệnh kiểm tra hồi quy:
[phase-1-review.md](docs/phase_results/phase-1-review.md).
Chạy `node scripts/phase1-demo-readiness.mjs` để kiểm chỉ đọc trước demo/QA.
Các script QA ghi dữ liệu cần `$env:PHASE1_QA_ALLOW_WRITES = 'main'` cho lần chạy
đó; chúng không tự reset. Script kiểm thử mở phiên sẽ chiếm bàn đến khi dữ liệu
được khôi phục hoặc Phase 3 có luồng thanh toán/đóng phiên.

## Backup/restore Neon

Demo dùng Neon `main` theo lựa chọn của chủ dự án; không bắt buộc tạo branch.
Có thể dùng backup/restore khi chủ dự án cần khôi phục:
PostgreSQL client tools phải cùng hoặc mới hơn major version của server:

```powershell
pg_dump "<neon-direct-connection-uri>" -Fc -f backup.dump
pg_restore --clean --no-owner -d "<neon-direct-connection-uri>" backup.dump
```

`pg_restore --clean` xóa các đối tượng hiện có trong database đích trước khi
khôi phục; chỉ chạy khi đã xác định đúng database cần phục hồi.
