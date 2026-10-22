# Quản lý quán ăn phục vụ tại bàn — KLTN UEH

Prototype hỗ trợ vận hành bán hàng tại bàn và quản lý nguyên vật liệu.
Yêu cầu nghiệp vụ: `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md`.
Kế hoạch triển khai: `docs/phase_instructions/`.

## Trạng thái khởi tạo

- Backend: Java 21, Spring Boot 4.1.1, Maven wrapper; đã có các dependencies
  theo spec, cấu hình Neon, Flyway và JPA `ddl-auto: validate`.
- Frontend: React + TypeScript + Vite + Bun; Ant Design, TanStack Query,
  React Router, Axios, dayjs và thư viện SSE đã được cài.
- Đây là scaffold, chưa hoàn thành Phase 0: chưa có migration 18 bảng, entity,
  JWT login, phân quyền, dữ liệu demo và các màn hình nghiệp vụ.

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

Swagger được bật trong profile `local`. Cấu hình xác thực JWT và quyền truy cập
Swagger sẽ được hoàn thiện cùng phần security của Phase 0; scaffold hiện dùng
cấu hình bảo mật mặc định của Spring Security.

```powershell
.\mvnw.cmd clean verify
```

Test `contextLoads()` mặc định đã được bỏ để build không phụ thuộc Neon.
Sáu nhóm unit test nghiệp vụ sẽ được bổ sung theo spec; hiện chưa có test nghiệp vụ.
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

## Dữ liệu demo và truy vết

Tài khoản demo và seed chưa được tạo. Cập nhật `docs/TRACEABILITY.md` khi hoàn
thành từng requirement. Không đánh dấu phase hoàn thành chỉ dựa vào build.

## Backup/restore Neon

Dùng restore/branch của Neon; trước buổi demo tạo branch `demo-snapshot` từ `main`.
PostgreSQL client tools phải cùng hoặc mới hơn major version của server:

```powershell
pg_dump "<neon-direct-connection-uri>" -Fc -f backup.dump
pg_restore --clean --no-owner -d "<neon-direct-connection-uri>" backup.dump
```

`pg_restore --clean` xóa các đối tượng hiện có trong database đích trước khi
khôi phục; chỉ chạy khi đã xác định đúng database cần phục hồi.
