# Phase 0 — Nền tảng (22/10 tối – 23/10 sáng)

**Đọc trước:** §3, §4, §5, §7, §9, §16, §17, §20, §23 và Phụ lục A.
**Requirement:** FR-01 (UC1.1), TR-02/03/04/07, NFR-05/11.
**Checklist cuối phase:** 1–4 (§21.2).

## Backend
1. Tạo project từ start.spring.io: Java 21, Maven, Boot 4.x. Dependencies theo §3.1. Package `vn.ueh.kltn.restaurant`.
2. `application.yml` đúng §23; `application-local.yml` (gitignore) chứa `DB_URL` (endpoint direct của Neon), `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`.
3. `V1__init_schema.sql`: **đủ 18 bảng**, CHECK, partial unique index, index theo §7 và §16. Không thêm bảng thứ 19.
4. 18 entity + enum (§6) + repository. `ddl-auto: validate` phải chạy qua. `@ManyToOne` LAZY, không `@Data`.
5. `exception/`: `BusinessException`, `ErrorCode`, `ErrorResponse`, `GlobalExceptionHandler` (400/401/403/404/409 theo §13.1; `DataIntegrityViolationException` → 409 không lộ SQL). `PageResponse`.
6. Security JWT HS256 (§17): `JwtService`, `SecurityConfig` stateless, `CurrentUser`, `@EnableMethodSecurity`.
7. `AuthController`: `POST /api/auth/login`, `GET /api/auth/me` (UC1.1, §12.1). Sai SĐT/mật khẩu cùng một thông báo; tài khoản `LOCKED` có thông báo riêng.
8. `DataSeeder` (§20): 6 tài khoản `0900000001–06` / `Demo@123`, khu vực, bàn `T01–T12`. Phần món/NVL/kiểm kê/đặt bàn seed ở các phase sau khi service tương ứng có.
9. Swagger ở profile `local`. Xóa test `contextLoads()`.

## Frontend
1. `bun create vite` (React + TS). Cài: antd, @tanstack/react-query, react-router-dom, axios, dayjs, @microsoft/fetch-event-source.
2. `vite.config.ts` proxy `/api` → `http://localhost:8080`.
3. `AuthContext`, `RequireAuth`, `RequireRole`, axios interceptor (gắn JWT, 401 → `/login`, 403 → thông báo).
4. `LoginPage`, `AppLayout` (menu theo vai trò, §5), router với trang mặc định theo vai trò, `utils/labels.ts` (nhãn tiếng Việt cho mọi enum, §6), `StatusTag`, `MoneyText`.
5. Locale `vi_VN` cho antd và dayjs.

## Xong khi
- `.\mvnw.cmd clean verify` và `bun run build` sạch.
- Flyway tạo đủ 18 bảng trên Neon, JPA validate qua.
- 6 tài khoản đăng nhập được và vào đúng trang mặc định; sai role gọi API → 403.

## Prompt
```text
Triển khai Phase 0 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-0.md.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build cả hai phía, chạy app, kiểm checklist 1–4, báo file đã đổi và khác biệt với spec. Không tự sang Phase 1.
```
