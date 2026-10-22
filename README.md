# Quản lý quán ăn phục vụ tại bàn — KLTN UEH

Prototype hỗ trợ vận hành bán hàng tại bàn và quản lý nguyên vật liệu.
Yêu cầu nghiệp vụ: `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md`.
Kế hoạch triển khai: `docs/phase_instructions/`.

## Trạng thái Phase 0

- Backend: Java 21, Spring Boot 4.1.1, Maven wrapper; đã có các dependencies
  theo spec, cấu hình Neon, Flyway và JPA `ddl-auto: validate`.
- Frontend: React + TypeScript + Vite + Bun; Ant Design, TanStack Query,
  React Router, Axios, dayjs và thư viện SSE đã được cài.
- Có migration V1 với đúng 18 bảng domain, entity/repository và các constraint/index
  theo spec. JPA dùng `ddl-auto: validate`, không tự sửa schema.
- Đã có đăng nhập JWT HS256, `/api/auth/me`, lỗi JSON tiếng Việt, route guard và
  menu theo 6 vai trò. Các màn hình nghiệp vụ hiện là khung; xử lý nghiệp vụ được
  triển khai ở Phase 1–4 theo kế hoạch.
- Seed Phase 0 gồm 6 tài khoản, 3 khu vực, 12 bàn. Chi tiết kiểm tra được ghi tại
  `docs/phase_results/phase-0.md`.

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
Hiện có 9 unit test cho đăng nhập và JWT, không cần DB. Sáu nhóm unit test nghiệp
vụ trong §21.1 sẽ được bổ sung theo kế hoạch; không được xem các test auth này
là thay thế cho các nhóm đó.
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
`account` rỗng. Các phase sau thêm runner có thứ tự và cổng riêng theo §20,
để tài khoản đã có không chặn seed món/NVL/định lượng/đặt bàn. Phase 0 chưa
tạo dữ liệu nghiệp vụ này. Giữ Neon `main` hiện có; không tự reset hay ghi đè.
Mốc tương đối tính lúc seed lần đầu, không tự làm mới khi restart. Trước demo
27/10 kiểm tra ngày đặt bàn/HSD và tạo giao dịch mới qua app nếu cần.

Khóa tài khoản chặn đăng nhập mới; JWT đã cấp vẫn giữ role cũ đến khi hết hạn
12 giờ, kể cả khi đổi vai trò (D10 mở rộng đã duyệt). `/me` trả role từ token;
đăng nhập lại nhận role mới. Đăng xuất xóa token ở frontend. Chức năng khóa/đổi vai trò qua
API quản lý tài khoản thuộc Phase 1; Phase 0 mới giữ quyền OWNER cho namespace
`/api/accounts/**`.

Cập nhật `docs/TRACEABILITY.md` khi hoàn thành từng requirement. Không đánh dấu
phase hoàn thành chỉ dựa vào build.

Lệnh chạy lại test và kiểm tra API/Chrome sau review Phase 0:
[phase-0-review.md](docs/phase_results/phase-0-review.md).

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
