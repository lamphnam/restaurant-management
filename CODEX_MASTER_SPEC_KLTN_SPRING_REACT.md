# MASTER SPEC — KLTN QUẢN LÝ QUÁN ĂN PHỤC VỤ TẠI BÀN
## Bản rút gọn theo hạn nộp 27/10/2026
### Stack chốt: Java 21 + Spring Boot 4 + Spring Data JPA + PostgreSQL (Neon) · React + Vite + TypeScript + Bun · SSE cho real-time

> **Mục tiêu:** Đặc tả để coding agent hiện thực prototype Web cho khóa luận **“Phân tích, tái thiết kế quy trình nghiệp vụ và xây dựng hệ thống thông tin hỗ trợ vận hành bán hàng và quản lý nguyên vật liệu cho quán ăn phục vụ tại bàn”**.
>
> File này **thay thế** `CODEX_MASTER_SPEC_KLTN_ASPNET_FINAL.md` (bản ASP.NET, giữ lại để tham khảo). Khi hai file khác nhau, **file này thắng**.
>
> Thay đổi so với bản ASP.NET:
> 1. Đổi stack sang Spring Boot + React (mục 3–4).
> 2. Cắt giảm khoảng 30% chức năng để kịp hạn (mục 1).
> 3. Bổ sung định nghĩa bảng `Account` (bản cũ ghi “18 bảng” nhưng chỉ định nghĩa 17).
> 4. Chốt sẵn các quyết định mặc định cho những điểm khóa luận chưa nói rõ (mục 10.2).
> 5. **Đặt tên trong code bằng tiếng Anh** theo chuẩn Java/Spring và React/TypeScript (mục 4.6). Tên trong khóa luận (ERD, Class Diagram) đối chiếu qua **Phụ lục A**. Giao diện người dùng, thông báo lỗi và dữ liệu seed vẫn là tiếng Việt có dấu.
>
> Ưu tiên cao nhất vẫn là **đúng nghiệp vụ khóa luận**, đơn giản, chạy ổn định, dễ demo, truy vết được Requirement → Use Case → dữ liệu → code.

---

# 0. NGUYÊN TẮC BẮT BUỘC KHI AGENT LÀM VIỆC

Agent phải đọc toàn bộ file này trước khi code.

Không tự thêm, xóa hoặc đổi: nghiệp vụ, vai trò, bảng/thực thể, thuộc tính ERD, quan hệ, trạng thái, phạm vi — **kể cả làm lại chức năng đã bị cắt ở mục 1.3** — nếu chưa nêu lý do và được người dùng chấp thuận.

## 0.1 Thứ tự ưu tiên khi tài liệu chưa đồng nhất

1. BR/TR/FR/NFR trong Chương 3
2. Quy trình TO-BE trong Chương 3
3. Đặc tả Use Case trong Chương 4
4. Activity Diagram và Sequence Diagram
5. ERD
6. Class Diagram
7. Chi tiết kỹ thuật trong file này
8. Suy đoán của agent

**Ngoại lệ:** phạm vi hiện thực (giữ / đơn giản hóa / bỏ) theo **mục 1** của file này — đây là quyết định của người dùng vì hạn nộp.

## 0.2 Mỗi lần bắt đầu một Phase

Trước khi sửa code, báo ngắn gọn:
1. Requirement/Use Case đang hiện thực.
2. File dự kiến tạo/sửa.
3. Entity/table liên quan.
4. Business rule cần bảo toàn.
5. Mục checklist (mục 21) sẽ kiểm sau khi xong.

Sau khi hoàn thành:
- backend: `mvnw clean verify` sạch lỗi;
- frontend: `bun run build` sạch lỗi (gồm type-check);
- chạy app và tự kiểm các mục checklist của phase;
- báo file đã sửa, business rule đã xử lý, điểm nào chưa khớp khóa luận.

Không tự bắt đầu phase tiếp theo.

---

# 1. PHẠM VI SAU CẮT GIẢM

Web Application nội bộ cho một quán ăn phục vụ tại bàn khoảng 30–50 bàn, gồm hai chuỗi nghiệp vụ: **vận hành bán hàng tại bàn** và **quản lý nguyên vật liệu (NVL)**. Cả hai chuỗi phải demo được từ đầu đến cuối.

## 1.1 GIỮ — hiện thực đầy đủ

| UC/FR | Chức năng | Vai trò chính |
|---|---|---|
| UC1.1 | Đăng nhập, đăng xuất | Tất cả |
| UC4 | Quản lý tài khoản: tạo, khóa/mở khóa, đổi vai trò | OWNER |
| UC2 | Danh mục NVL: thêm, sửa, ngừng sử dụng | OWNER |
| UC5 | Thực đơn: thêm/sửa món, đổi giá, ngừng/kinh doanh lại | OWNER |
| FR-18 | Định lượng NVL theo món | OWNER, HEAD_CHEF |
| UC8.1 | Mở phiên phục vụ (walk-in hoặc khách đặt trước) | WAITER, MANAGER |
| UC8.2 | Ghi nhận đơn gọi món, gọi thêm | WAITER, MANAGER |
| UC9 | Bếp: bắt đầu, không thể chế biến, hoàn thành + tiêu hao | KITCHEN_STAFF, HEAD_CHEF |
| UC8.3 | Theo dõi và xác nhận đã phục vụ | WAITER |
| UC11.1 | Thanh toán + lịch sử hóa đơn | CASHIER |
| UC11.2 | Đối soát cuối ca + Quản lý xác nhận | CASHIER, MANAGER |
| UC10.3 | Nhập NVL (có lô/HSD) | HEAD_CHEF |
| UC10.2 | Loại bỏ NVL | HEAD_CHEF |
| UC6.2 | Xem tồn, cảnh báo tồn thấp, lô sắp hết hạn/hết hạn | OWNER, HEAD_CHEF |
| UC6.3 | Biến động NVL (đủ 4 loại) | OWNER, HEAD_CHEF |
| TR-11 | Real-time cho sơ đồ bàn, đặt bàn, trạng thái món | — |

## 1.2 ĐƠN GIẢN HÓA

| UC/FR | Giữ lại | Bỏ phần |
|---|---|---|
| UC7 Đặt bàn (FR-03) | Tạo, hủy, tra cứu; kiểm tra sức chứa + trùng lịch; gợi ý bàn phù hợp | Sửa đặt bàn (muốn đổi thì hủy rồi tạo lại) |
| FR-06 Điều chỉnh/hủy món | Hủy món khi còn `PENDING`; bếp báo “Không thể chế biến” | Sửa số lượng/ghi chú món đã gửi bếp |
| UC10.1 Kiểm kê (FR-14) | Kiểm kê theo NVL, tạo điều chỉnh khi lệch | Kiểm kê theo từng lô |
| FR-13 Lô/HSD | Lô + HSD ghi nhận khi nhập; cảnh báo lô sắp hết hạn/đã hết hạn | Tồn theo lô; tiêu hao/kiểm kê theo lô; FEFO |
| UC6.1 + FR-17 | Gộp **1 trang Báo cáo**: doanh thu theo khoảng, số hóa đơn, theo phương thức, top món, tồn thấp, lô cần chú ý, biến động gần đây | Dashboard riêng, biểu đồ |
| FR-16 Lịch sử | Danh sách + bộ lọc: hóa đơn, đặt bàn, biến động kho | Màn hình lịch sử tổng hợp riêng |
| TR-09 Backup | Restore/branch của Neon + lệnh `pg_dump` trong README | Script backup/restore riêng |
| Kiểm thử | 6 unit test logic lõi + checklist 36 mục (mục 21) | 54 acceptance test đầy đủ |

## 1.3 BỎ — không hiện thực

Ghi “**Chưa hiện thực — hướng phát triển**” trong `docs/TRACEABILITY.md`:

- UC1.2 Quên mật khẩu (OTP).
- UC12.1 Sửa thông tin cá nhân.
- UC12.2 Đổi mật khẩu.
- UC3 Thêm/sửa/ngừng khu vực và bàn — dữ liệu khu vực/bàn lấy từ seed, chỉ hiển thị trên sơ đồ bàn.
- Sửa đặt bàn; điều chỉnh số lượng món.
- Quản lý tồn theo lô.

**Backlog nếu còn thời gian** (theo thứ tự, chỉ làm khi người dùng đồng ý): UC12.2 đổi mật khẩu → sửa đặt bàn → UC3 → UC1.2.

## 1.4 Ngoài phạm vi (như bản cũ)

Đặt bàn online cho khách, khách tự gọi món, giao hàng, CRM/loyalty, quản lý nhà cung cấp, PO/báo giá, công nợ/thanh toán nhà cung cấp, HR/payroll/chấm công, kế toán đầy đủ, hóa đơn điện tử/thuế, multi-branch, mobile app riêng, AI, microservices.

---

# 2. REQUIREMENT — NGUỒN CHÍNH CỦA CODE

## 2.1 Business Requirements

- **BR-01:** Tập trung dữ liệu bán hàng, thanh toán, doanh thu và NVL trên một nền tảng.
- **BR-02:** Số hóa xuyên suốt quy trình bán hàng tại bàn từ đặt/bố trí bàn đến thanh toán.
- **BR-03:** Chia sẻ thống nhất thông tin gọi món và trạng thái món giữa phục vụ và bếp.
- **BR-04:** Các lần gọi món trong cùng một phiên liên kết cùng phiên/bàn để theo dõi và thanh toán.
- **BR-05:** Ghi nhận giao dịch, tổng hợp doanh thu và hỗ trợ đối soát theo ca/ngày.
- **BR-06:** Số hóa nhập hàng, tồn, kiểm kê và các biến động chính của NVL.
- **BR-07:** Quản lý lô và hạn sử dụng.
- **BR-08:** Cung cấp thông tin tổng hợp về bán hàng, doanh thu và NVL.
- **BR-09:** Truy xuất được giao dịch và nghiệp vụ quan trọng.
- **BR-10:** Quyền sử dụng phù hợp vai trò.
- **BR-11:** Liên kết món bán → định lượng → tiêu hao → biến động tồn.
- **BR-12:** Quản lý tập trung yêu cầu đặt bàn và cung cấp thông tin cho phục vụ khi khách đến.

## 2.2 Technical Requirements (kèm cách đáp ứng)

| TR | Yêu cầu | Cách đáp ứng |
|---|---|---|
| TR-01 | Web Application | React SPA + REST API Spring Boot |
| TR-02, TR-03 | CSDL tập trung, quan hệ | PostgreSQL trên Neon |
| TR-04 | Mã định danh duy nhất | PK `BIGINT` identity cho mọi bảng (trừ `RecipeItem` dùng PK kép) |
| TR-05 | Lưu thời gian tạo/xác nhận | Các cột thời gian có sẵn trong ERD |
| TR-06 | Lưu người thực hiện | Các FK `createdById`, `cashierId`, `managerId`, `performedById` theo ERD |
| TR-07 | Xác thực + phân quyền | Spring Security + JWT + `@PreAuthorize` |
| TR-08 | Toàn vẹn giao dịch | `@Transactional` ở ServiceImpl + khóa dòng (mục 16) |
| TR-09 | Backup/restore | Restore/branch của Neon + `pg_dump` (mục 24) |
| TR-10 | Responsive | Ant Design grid, dùng tốt trên tablet |
| TR-11 | Thay đổi hiển thị trong thời gian ngắn | SSE + TanStack Query (mục 14) |

## 2.3 Functional Requirements

- **FR-01:** Đăng nhập, tài khoản, phân quyền.
- **FR-02:** Quản lý bàn, thực đơn, giá và trạng thái kinh doanh món.
- **FR-03:** Quản lý đặt bàn.
- **FR-04:** Trạng thái bàn + phiên phục vụ.
- **FR-05:** Đơn gọi món + gọi thêm.
- **FR-06:** Điều chỉnh/hủy món; bếp chỉ báo “Không thể chế biến”; Quản lý can thiệp khi cần.
- **FR-07:** Chuyển đơn đến bếp + cập nhật trạng thái xử lý.
- **FR-08:** Phục vụ theo dõi và xác nhận món đã phục vụ.
- **FR-09:** Tổng hợp món, tính tiền và xác nhận thanh toán.
- **FR-10:** Doanh thu + đối soát cuối ca.
- **FR-11:** Quản lý danh mục NVL.
- **FR-12:** Ghi nhận nhập NVL.
- **FR-13:** Theo dõi tồn, lô, HSD và cảnh báo.
- **FR-14:** Kiểm kê + điều chỉnh chênh lệch.
- **FR-15:** Loại bỏ NVL.
- **FR-16:** Tra cứu lịch sử nghiệp vụ.
- **FR-17:** Thông tin quản trị tổng hợp.
- **FR-18:** Định lượng + tiêu hao NVL theo món.

Trạng thái hiện thực từng FR: xem mục 19.

## 2.4 Non-Functional Requirements

- **NFR-01:** Thao tác thường xuyên phản hồi phù hợp.
- **NFR-02:** Trạng thái bàn/đơn/món cập nhật kịp thời → SSE.
- **NFR-03:** Chính xác về đặt bàn, trạng thái, tiền, doanh thu, nhập, tiêu hao, kiểm kê, tồn → tính ở backend, ràng buộc DB.
- **NFR-04:** Phân quyền truy cập → backend.
- **NFR-05:** Mật khẩu không lưu plaintext → BCrypt.
- **NFR-06:** Truy vết người/thời điểm/nội dung.
- **NFR-07:** UI rõ ràng, ít thao tác thừa.
- **NFR-08:** Dữ liệu đã commit không mất khi reload/đăng nhập lại.
- **NFR-09:** Đủ cho 30–50 bàn và nhiều user nội bộ.
- **NFR-10:** Trình duyệt phổ biến.
- **NFR-11:** Code dễ bảo trì → phân lớp rõ (mục 4).
- **NFR-12:** Thuật ngữ/trạng thái/UI nhất quán → bảng nhãn ở mục 6.

---

# 3. STACK KỸ THUẬT CHỐT

## 3.1 Backend

- **Java 21 LTS**.
- **Spring Boot 4.x** (bản stable mới nhất trên start.spring.io), build bằng **Maven**.
- Dependencies:
  - Spring Web MVC (REST);
  - Spring Data JPA (Hibernate);
  - Spring Security + OAuth2 Resource Server (để giải mã JWT HS256, không dùng OAuth server ngoài);
  - Bean Validation;
  - Flyway + `flyway-database-postgresql`;
  - PostgreSQL JDBC driver;
  - Lombok;
  - springdoc-openapi (Swagger UI), bản tương thích Boot 4.
- Ghi chú Boot 4:
  - auto-config được tách module, nên dùng `spring-boot-starter-flyway` (không chỉ thêm `flyway-core`);
  - Jackson 3 là mặc định;
  - gặp khác biệt API so với Boot 3 thì tra tài liệu chính thức Boot 4, **không tự hạ phiên bản**.

## 3.2 Frontend

- **React + TypeScript + Vite**, dùng **Bun** làm package manager và script runner (`bun create vite`, `bun install`, `bun run dev`).
- **Ant Design**: Table, Form, Modal, Drawer, Tag, DatePicker, Popconfirm. Dùng locale `vi_VN` và `dayjs` locale `vi`.
- **TanStack Query**: server state, cache, invalidation.
- **React Router**.
- **Axios**: interceptor gắn JWT, xử lý 401/403.
- **@microsoft/fetch-event-source**: SSE có gửi header `Authorization`.
- Không dùng Redux/Zustand (AuthContext là đủ), Tailwind (Ant Design là đủ), Next.js.

## 3.3 Database — Neon

- PostgreSQL trên **Neon**; không cài Postgres local, không Docker.
- Một project Neon:
  - branch `main` cho dữ liệu demo;
  - có thể tạo thêm branch `dev` để phát triển.
- Dùng **endpoint direct** (host **không** có `-pooler`), vì Flyway dùng advisory lock, không chạy ổn qua PgBouncer transaction pooling.
- JDBC URL dạng `jdbc:postgresql://<host>/<db>?sslmode=require`; username/password đưa vào qua biến môi trường hoặc file local không commit.
- Hikari pool nhỏ: `maximum-pool-size: 5`.
- Neon free tự suspend compute khi rảnh, nên request đầu tiên sau đó chậm khoảng 1 giây. Đây là bình thường.
- Schema do **Flyway** quản lý; JPA chỉ `ddl-auto: validate`.
- Không dùng Neon Auth/Data API.

## 3.4 Real-time — SSE (Server-Sent Events)

Chọn **SSE + TanStack Query invalidation**, vì:

- Chỉ cần đẩy từ server xuống client: bếp thấy món mới, phục vụ thấy món xong, sơ đồ bàn đổi trạng thái. Mọi thao tác ghi đi qua REST.
- Có sẵn trong Spring MVC (`SseEmitter`):
  - không cần message broker, không cần STOMP;
  - chạy trên HTTP thường, đi qua Vite proxy được.
- Event chỉ là **tín hiệu “có thay đổi”**. Client nhận tín hiệu thì gọi lại REST để lấy dữ liệu mới, nên dữ liệu luôn đến từ một nguồn, không lệch.
- Monolith một instance, nên registry emitter trong bộ nhớ là đủ.
- Dự phòng: TanStack Query `refetchInterval` 30 giây, cộng với refetch khi focus/reconnect.

Không chọn:
- WebSocket/STOMP: hai chiều, cấu hình auth phức tạp hơn, không cần.
- Polling 2–3 giây: tốn request, chậm hơn.
- Postgres LISTEN/NOTIFY: không cần với một instance.
- Dịch vụ ngoài (Pusher/Ably/Supabase Realtime).

Chi tiết hiện thực ở mục 14.

---

# 4. KIẾN TRÚC CODE — MONOLITH, PHÂN LỚP RÕ

## 4.1 Cấu trúc repo

```text
restaurant-management/
├── backend/            # Spring Boot (Maven)
├── frontend/           # React + Vite + TS (Bun)
├── docs/
│   └── TRACEABILITY.md
├── .gitignore
└── README.md
```

## 4.2 Backend

```text
backend/
├── pom.xml
└── src/main/
    ├── java/vn/ueh/kltn/restaurant/          # package gốc — đổi tùy ý
    │   ├── RestaurantApplication.java
    │   ├── config/        # SecurityConfig, JwtConfig, OpenApiConfig, AppProperties
    │   ├── security/      # JwtService, CurrentUser (lấy accountId từ JWT)
    │   ├── controller/    # REST controller — mục 13
    │   ├── service/       # interface
    │   │   └── impl/      # *ServiceImpl
    │   ├── repository/    # Spring Data JPA
    │   ├── entity/        # 18 entity theo ERD
    │   ├── enums/
    │   ├── dto/
    │   │   ├── request/
    │   │   └── response/
    │   ├── mapper/        # map tay Entity → Response DTO
    │   ├── exception/     # BusinessException, ErrorCode, GlobalExceptionHandler, ErrorResponse
    │   ├── realtime/      # SseHub, RealtimeEvent, RealtimeEventListener
    │   └── seed/          # DataSeeder
    └── resources/
        ├── application.yml
        ├── application-local.yml        # gitignore — chứa DB_URL, JWT_SECRET
        └── db/migration/
            └── V1__init_schema.sql      # 18 bảng + constraint + index
```

## 4.3 Quy tắc phân lớp: Controller → Service → ServiceImpl → Repository

**Controller**
- Nhận request DTO và validate bằng `@Valid`.
- Phân quyền bằng `@PreAuthorize`.
- Gọi Service, trả response DTO.
- Không chứa business logic, không gọi Repository trực tiếp.

**Service (interface) + ServiceImpl**
- ServiceImpl chứa workflow, business rule, tính toán nghiệp vụ, `@Transactional`, khóa dòng, phát event real-time.
- Hàm chỉ đọc dùng `@Transactional(readOnly = true)`.

**Repository**
- Spring Data JPA; query phức tạp dùng `@Query` JPQL/native và projection (record).
- Không chứa business rule.

**Entity**
- Ánh xạ 18 bảng ERD.
- Chứa các phương thức chuyển trạng thái/tính toán đơn giản theo Class Diagram (mục 8). Chuyển sai trạng thái thì ném `BusinessException`.
- **Không trả entity ra API**; luôn map sang DTO.

**DTO**
- Dùng Java `record`.
- Request có Bean Validation; response phẳng, phục vụ đúng màn hình.

**Mapper**
- Map tay, dùng static method hoặc `@Component`. Không dùng MapStruct.

**Exception**
- `GlobalExceptionHandler` (`@RestControllerAdvice`) trả JSON thống nhất (mục 13.1).

**Quy ước JPA**
- `spring.jpa.open-in-view=false`.
- Mọi `@ManyToOne` dùng `fetch = LAZY`.
- Không dùng `@Data` trên entity; dùng `@Getter`, `@Setter` có chọn lọc, `@NoArgsConstructor(access = PROTECTED)`.
- Chỉ khai báo `@OneToMany` cho 3 quan hệ composition: `FoodOrder`, `StockReceipt`, `Stocktake` → chi tiết.
- Danh sách dùng `JOIN FETCH` hoặc projection để tránh N+1.

**Đặt tên**
- Xem quy ước đầy đủ ở mục 4.6 và bảng đối chiếu tên khóa luận ở Phụ lục A.

## 4.4 Frontend

```text
frontend/
├── vite.config.ts       # proxy /api → http://localhost:8080
├── package.json
└── src/
    ├── main.tsx
    ├── router.tsx       # route + guard theo vai trò
    ├── api/             # axios instance + 1 file/controller (tableApi.ts, kitchenApi.ts, ...)
    ├── auth/            # AuthContext, RequireAuth, RequireRole
    ├── layouts/         # AppLayout: menu theo vai trò
    ├── pages/           # mỗi màn hình 1 thư mục — mục 15
    ├── components/      # StatusTag, MoneyText, ...
    ├── realtime/        # useRealtime.ts
    ├── types/           # type TS khớp DTO backend
    └── utils/           # format tiền/thời gian, nhãn trạng thái tiếng Việt
```

Frontend chỉ hiển thị và tương tác. **Không quyết định business rule** quan trọng; validate ở form chỉ để UX, backend luôn validate lại.

## 4.5 Không dùng

Microservices, Maven multi-module, Clean/Hexagonal Architecture, CQRS, generic repository/`BaseService<T>`, MapStruct, Redis, Kafka/RabbitMQ, GraphQL, Docker bắt buộc, Redux, Next.js.

## 4.6 Quy ước đặt tên (tiếng Anh)

Mọi định danh trong code (class, field, method, bảng, cột, enum, URL, route, query key, config key) dùng tiếng Anh. Chỉ giao diện, thông báo lỗi trả về UI, ghi chú và dữ liệu seed là tiếng Việt có dấu.

| Phạm vi | Quy ước | Ví dụ |
|---|---|---|
| Java class / enum / record | `PascalCase` | `ServiceSession`, `OrderItemStatus`, `CreateReservationRequest` |
| Java field / method / biến | `camelCase`, method là động từ | `guestCount`, `markReady()`, `checkOverlap(...)` |
| Boolean | tiền tố `is`/`has`/`can` cho method | `isExpired()`, `hasEnoughCapacity()`; field `trackLot`, `trackExpiry` giữ theo cột |
| Giá trị enum | `UPPER_SNAKE_CASE` | `PENDING`, `BANK_TRANSFER` |
| Hậu tố lớp kỹ thuật | `Controller`, `Service`, `ServiceImpl`, `Repository`, `Request`, `Response`, `Mapper` | `ServiceSessionController`, `ReservationServiceImpl`, `ReservationResponse` |
| DTO | `<Hành động><Đối tượng>Request` / `<Đối tượng>Response` | `CreateReservationRequest`, `FloorPlanResponse` |
| Package | chữ thường, một từ | `controller`, `service.impl`, `dto.request` |
| Bảng DB | `snake_case`, **số ít** | `service_session`, `stock_movement` |
| Cột DB | `snake_case`; khóa chính là `id`; khóa ngoại là `<đối tượng>_id` | `id`, `table_id`, `created_by_id` |
| Thời điểm / người thực hiện | `<hành động>_at` / `<hành động>_by_id` | `created_at`, `paid_at`, `performed_by_id` |
| JSON field | `camelCase`, trùng tên field của DTO | `guestCount`, `unitPriceAtOrder` |
| REST URL | `kebab-case`, danh từ **số nhiều**; hành động chuyển trạng thái là động từ ở cuối | `/api/menu-items`, `/api/reservations/{id}/cancel` |
| Config key (`application.yml`) | `kebab-case` | `app.alert.expiry-days` |
| File React component / page | `PascalCase.tsx` | `FloorPlanPage.tsx`, `StatusTag.tsx` |
| Hook | `useXxx` | `useRealtime`, `useFloorPlan` |
| File API / util / type | `camelCase.ts` | `tableApi.ts`, `labels.ts` |
| Route frontend | `kebab-case` | `/floor-plan`, `/inventory/stocktake` |
| TanStack Query key | mảng `kebab-case` | `['floor-plan']`, `['session', sessionId]` |

Quy ước ánh xạ: khóa chính ERD dạng `maXxx` thành `id`; khóa ngoại `maXxx` thành `xxxId` (field) / `xxx_id` (cột). Tên entity/bảng/cột/phương thức trong khóa luận xem Phụ lục A.

---

# 5. VAI TRÒ VÀ PHÂN QUYỀN

Sáu vai trò nội bộ: `OWNER`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN_STAFF`, `HEAD_CHEF`.

| Vai trò | Màn hình (mục 15) | Quyền chính | Trang mặc định |
|---|---|---|---|
| OWNER | Báo cáo, Tài khoản, Thực đơn, Kho, Hóa đơn, Sơ đồ bàn (xem), Đặt bàn (xem) | Tài khoản/vai trò; thực đơn, giá, ngừng kinh doanh; danh mục NVL; định lượng; xem doanh thu, tồn, lô/HSD, biến động | `/reports` |
| MANAGER | Đặt bàn, Sơ đồ bàn, Phiên phục vụ, Đối soát, Hóa đơn | Tạo/hủy/tra cứu đặt bàn; hỗ trợ mở phiên, gọi món, hủy món; xác nhận đối soát | `/reservations` |
| CASHIER | Thanh toán, Hóa đơn, Đối soát | Xem phiên cần thanh toán, xác nhận thanh toán, lập đối soát | `/payment` |
| WAITER | Sơ đồ bàn, Phiên phục vụ, Món chờ phục vụ, Đặt bàn (xem) | Tra cứu đặt bàn, mở phiên, gọi món/gọi thêm, hủy món, xác nhận đã phục vụ | `/floor-plan` |
| KITCHEN_STAFF | Bếp | Bắt đầu chế biến, không thể chế biến + lý do, hoàn thành | `/kitchen` |
| HEAD_CHEF | Bếp, Kho, Nhập, Kiểm kê, Thực đơn (chỉ định lượng) | Mọi chức năng bếp; xem tồn/lô/HSD/cảnh báo/biến động; định lượng; nhập; kiểm kê; loại bỏ | `/kitchen` |

Quy tắc:
- **Backend quyết định quyền** (`@PreAuthorize`); UI ẩn menu chỉ là tiện lợi, không phải bảo mật.
- Một `Account` có đúng một `role`; người dùng không tự đổi vai trò.
- Chỉ `OWNER` quản lý tài khoản. `OWNER` không được tự khóa hoặc tự đổi vai trò của chính mình.

---

# 6. TRẠNG THÁI NGHIỆP VỤ

Enum trong code và DB dùng tiếng Anh, `UPPER_SNAKE_CASE`; UI hiển thị nhãn tiếng Việt có dấu theo bảng dưới. Mọi màn hình dùng chung một hàm map nhãn (`frontend/src/utils/labels.ts`).

| Enum | Giá trị → Nhãn UI |
|---|---|
| `AccountStatus` | `ACTIVE` Hoạt động · `LOCKED` Bị khóa |
| `AreaStatus` | `ACTIVE` Hoạt động · `INACTIVE` Ngừng sử dụng |
| `TableStatus` | `AVAILABLE` Trống · `OCCUPIED` Đang phục vụ · `INACTIVE` Ngừng sử dụng |
| `ReservationStatus` | `CONFIRMED` Đã xác nhận · `SEATED` Đã nhận bàn · `CANCELLED` Đã hủy |
| `SessionStatus` | `ACTIVE` Đang hoạt động · `CLOSED` Đã kết thúc |
| `OrderItemStatus` | `PENDING` Chờ chế biến · `COOKING` Đang chế biến · `READY` Hoàn thành · `SERVED` Đã phục vụ · `UNAVAILABLE` Không thể chế biến · `CANCELLED` Đã hủy |
| `MenuItemStatus` | `ON_SALE` Đang kinh doanh · `DISCONTINUED` Ngừng kinh doanh |
| `IngredientStatus` | `ACTIVE` Đang sử dụng · `INACTIVE` Ngừng sử dụng |
| `MovementType` | `RECEIPT` Nhập · `CONSUMPTION` Tiêu hao · `STOCKTAKE_ADJUSTMENT` Điều chỉnh kiểm kê · `DISPOSAL` Loại bỏ |
| `PaymentMethod` | `CASH` Tiền mặt · `BANK_TRANSFER` Chuyển khoản |
| `Role` | `OWNER` Chủ quán · `MANAGER` Quản lý · `CASHIER` Thu ngân · `WAITER` Nhân viên phục vụ · `KITCHEN_STAFF` Nhân viên bếp · `HEAD_CHEF` Bếp trưởng |

Chuyển trạng thái hợp lệ:

```text
TableStatus:        AVAILABLE -> OCCUPIED (mở phiên) -> AVAILABLE (thanh toán)
ReservationStatus: CONFIRMED -> SEATED (mở phiên) | CANCELLED (hủy)
SessionStatus:      ACTIVE -> CLOSED (thanh toán)
OrderItemStatus:
  luồng chính:  PENDING -> COOKING -> READY -> SERVED
  bếp báo lỗi:  PENDING | COOKING -> UNAVAILABLE (bắt buộc lý do)
  hủy:          PENDING -> CANCELLED (chỉ phục vụ/quản lý; bếp không hủy)
```

“Có đặt trước” **không** là trạng thái lưu của bàn; UI suy ra từ `Reservation`.

---

# 7. 18 BẢNG — PHẢI KHỚP ERD

Database domain có **đúng 18 bảng**, tạo trong `V1__init_schema.sql`. Không thêm bảng domain thứ 19. Bảng `flyway_schema_history` là bảng kỹ thuật, không tính.

Quy ước kiểu:
- PK: `BIGINT GENERATED BY DEFAULT AS IDENTITY` (Java `Long`).
- Tiền: `NUMERIC(14,0)` VND (Java `BigDecimal`).
- Số lượng NVL: `NUMERIC(12,3)` (Java `BigDecimal`).
- Thời điểm: `TIMESTAMPTZ` (Java `Instant`).
- Ngày HSD: `DATE` (Java `LocalDate`).
- Enum: `VARCHAR(30)` + `CHECK (... IN (...))` (Java `@Enumerated(EnumType.STRING)`).
- Mọi cột `NOT NULL` trừ các cột ghi `NULL`.

## 7.1 Account *(bổ sung — bản cũ thiếu định nghĩa)*
```text
id             PK
full_name      VARCHAR(100)
phone          VARCHAR(15)   UNIQUE
password_hash  VARCHAR(100)  -- BCrypt hash, không bao giờ plaintext
role           VARCHAR(30)   CHECK enum Role
status         VARCHAR(30)   CHECK enum AccountStatus
```

## 7.2 DiningArea
```text
id      PK
name    VARCHAR(100)
status  VARCHAR(30)
```

## 7.3 DiningTable
```text
id        PK
area_id   FK -> dining_area
name      VARCHAR(50)
capacity  INT                CHECK (capacity > 0)
status    VARCHAR(30)
```

## 7.4 Reservation
```text
id              PK
table_id        FK -> dining_table
created_by_id   FK -> account
customer_name   VARCHAR(100)
customer_phone  VARCHAR(15)
guest_count     INT                 CHECK (> 0)
start_time      TIMESTAMPTZ
end_time        TIMESTAMPTZ         CHECK (start_time < end_time)
note            VARCHAR(500)        NULL
status          VARCHAR(30)
created_at      TIMESTAMPTZ
```

## 7.5 ServiceSession
```text
id              PK
table_id        FK -> dining_table
reservation_id  FK -> reservation   NULL   -- NULL = walk-in
created_by_id   FK -> account
opened_at       TIMESTAMPTZ
closed_at       TIMESTAMPTZ         NULL
status          VARCHAR(30)
```
Ràng buộc:
- `UNIQUE (table_id) WHERE status = 'ACTIVE'` — một bàn tối đa một phiên đang hoạt động.
- `UNIQUE (reservation_id) WHERE reservation_id IS NOT NULL` — một đặt bàn chỉ thành tối đa một phiên.

## 7.6 FoodOrder
```text
id             PK
session_id     FK -> service_session
created_by_id  FK -> account
created_at     TIMESTAMPTZ
```
Mỗi lần gọi thêm tạo một `FoodOrder` mới trong cùng `ServiceSession`.

## 7.7 OrderItem
```text
id                   PK
order_id             FK -> food_order
menu_item_id         FK -> menu_item
quantity             INT               CHECK (> 0)
note                 VARCHAR(500)      NULL   -- chỉ MỘT cột note
status               VARCHAR(30)
unavailable_reason   VARCHAR(500)      NULL
unit_price_at_order  NUMERIC(14,0)     CHECK (>= 0)
CHECK (status <> 'UNAVAILABLE' OR unavailable_reason IS NOT NULL)
```
`unit_price_at_order` = snapshot `MenuItem.price` lúc gọi; đổi giá món sau đó không ảnh hưởng.

## 7.8 MenuItem
```text
id      PK
name    VARCHAR(100)
price   NUMERIC(14,0)  CHECK (>= 0)
status  VARCHAR(30)
```

## 7.9 RecipeItem
```text
menu_item_id          FK -> menu_item
ingredient_id         FK -> ingredient
quantity_per_serving  NUMERIC(12,3)     CHECK (> 0)
PRIMARY KEY (menu_item_id, ingredient_id)
```
JPA: `@EmbeddedId` + `@MapsId`.

## 7.10 Ingredient
```text
id            PK
name          VARCHAR(100)
unit          VARCHAR(20)
min_stock     NUMERIC(12,3)  CHECK (>= 0)
track_lot     BOOLEAN
track_expiry  BOOLEAN
status        VARCHAR(30)
```

## 7.11 IngredientLot
```text
id             PK
ingredient_id  FK -> ingredient
lot_number     VARCHAR(50)       NULL
expiry_date    DATE              NULL
```

## 7.12 StockReceipt
```text
id             PK
created_by_id  FK -> account
created_at     TIMESTAMPTZ
```

## 7.13 StockReceiptItem
```text
id             PK
receipt_id     FK -> stock_receipt
ingredient_id  FK -> ingredient
lot_id         FK -> ingredient_lot  NULL
quantity       NUMERIC(12,3)         CHECK (> 0)
```

## 7.14 Stocktake
```text
id             PK
created_by_id  FK -> account
created_at     TIMESTAMPTZ
```

## 7.15 StocktakeItem
```text
id               PK
stocktake_id     FK -> stocktake
ingredient_id    FK -> ingredient
lot_id           FK -> ingredient_lot  NULL   -- bản rút gọn luôn NULL
system_quantity  NUMERIC(12,3)
actual_quantity  NUMERIC(12,3)         CHECK (>= 0)
note             VARCHAR(500)          NULL
```
`difference = actualQuantity − systemQuantity` (tính, không lưu cột).

## 7.16 StockMovement — ledger trung tâm
```text
id                 PK
ingredient_id      FK -> ingredient
lot_id             FK -> ingredient_lot      NULL
receipt_item_id    FK -> stock_receipt_item  NULL
order_item_id      FK -> order_item          NULL
stocktake_item_id  FK -> stocktake_item      NULL
performed_by_id    FK -> account
movement_type      VARCHAR(30)
quantity_change    NUMERIC(12,3)             CHECK (<> 0)
reason             VARCHAR(500)              NULL
occurred_at        TIMESTAMPTZ
```
Ràng buộc nguồn và dấu theo loại:
```sql
CHECK (
  (movement_type = 'RECEIPT'               AND quantity_change > 0 AND receipt_item_id    IS NOT NULL) OR
  (movement_type = 'CONSUMPTION'           AND quantity_change < 0 AND order_item_id     IS NOT NULL) OR
  (movement_type = 'STOCKTAKE_ADJUSTMENT'                           AND stocktake_item_id IS NOT NULL) OR
  (movement_type = 'DISPOSAL'            AND quantity_change < 0 AND reason               IS NOT NULL)
)
UNIQUE (receipt_item_id)    WHERE receipt_item_id IS NOT NULL
UNIQUE (stocktake_item_id) WHERE stocktake_item_id IS NOT NULL
UNIQUE (order_item_id, ingredient_id) WHERE movement_type = 'CONSUMPTION'  -- chặn trừ kho 2 lần ở mức DB
```

## 7.17 Invoice
```text
id              PK
session_id      FK -> service_session  UNIQUE   -- một phiên chỉ thanh toán một lần
cashier_id      FK -> account
payment_method  VARCHAR(30)
amount          NUMERIC(14,0)          CHECK (>= 0)
paid_at         TIMESTAMPTZ
```

## 7.18 RevenueReconciliation
```text
id                 PK
cashier_id         FK -> account
manager_id         FK -> account               NULL   -- NULL = chưa được Quản lý xác nhận
start_time         TIMESTAMPTZ
end_time           TIMESTAMPTZ                 CHECK (start_time < end_time)
system_revenue     NUMERIC(14,0)
actual_amount      NUMERIC(14,0) CHECK (>= 0)
difference_reason  VARCHAR(500)                NULL
reconciled_at      TIMESTAMPTZ
```
Không thêm cột `status`.

Không tạo các bảng: `stock_balance` (tồn kho), `revenue` (doanh thu), `otp`, `disposal_receipt` (phiếu loại bỏ), `work_shift` (ca làm việc), `refresh_token`.

---

# 8. CLASS DIAGRAM — 18 LỚP NGHIỆP VỤ

Class Diagram là mô hình trực quan, không phải API bắt buộc. Code phải bảo toàn **ý nghĩa**. Thuộc tính: như mục 7 (bỏ FK). Phương thức hiện thực như sau:

| Lớp | Phương thức | Hiện thực |
|---|---|---|
| Account | `verifyPassword()` | `AuthServiceImpl` dùng `PasswordEncoder.matches` |
| Account | `lock()`, `unlock()`, `changeRole()` | Entity method |
| Account | `updateInfo()`, `changePassword()` | Không cần (UC12 bỏ) |
| DiningArea | `updateInfo()`, `activate()`, `deactivate()` | Không cần (UC3 bỏ) |
| DiningTable | `hasEnoughCapacity(guestCount)` | Entity method, dùng trong `ReservationServiceImpl` |
| DiningTable | `updateInfo()`, `activate()`, `deactivate()` | Không cần (UC3 bỏ) |
| Reservation | `checkOverlap()` | `ReservationServiceImpl.checkOverlap()` (cần truy vấn DB) |
| Reservation | `cancel()`, `confirmSeated()` | Entity method, kiểm tra trạng thái hợp lệ |
| Reservation | `updateInfo()` | Không cần (bỏ sửa đặt bàn) |
| ServiceSession | `calculateTotal()`, `checkPayable()` | `PaymentServiceImpl` (dựa trên chi tiết của phiên) |
| ServiceSession | `close()` | Entity method: `CLOSED` + `closedAt` |
| FoodOrder | `addItem()`, `calculateTotal()` | Entity method |
| OrderItem | `calculateSubtotal()`, `startCooking()`, `markUnavailable(reason)`, `markReady()`, `cancel()`, `markServed()` | Entity method, guard chuyển trạng thái theo mục 6 |
| MenuItem | `updateInfo()`, `changePrice()`, `activate()`, `discontinue()` | Entity method |
| RecipeItem | `calculateConsumption(portions)` | Entity method: `quantityPerServing × portions` |
| Ingredient | `updateInfo()`, `activate()`, `deactivate()` | Entity method |
| Ingredient | `isBelowMinStock(currentStock)` | Entity method (tồn tính từ `StockMovement`) |
| IngredientLot | `isExpired(today)`, `isExpiringSoon(today, days)` | Entity method |
| StockReceipt | `addItem()` | Entity method |
| Stocktake | `addItem()` | Entity method |
| StocktakeItem | `calculateDifference()` | Entity method |
| StockMovement | `isIncrease()`, `isDecrease()` | Entity method |
| RevenueReconciliation | `calculateDifference()`, `confirm(manager)` | Entity method |
| StockReceiptItem, Invoice | — | Không có phương thức riêng |

Controller, Service, ServiceImpl, Repository, DTO, Mapper là **chi tiết hiện thực**, không phải lớp của Class Diagram khóa luận. Không sửa Class Diagram để thêm chúng.

---

# 9. QUAN HỆ DỮ LIỆU CHÍNH

```text
DiningArea 1 ---- * DiningTable
DiningTable 1 ---- * Reservation
Account 1 ---- * Reservation
DiningTable 1 ---- * ServiceSession
Reservation 0..1 ---- 0..1 ServiceSession
Account 1 ---- * ServiceSession
ServiceSession 1 ---- * FoodOrder
Account 1 ---- * FoodOrder
FoodOrder 1 ◆---- * OrderItem          (composition)
MenuItem 1 ---- * OrderItem
MenuItem 1 ---- * RecipeItem
Ingredient 1 ---- * RecipeItem
Ingredient 1 ---- * IngredientLot
StockReceipt 1 ◆---- * StockReceiptItem          (composition)
Ingredient 1 ---- * StockReceiptItem
IngredientLot 0..1 ---- * StockReceiptItem
Account 1 ---- * StockReceipt
Stocktake 1 ◆---- * StocktakeItem           (composition)
Ingredient 1 ---- * StocktakeItem
IngredientLot 0..1 ---- * StocktakeItem
Account 1 ---- * Stocktake
Ingredient 1 ---- * StockMovement
IngredientLot 0..1 ---- * StockMovement
StockReceiptItem 0..1 ---- 1 StockMovement      (*)
StocktakeItem 0..1 ---- 0..1 StockMovement
OrderItem 0..1 ---- * StockMovement
Account 1 ---- * StockMovement
ServiceSession 1 ---- 0..1 Invoice
Account 1 ---- * Invoice
Account 1 ---- * RevenueReconciliation   (Thu ngân lập)
Account 0..1 ---- * RevenueReconciliation (Quản lý xác nhận)
```

(*) Bản spec cũ thiếu bội số phía `StockMovement`. Hiện thực: mỗi `StockReceiptItem` sinh đúng 1 `StockMovement` loại `RECEIPT`. **Người dùng đối chiếu lại với hình ERD.**

Composition trên Class Diagram **không** có nghĩa là xóa cascade ở DB. Mọi FK dùng `ON DELETE RESTRICT` (mặc định `NO ACTION`); không hard-delete dữ liệu lịch sử. Master data dùng trạng thái ngừng sử dụng/ngừng kinh doanh.

---

# 10. XỬ LÝ ĐIỂM CHƯA ĐỒNG NHẤT VÀ QUYẾT ĐỊNH MẶC ĐỊNH

## 10.1 Từ bản cũ (giữ nguyên)

1. **Ca làm việc:** không có bảng ca làm việc (`work_shift`). “Ca” = khoảng `[startTime, endTime)` của `RevenueReconciliation`. Hóa đơn thuộc ca nếu `paidAt >= startTime AND paidAt < endTime`. Không thêm khóa ngoại ca làm việc (`shift_id`) vào `Invoice`.
2. **Trạng thái bàn:** chỉ lưu `AVAILABLE`/`OCCUPIED`/`INACTIVE`; “có đặt trước” suy ra từ `Reservation`.
3. **ERD lặp `note`** trong `OrderItem`: chỉ tạo một cột.
4. **Service/Controller/DTO/Repository** không phải lớp nghiệp vụ của khóa luận.
5. **Tồn đầu kỳ:** không có loại biến động `OPENING_BALANCE`. Dùng một `Stocktake` khởi tạo: `systemQuantity = 0`, `actualQuantity = tồn đầu` → sinh `STOCKTAKE_ADJUSTMENT`.
6. **Biến động NVL** hiển thị đủ 4 loại `RECEIPT`, `CONSUMPTION`, `STOCKTAKE_ADJUSTMENT`, `DISPOSAL` (phục vụ BR-11/FR-18).
7. **Lô:** không FEFO tự động. `CONSUMPTION` có `lotId = NULL`. Tồn tổng theo NVL là số liệu chính; không hiển thị “tồn theo lô”.

## 10.2 Quyết định mặc định mới — người dùng có thể đổi

| # | Vấn đề | Quyết định |
|---|---|---|
| D1 | Đặt bàn “còn hiệu lực” | `CONFIRMED` và `endTime > now`. Kiểm tra trùng lịch so với các đơn `CONFIRMED` và `SEATED`. Không thêm trạng thái “không đến”; đơn quá giờ chỉ hiển thị nhãn “Quá giờ” (suy ra) trên UI. |
| D2 | Walk-in ở bàn sắp có khách đặt | Cho phép. Sơ đồ bàn trả kèm đặt bàn sắp tới trong `app.reservation.upcoming-warning-minutes` (mặc định 60); UI hỏi xác nhận trước khi mở phiên walk-in. Backend không chặn. |
| D3 | Mở phiên cho khách đặt trước | Chỉ gắn được đơn `CONFIRMED`, cùng `tableId`, `endTime > now`. |
| D4 | Hủy món | Chỉ khi `PENDING` (WAITER, MANAGER). Món `COOKING` không hủy; bếp dùng “Không thể chế biến” nếu cần. |
| D5 | Tiêu hao làm tồn âm | Vẫn cho hoàn thành món (không chặn bếp). Trang tồn kho tô đỏ tồn âm để Bếp trưởng kiểm kê. |
| D6 | Loại bỏ | Chọn NVL; lô tùy chọn (chỉ ghi nguồn). Số lượng không vượt **tồn tổng** của NVL. |
| D7 | Kiểm kê | Theo NVL (`lotId = NULL`). `systemQuantity` do backend tính lúc xác nhận, không lấy từ client. |
| D8 | Thanh toán | Món `READY` chưa `SERVED` vẫn tính tiền, không chặn. Chỉ chặn khi còn `PENDING`/`COOKING`. Phiên có tổng 0đ (khách về, không gọi món) vẫn thanh toán được với `amount = 0` để đóng phiên. |
| D9 | Đối soát | Xem chi tiết bên dưới bảng. |
| D10 | Khóa tài khoản / đổi vai trò | Khóa chặn đăng nhập mới. JWT đã cấp giữ quyền trong claim `role` đến hết hạn `app.jwt.expiration-hours` (12h cho demo), kể cả sau khi khóa hoặc đổi vai trò. `/api/auth/me` trả role từ JWT để UI và backend cùng nguồn; tên hiện tại vẫn đọc từ DB. Đăng nhập lại nhận role mới. Chủ dự án duyệt mở rộng này ngày 22/10/2026. |
| D11 | Định lượng | Lưu kiểu “thay toàn bộ định lượng của món” (PUT). Xóa dòng định lượng được phép (không phải dữ liệu lịch sử). Tiêu hao đã ghi không đổi. |
| D12 | Đổi đơn vị tính NVL | Chặn nếu NVL đã có `StockMovement`. |

**D9 — Đối soát:**
- `systemRevenue` = Σ `Invoice.amount` trong khoảng; backend tính.
- `actualAmount` = tổng thực nhận (tiền mặt đếm được + chuyển khoản theo sao kê), so với `systemRevenue`. Màn hình hiển thị thêm số liệu tách theo phương thức để tham khảo.
- `reconciledAt` = lúc Thu ngân lập.
- Quản lý xác nhận chỉ gán `managerId`.
- Không có “từ chối”, không sửa sau khi lập, không chặn khoảng thời gian chồng nhau (đối soát không ghi doanh thu nên không làm sai số liệu).
- `differenceReason` không bắt buộc.

---

# 11. STOCKMOVEMENT — LEDGER TRUNG TÂM CỦA TỒN KHO

Không có bảng tồn kho riêng (`stock_balance`).

```text
currentStock(ingredientId) = COALESCE(SUM(StockMovement.quantityChange), 0)
```

| Loại | Dấu | Nguồn |
|---|---|---|
| `RECEIPT` | + | `receiptItemId` (+ `lotId` nếu có) |
| `CONSUMPTION` | − | `orderItemId` |
| `STOCKTAKE_ADJUSTMENT` | ± | `stocktakeItemId` |
| `DISPOSAL` | − | Không có phiếu riêng; lưu NVL/lô/người/lý do/thời gian trực tiếp trên `StockMovement` |

Không xóa, không sửa movement đã phát sinh.

---

# 12. LUỒNG NGHIỆP VỤ CẦN CODE

Ký hiệu `[TX]` = toàn bộ trong một transaction. `[EV: X]` = sau commit phát event real-time loại X (mục 14).

## 12.1 UC1.1 — Đăng nhập
1. Nhập số điện thoại + mật khẩu; validate định dạng `^0\d{9}$`.
2. Tìm `Account`, verify BCrypt. Sai SĐT hoặc sai mật khẩu → cùng một thông báo “Số điện thoại hoặc mật khẩu không đúng”.
3. Mật khẩu đúng nhưng `LOCKED` → “Tài khoản đã bị khóa”.
4. Cấp JWT (mục 17), trả thông tin tài khoản; frontend chuyển tới trang mặc định theo vai trò (mục 5).
5. Đăng xuất: frontend xóa token.

## 12.2 UC4 — Quản lý tài khoản (OWNER)
- **Tạo:** họ tên, SĐT (unique), mật khẩu (≥ 6 ký tự, hash BCrypt), vai trò (bắt buộc); trạng thái `ACTIVE`.
- **Khóa/mở khóa, đổi vai trò:** không áp dụng cho chính mình.
- Không hard delete.

## 12.3 UC2 — Danh mục NVL (OWNER)
- **Thêm/sửa:** tên, đơn vị tính bắt buộc; ngưỡng ≥ 0; `trackLot`, `trackExpiry`.
- Không đổi đơn vị tính nếu đã có biến động (D12).
- **Ngừng sử dụng/kích hoạt lại.** NVL ngừng sử dụng không xuất hiện ở form nhập/kiểm kê/định lượng mới.
- Không hard delete.

## 12.4 UC5 — Thực đơn (OWNER)
- **Thêm/sửa món:** tên, giá ≥ 0.
- **Đổi giá:** cập nhật `price`; giá lịch sử trong `OrderItem.unitPriceAtOrder` không đổi.
- **Ngừng kinh doanh/kinh doanh lại:** món ngừng kinh doanh không chọn được trong đơn mới; dữ liệu cũ giữ nguyên.

## 12.5 FR-18 — Định lượng (OWNER, HEAD_CHEF)
- Xem định lượng của món.
- Lưu toàn bộ danh sách dòng `{ingredientId, quantityPerServing > 0}` (D11): không trùng NVL, chỉ NVL `ACTIVE`. `[TX]`
- Thay đổi chỉ ảnh hưởng các lần tiêu hao sau đó.

## 12.6 Sơ đồ bàn
- Grid theo khu vực (chỉ khu vực `ACTIVE`).
- Mỗi bàn hiển thị: tên, sức chứa, trạng thái, `sessionId` đang mở (nếu có), đặt bàn đang hiệu lực/sắp tới (D2).
- Dữ liệu khu vực/bàn đến từ seed (UC3 bỏ).

## 12.7 UC7 — Đặt bàn (MANAGER tạo/hủy; WAITER, OWNER xem)

**Tạo:**
1. Nhập tên khách, SĐT, số khách, bắt đầu, kết thúc, ghi chú.
2. Gợi ý bàn phù hợp: bàn không `INACTIVE`, khu vực `ACTIVE`, `capacity >= guestCount`, không trùng lịch.
3. Chọn bàn và lưu. `[TX]`:
   - khóa dòng `DiningTable`;
   - kiểm tra `hasEnoughCapacity`;
   - kiểm tra trùng lịch (D1) bằng `newStart < existingEnd AND newEnd > existingStart` (chạm biên không tính trùng);
   - lưu `CONFIRMED`, `createdAt = now`.
   - `[EV: RESERVATION]`

**Hủy:** chỉ khi `CONFIRMED` → `CANCELLED`, không DELETE. `[EV: RESERVATION]`

**Tra cứu:** lọc theo ngày, trạng thái, tên/SĐT khách.

## 12.8 UC8.1 — Mở phiên phục vụ (WAITER; MANAGER hỗ trợ)
1. Chọn bàn trên sơ đồ.
2. Chọn walk-in hoặc đặt bàn phù hợp (D3); với walk-in, nếu có đặt bàn sắp tới thì UI hỏi xác nhận (D2).
3. `[TX]`:
   - khóa dòng `DiningTable`;
   - bàn không `INACTIVE`;
   - không có phiên `ACTIVE`;
   - nếu có đặt bàn: `confirmSeated()` → `SEATED`, gắn `reservationId`;
   - tạo `ServiceSession` `ACTIVE`, `openedAt = now`;
   - `DiningTable → OCCUPIED`.
   - `[EV: FLOOR_PLAN]` (+ `RESERVATION` nếu có đặt bàn)

## 12.9 UC8.2 — Gọi món / gọi thêm / hủy món (WAITER; MANAGER hỗ trợ)

**Mỗi lần xác nhận một đợt gọi món** `[TX]`:
- phiên phải `ACTIVE`;
- tạo `FoodOrder` mới;
- thêm 1..n `OrderItem`:
  - chỉ món `ON_SALE`;
  - `quantity > 0`;
  - snapshot `unitPriceAtOrder = MenuItem.price`;
  - trạng thái `PENDING`.
- `[EV: ORDER]`

Gọi thêm = tạo đợt gọi món mới trong cùng phiên.

**Hủy món** (D4): chỉ `PENDING` → `CANCELLED`. `[EV: ORDER]`

## 12.10 UC9 — Bếp (KITCHEN_STAFF, HEAD_CHEF)
- **Hàng chờ:** món `PENDING` + `COOKING` của các phiên đang hoạt động, sắp theo `FoodOrder.createdAt`. Hiển thị bàn, món, số lượng, ghi chú, thời gian gọi.
- **Bắt đầu chế biến:** `PENDING → COOKING`. `[EV: ORDER]`
- **Không thể chế biến:** `PENDING | COOKING → UNAVAILABLE`, lý do bắt buộc, **không** sinh tiêu hao. `[EV: ORDER]`
- **Hoàn thành** `[TX]`:
  1. khóa dòng `OrderItem`;
  2. nếu đã `READY`/`SERVED` → trả về thành công, **không làm gì thêm** (idempotent);
  3. nếu không phải `COOKING` → lỗi 409;
  4. đọc `RecipeItem` của món; với mỗi dòng tạo `StockMovement`:
     - `CONSUMPTION`;
     - `quantityChange = −calculateConsumption(quantity)`;
     - `orderItemId`;
     - `lotId = NULL`;
     - `performedById` = người bấm;
  5. món chưa có định lượng → vẫn hoàn thành, không sinh movement;
  6. `markReady()`.
  - `[EV: ORDER]`

Tồn âm sau tiêu hao vẫn cho phép (D5).

## 12.11 UC8.3 — Theo dõi và xác nhận phục vụ (WAITER)
- **Màn hình “Món chờ phục vụ”:**
  - món `READY` của các phiên đang hoạt động;
  - mục riêng “Không thể chế biến — cần báo khách”: các món `UNAVAILABLE` kèm lý do.
- **Xác nhận:** chỉ `READY → SERVED`. `[EV: ORDER]`

## 12.12 UC10.3 — Nhập NVL (HEAD_CHEF)
Chỉ ghi nhận hàng đã kiểm tra/chấp nhận. Form nhiều dòng `{ingredientId, quantity > 0, lotNumber?, expiryDate?}`.

`[TX]`:
1. Tạo `StockReceipt` (`createdAt = now`, `createdById`).
2. Với mỗi dòng:
   - NVL có `trackExpiry` → `expiryDate` bắt buộc;
   - NVL có `trackLot` hoặc `trackExpiry` → tạo `IngredientLot` mới (`lotNumber` có thể NULL) và gắn `lotId`;
   - tạo `StockReceiptItem`;
   - tạo `StockMovement` `RECEIPT` dương với `receiptItemId` + `lotId`.

Không quản lý nhà cung cấp/PO/công nợ.

## 12.13 UC10.1 — Kiểm kê (HEAD_CHEF)
1. Form điền sẵn tồn hệ thống hiện tại của các NVL `ACTIVE`.
2. Nhập số thực tế (≥ 0) và ghi chú nếu có; UI hiển thị chênh lệch tạm tính.
3. Xác nhận `[TX]`:
   - tạo `Stocktake`;
   - với mỗi dòng: backend tính lại `systemQuantity` tại thời điểm xác nhận (D7) → tạo `StocktakeItem`;
   - nếu `calculateDifference() ≠ 0` → tạo `STOCKTAKE_ADJUSTMENT` với `quantityChange = difference`;
   - nếu chênh lệch = 0 vẫn lưu chi tiết, không sinh movement.

## 12.14 UC10.2 — Loại bỏ (HEAD_CHEF)
- Input: NVL, lô (tùy chọn, D6), số lượng, lý do.
- Validation:
  - số lượng > 0;
  - không vượt tồn tổng;
  - lý do bắt buộc;
  - nếu chọn lô, lô phải thuộc NVL đó.
- `[TX]`: khóa dòng `Ingredient` → tính tồn → tạo `StockMovement` `DISPOSAL`, `quantityChange = −quantity`.
- Không có phiếu loại bỏ riêng (`disposal_receipt`).

## 12.15 UC6.2 — Tồn kho và cảnh báo (OWNER, HEAD_CHEF)
- **Danh sách NVL:** đơn vị, tồn hiện tại, ngưỡng, tag “Tồn thấp” (`isBelowMinStock`), tag đỏ nếu tồn âm.
- **Bộ lọc:** tìm theo tên, trạng thái, chỉ tồn thấp.
- **Lô cần chú ý:** lô có `expiryDate` ≤ hôm nay + `app.alert.expiry-days` (mặc định 3), phân loại “Đã hết hạn” / “Sắp hết hạn”.
  - Hiển thị kèm số lượng nhập ban đầu của lô.
  - Không hiển thị “tồn của lô” (mục 10.1 ý 7).
- “Hôm nay” tính theo múi giờ `app.timezone = Asia/Ho_Chi_Minh`.

## 12.16 UC6.3 — Biến động NVL (OWNER, HEAD_CHEF)
- **Lọc:** NVL, loại, khoảng thời gian; phân trang.
- **Mỗi dòng:** thời gian, NVL, loại, số lượng (+/−), lô, người thực hiện, lý do, nguồn.
- **Nguồn:**
  - `RECEIPT` → mã phiếu nhập;
  - `CONSUMPTION` → bàn + món + mã phiên;
  - `STOCKTAKE_ADJUSTMENT` → mã phiếu kiểm kê.

## 12.17 UC11.1 — Thanh toán (CASHIER)
1. Danh sách phiên `ACTIVE`: bàn, giờ mở, tạm tính, cờ “còn món chưa xong”.
2. **Xem trước hóa đơn:**
   - tải mọi đợt gọi món của phiên;
   - loại `CANCELLED`, `UNAVAILABLE`;
   - tổng = Σ `quantity × unitPriceAtOrder` (backend tính);
   - liệt kê món đang chặn thanh toán (D8).
3. Chọn phương thức, xác nhận đã nhận tiền/chuyển khoản.
4. `[TX]`:
   - khóa dòng `ServiceSession`;
   - phiên phải `ACTIVE` và chưa có `Invoice`, nếu không → 409 “Phiên đã được thanh toán”;
   - không còn `PENDING`/`COOKING`;
   - tính lại tổng ở backend (**không nhận tổng tiền từ client**);
   - tạo `Invoice`;
   - `close()` phiên;
   - `DiningTable → AVAILABLE`.
   - `[EV: FLOOR_PLAN]`
5. **Lịch sử hóa đơn:** lọc theo khoảng thời gian, phương thức; phân trang.

Doanh thu luôn lấy từ `Invoice`; không có bảng doanh thu.

## 12.18 UC11.2 — Đối soát cuối ca (CASHIER lập, MANAGER xác nhận)
1. Thu ngân chọn khoảng thời gian ca.
2. Xem trước: số hóa đơn, `systemRevenue`, tách tiền mặt/chuyển khoản.
3. Nhập `actualAmount`; UI hiện chênh lệch = `actualAmount − systemRevenue`; nhập `differenceReason` nếu xác định được.
4. Lưu: backend tính lại `systemRevenue`, `reconciledAt = now`, `managerId = NULL` (D9).
5. Quản lý xem danh sách “Chưa xác nhận” và bấm xác nhận → `confirm(manager)` gán `managerId`. Đã xác nhận rồi → 409.
6. Không ghi doanh thu lần hai.

## 12.19 UC6.1 + FR-17 — Báo cáo (OWNER)
Một trang, chọn khoảng thời gian (mặc định hôm nay):
- doanh thu, số hóa đơn, doanh thu theo phương thức;
- top món bán: Σ `quantity` của chi tiết không `CANCELLED`/`UNAVAILABLE`, thuộc phiên có `Invoice` trong khoảng;
- NVL tồn thấp, lô cần chú ý, 10 biến động gần nhất;
- trạng thái “Không có dữ liệu” khi rỗng.

Dùng Ant Design `Statistic` + `Table`, không cần thư viện biểu đồ.

---

# 13. API CONTRACT

Cột “Vai trò” dùng đúng giá trị enum `Role` (mục 6): `OWNER`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN_STAFF`, `HEAD_CHEF`. “Đăng nhập” = mọi vai trò đã đăng nhập.

## 13.1 Quy ước chung
- **Base path:** `/api`. JSON. Thời điểm dạng ISO-8601 (`Instant`, UTC); frontend hiển thị theo giờ Việt Nam.
- **Thành công:** trả DTO trực tiếp (không bọc wrapper).
- **Phân trang:** trả `{ "items": [...], "page": 0, "size": 20, "total": 123 }`. Không serialize trực tiếp `Page` của Spring.
- **Lỗi:** `{ "status": 409, "code": "RESERVATION_OVERLAP", "message": "Bàn T05 đã có đặt trước trùng khung giờ", "fieldErrors": { "guestCount": "..." } }`.
  - 400: dữ liệu không hợp lệ;
  - 401: chưa đăng nhập/token hết hạn;
  - 403: sai vai trò;
  - 404: không tìm thấy;
  - 409: vi phạm business rule hoặc trạng thái.
  - `message` là tiếng Việt có dấu, hiển thị thẳng lên UI.
- **PATCH chuyển trạng thái:** nếu đối tượng đã ở trạng thái đích thì trả thành công, không làm gì thêm (idempotent).

## 13.2 AuthController
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | công khai | `{phone, password}` → `{accessToken, expiresAt, account:{accountId, fullName, role}}` |
| GET | `/api/auth/me` | Đăng nhập | Tài khoản hiện tại |

## 13.3 AccountController
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/accounts` | OWNER | Danh sách |
| POST | `/api/accounts` | OWNER | `{fullName, phone, password, role}` |
| PATCH | `/api/accounts/{id}/lock` | OWNER | Khóa |
| PATCH | `/api/accounts/{id}/unlock` | OWNER | Mở khóa |
| PATCH | `/api/accounts/{id}/role` | OWNER | `{role}` |

## 13.4 TableController (sơ đồ bàn + đặt bàn: `/api/tables/**`, `/api/reservations/**`)
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/tables/floor-plan` | WAITER, MANAGER, CASHIER, OWNER | Khu vực → bàn: trạng thái, phiên đang mở, đặt bàn hiệu lực/sắp tới |
| GET | `/api/reservations` | MANAGER, WAITER, OWNER | Lọc `?date&status&q`; phân trang |
| GET | `/api/reservations/available-tables` | MANAGER | `?startTime&endTime&guestCount` → bàn đủ sức chứa, không trùng lịch |
| POST | `/api/reservations` | MANAGER | Tạo đặt bàn |
| PATCH | `/api/reservations/{id}/cancel` | MANAGER | Hủy |

## 13.5 ServiceSessionController
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| POST | `/api/sessions` | WAITER, MANAGER | `{tableId, reservationId?}` mở phiên |
| GET | `/api/sessions/{id}` | WAITER, MANAGER, CASHIER | Bàn, đặt bàn, giờ mở, các đợt gọi món + từng món + trạng thái, tạm tính |
| POST | `/api/sessions/{id}/orders` | WAITER, MANAGER | `{items:[{menuItemId, quantity, note?}]}` tạo đợt gọi món |
| PATCH | `/api/sessions/items/{orderItemId}/cancel` | WAITER, MANAGER | Hủy món (chỉ `PENDING`) |
| PATCH | `/api/sessions/items/{orderItemId}/serve` | WAITER | `READY → SERVED` |
| GET | `/api/sessions/items/awaiting-service` | WAITER | Món `READY` + món `UNAVAILABLE` của phiên đang hoạt động |

## 13.6 KitchenController
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/kitchen/queue` | KITCHEN_STAFF, HEAD_CHEF | Món `PENDING` + `COOKING` |
| PATCH | `/api/kitchen/items/{id}/start` | KITCHEN_STAFF, HEAD_CHEF | Bắt đầu chế biến |
| PATCH | `/api/kitchen/items/{id}/unavailable` | KITCHEN_STAFF, HEAD_CHEF | `{reason}` |
| PATCH | `/api/kitchen/items/{id}/complete` | KITCHEN_STAFF, HEAD_CHEF | Hoàn thành + tiêu hao |

## 13.7 MenuController
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/menu-items` | Đăng nhập | `?status&q` (WAITER/MANAGER dùng `ON_SALE` khi gọi món) |
| POST | `/api/menu-items` | OWNER | `{name, price}` |
| PUT | `/api/menu-items/{id}` | OWNER | `{name, price}` (đổi giá) |
| PATCH | `/api/menu-items/{id}/discontinue` | OWNER | |
| PATCH | `/api/menu-items/{id}/reactivate` | OWNER | |
| GET | `/api/menu-items/{id}/recipe` | OWNER, HEAD_CHEF | |
| PUT | `/api/menu-items/{id}/recipe` | OWNER, HEAD_CHEF | `{lines:[{ingredientId, quantityPerServing}]}` thay toàn bộ |

## 13.8 InventoryController
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/inventory/ingredients` | OWNER, HEAD_CHEF | `?q&status&belowMinStockOnly` → kèm `currentStock`, `belowMinStock` |
| POST | `/api/inventory/ingredients` | OWNER | Thêm NVL |
| PUT | `/api/inventory/ingredients/{id}` | OWNER | Sửa (D12) |
| PATCH | `/api/inventory/ingredients/{id}/deactivate` | OWNER | |
| PATCH | `/api/inventory/ingredients/{id}/activate` | OWNER | |
| GET | `/api/inventory/lots/attention` | OWNER, HEAD_CHEF | `?days` → lô đã/sắp hết hạn |
| POST | `/api/inventory/receipts` | HEAD_CHEF | `{items:[{ingredientId, quantity, lotNumber?, expiryDate?}]}` |
| GET | `/api/inventory/stocktakes/template` | HEAD_CHEF | Tồn hệ thống hiện tại của NVL đang sử dụng |
| POST | `/api/inventory/stocktakes` | HEAD_CHEF | `{items:[{ingredientId, actualQuantity, note?}]}` |
| POST | `/api/inventory/disposals` | HEAD_CHEF | `{ingredientId, lotId?, quantity, reason}` |
| GET | `/api/inventory/movements` | OWNER, HEAD_CHEF | `?ingredientId&movementType&from&to&page&size` |

## 13.9 PaymentController (thanh toán + đối soát: `/api/payments/**`, `/api/invoices`, `/api/reconciliations/**`)
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/payments/open-sessions` | CASHIER | Phiên đang hoạt động + tạm tính + cờ còn món chưa xong |
| GET | `/api/payments/sessions/{id}` | CASHIER | Xem trước hóa đơn |
| POST | `/api/payments` | CASHIER | `{sessionId, paymentMethod}` → `Invoice` |
| GET | `/api/invoices` | CASHIER, MANAGER, OWNER | `?from&to&paymentMethod&page&size` |
| GET | `/api/payments/summary` | OWNER | `?from&to` → doanh thu, số hóa đơn, theo phương thức, top món |
| GET | `/api/reconciliations/preview` | CASHIER | `?from&to` → `systemRevenue`, tiền mặt, chuyển khoản, số hóa đơn |
| POST | `/api/reconciliations` | CASHIER | `{startTime, endTime, actualAmount, differenceReason?}` |
| GET | `/api/reconciliations` | CASHIER, MANAGER | Danh sách + cờ đã xác nhận |
| PATCH | `/api/reconciliations/{id}/confirm` | MANAGER | Gán `managerId` |

## 13.10 EventController (real-time)
| Method | Path | Vai trò | Mô tả |
|---|---|---|---|
| GET | `/api/events` | Đăng nhập | Luồng SSE (`text/event-stream`) |

Tổng: **8 controller nghiệp vụ + 1 controller SSE**. Service: `AuthService`, `AccountService`, `TableService`, `ReservationService`, `ServiceSessionService`, `KitchenService`, `MenuService`, `InventoryService`, `PaymentService`, `ReconciliationService`, mỗi cái có một `*ServiceImpl`.

Swagger UI bật ở profile `local` để thử API nhanh.

---

# 14. REAL-TIME — THIẾT KẾ SSE

## 14.1 Backend
- `EventController`: `GET /api/events`, `produces = text/event-stream`. Trả `SseEmitter` (timeout 30 phút; client tự kết nối lại).
- `SseHub` (`@Component`):
  - giữ `CopyOnWriteArrayList<SseEmitter>`;
  - gỡ emitter khi `onCompletion`/`onTimeout`/`onError`;
  - `broadcast(event)` gửi tới tất cả, emitter lỗi thì gỡ;
  - heartbeat `@Scheduled(fixedRate = 20000)` gửi comment `ping` (bật `@EnableScheduling`).
- **Phát event sau commit:**
  - ServiceImpl gọi `ApplicationEventPublisher.publishEvent(new RealtimeEvent(type, sessionId))`;
  - `RealtimeEventListener` dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` để gọi `SseHub.broadcast`;
  - như vậy client không bao giờ nhận tín hiệu cho dữ liệu chưa commit.
- **Loại event:**

| Loại | Khi nào | Payload |
|---|---|---|
| `FLOOR_PLAN` | Mở phiên, thanh toán | `{type, sessionId}` |
| `RESERVATION` | Tạo/hủy đặt bàn, mở phiên có đặt bàn | `{type}` |
| `ORDER` | Gọi món, hủy món, mọi thay đổi trạng thái món | `{type, sessionId}` |

- Event không chứa dữ liệu nghiệp vụ; broadcast cho mọi client đã đăng nhập (quy mô nhỏ, payload nhỏ).

## 14.2 Frontend
- **`useRealtime()`:**
  - gắn một lần trong `AppLayout` (sau đăng nhập);
  - dùng `fetchEventSource('/api/events', { headers: { Authorization }, openWhenHidden: true })` để màn hình bếp không ngắt khi tab ẩn;
  - mất kết nối thì thư viện tự retry; kết nối lại xong thì invalidate tất cả key bên dưới.
- **Map event → invalidate query key:**

| Event | Query key bị invalidate |
|---|---|
| `FLOOR_PLAN` | `['floor-plan']`, `['payment']`, `['session', sessionId]` |
| `RESERVATION` | `['reservations']`, `['floor-plan']` |
| `ORDER` | `['kitchen']`, `['session', sessionId]`, `['awaiting-service']`, `['payment']` |

- **Dự phòng:** các query của sơ đồ bàn, bếp, món chờ phục vụ, thanh toán đặt `refetchInterval: 30_000` và `refetchOnWindowFocus: true`.
- Kho/báo cáo không cần real-time.

---

# 15. MÀN HÌNH (FRONTEND)

| Route | Màn hình | Vai trò | Nội dung chính | Real-time |
|---|---|---|---|---|
| `/login` | Đăng nhập | công khai | SĐT + mật khẩu | |
| `/floor-plan` | Sơ đồ bàn | WAITER, MANAGER (CASHIER, OWNER chỉ xem) | Grid theo khu vực; card bàn: tên, sức chứa, trạng thái (màu), đặt bàn sắp tới; nút **Mở phiên** / **Xem phiên** | ✔ |
| `/sessions/:id` | Phiên phục vụ | WAITER, MANAGER | Thông tin bàn/đặt bàn/giờ mở; các đợt gọi món; từng món + tag trạng thái; **Gọi món/Gọi thêm** (modal chọn món đang kinh doanh, số lượng, ghi chú); **Hủy món** (chỉ hiện khi Chờ chế biến); **Đã phục vụ**; tạm tính | ✔ |
| `/awaiting-service` | Món chờ phục vụ | WAITER | Món hoàn thành chờ mang ra; mục món không thể chế biến + lý do | ✔ |
| `/reservations` | Đặt bàn | MANAGER (WAITER, OWNER chỉ xem) | Danh sách + lọc; **Tạo** (chọn giờ, số khách → gợi ý bàn phù hợp); **Hủy** | ✔ |
| `/kitchen` | Bếp | KITCHEN_STAFF, HEAD_CHEF | Hai cột Chờ chế biến / Đang chế biến; card món: bàn, món, SL, ghi chú, giờ gọi; nút **Bắt đầu**, **Không thể chế biến** (nhập lý do), **Hoàn thành**; chữ lớn, dùng tốt trên tablet | ✔ |
| `/payment` | Thanh toán | CASHIER | Danh sách phiên đang mở → xem trước hóa đơn → chọn phương thức → xác nhận | ✔ |
| `/invoices` | Lịch sử hóa đơn | CASHIER, MANAGER, OWNER | Lọc khoảng thời gian, phương thức | |
| `/reconciliation` | Đối soát cuối ca | CASHIER, MANAGER | CASHIER: lập (chọn khoảng → xem trước → nhập tiền thực nhận); MANAGER: danh sách chưa xác nhận + **Xác nhận** | |
| `/menu` | Thực đơn | OWNER (HEAD_CHEF chỉ định lượng) | Danh sách món; thêm/sửa/đổi giá/ngừng; Drawer **Định lượng** | |
| `/accounts` | Tài khoản | OWNER | Danh sách, tạo, khóa/mở, đổi vai trò | |
| `/inventory` | Kho | OWNER, HEAD_CHEF | Tab **Tồn kho** (tồn, ngưỡng, tag tồn thấp/âm; OWNER: thêm/sửa/ngừng NVL; HEAD_CHEF: nút **Loại bỏ**) · Tab **Lô cần chú ý** · Tab **Biến động** | |
| `/inventory/receipts` | Phiếu nhập | HEAD_CHEF | Form nhiều dòng; HSD bắt buộc nếu NVL theo dõi HSD | |
| `/inventory/stocktake` | Kiểm kê | HEAD_CHEF | Bảng điền sẵn tồn hệ thống, nhập thực tế, hiện chênh lệch | |
| `/reports` | Báo cáo | OWNER | Mục 12.19 | |

Quy tắc UI:
- Tiếng Việt có dấu; nhãn trạng thái theo mục 6; màu tag trạng thái thống nhất toàn app.
- Tiền: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`. Thời gian: `DD/MM/YYYY HH:mm`.
- Nút gửi `loading`/disable khi đang xử lý (chống double submit).
- `Popconfirm` trước thao tác không hoàn tác: hủy đặt bàn, hủy món, thanh toán, loại bỏ, xác nhận đối soát.
- Lỗi từ API hiển thị `message` bằng `message.error`. 401 → về `/login`. 403 → “Bạn không có quyền thực hiện thao tác này”.
- Responsive cơ bản; ưu tiên tablet cho Bếp, Phục vụ, Sơ đồ bàn.

---

# 16. DATABASE: CONSTRAINT, INDEX, TRANSACTION, KHÓA

## 16.1 Unique bắt buộc
```text
account(phone)
invoice(session_id)
service_session(table_id) WHERE status = 'ACTIVE'
service_session(reservation_id) WHERE reservation_id IS NOT NULL
stock_movement(receipt_item_id) WHERE receipt_item_id IS NOT NULL
stock_movement(stocktake_item_id) WHERE stocktake_item_id IS NOT NULL
stock_movement(order_item_id, ingredient_id) WHERE movement_type = 'CONSUMPTION'
```

## 16.2 Index
```text
reservation(table_id, start_time, end_time, status)
service_session(table_id, status)
food_order(session_id, created_at)
order_item(order_id, status)
order_item(status)
stock_movement(ingredient_id, occurred_at)
ingredient_lot(expiry_date)
invoice(paid_at)
revenue_reconciliation(start_time, end_time)
```
Index thêm cho FK khi cần.

## 16.3 Transaction + khóa dòng

| Nghiệp vụ | Khóa (`@Lock(PESSIMISTIC_WRITE)`) | Lưới an toàn ở DB |
|---|---|---|
| Tạo đặt bàn | `DiningTable` | — |
| Mở phiên | `DiningTable` | partial unique phiên đang hoạt động |
| Chuyển trạng thái món (bếp, hủy, phục vụ) | `OrderItem` | CHECK lý do |
| Hoàn thành món + tiêu hao | `OrderItem` | unique `CONSUMPTION` theo (chi tiết, NVL) |
| Nhập hàng + lô + movement | — | unique `receipt_item_id` |
| Kiểm kê + điều chỉnh | — | unique `stocktake_item_id` |
| Loại bỏ | `Ingredient` | CHECK dấu/lý do |
| Thanh toán + Invoice + đóng phiên + bàn | `ServiceSession` | unique `invoice.session_id` |
| Lưu định lượng | — | PK kép |

Vi phạm unique/check từ DB (`DataIntegrityViolationException`) → 409 với thông báo thân thiện, không lộ SQL.

---

# 17. SECURITY

- **Mật khẩu:** `BCryptPasswordEncoder`; không log mật khẩu.
- **JWT HS256:**
  - phát bằng `NimbusJwtEncoder` (secret `app.jwt.secret` ≥ 32 ký tự, lấy từ biến môi trường);
  - kiểm bằng OAuth2 Resource Server (`NimbusJwtDecoder.withSecretKey`);
  - claims: `sub = accountId`, `fullName`, `role`; hết hạn `app.jwt.expiration-hours` (12h);
  - `JwtAuthenticationConverter` map claim `role` → authority `ROLE_<role>`;
  - `@EnableMethodSecurity` + `@PreAuthorize("hasAnyRole('CASHIER')")`.
- **Stateless:** `SessionCreationPolicy.STATELESS`. Tắt CSRF vì token gửi qua header `Authorization`, không dùng cookie.
- **Endpoint công khai:** chỉ `/api/auth/login`, và Swagger ở profile `local`. Còn lại `authenticated()`.
- **CORS:** dev dùng Vite proxy nên không cần. Nếu deploy tách domain, chỉ cho phép origin frontend.
- **Không tin client:** người thực hiện luôn lấy từ JWT, không từ body; không nhận vai trò, tổng tiền, tồn hệ thống, doanh thu hệ thống từ client.
- **Frontend:** lưu token ở `localStorage` (chấp nhận cho prototype); axios interceptor gắn `Authorization: Bearer`.
- **Bí mật:** không commit `DB_URL`/`DB_PASSWORD`/`JWT_SECRET`; không trả stack trace ra API; validate mọi input ở server.

---

# 18. HIỆU NĂNG VỪA ĐỦ

- Hàm đọc `@Transactional(readOnly = true)`; danh sách dùng projection/`JOIN FETCH`, tránh N+1.
- Tồn hiện tại cho danh sách NVL: một query `GROUP BY ingredient_id`, không query từng NVL.
- Phân trang cho hóa đơn, đặt bàn, biến động.
- Endpoint real-time-related (`/api/tables/floor-plan`, `/api/kitchen/queue`, `/api/sessions/items/awaiting-service`) chỉ trả trường cần hiển thị.
- Chỉ trả thành công sau khi commit.
- Mục tiêu: hệ thống nội bộ 30–50 bàn, không tối ưu cho hàng triệu user.

---

# 19. TRUY VẾT REQUIREMENT → CODE

Agent tạo `docs/TRACEABILITY.md` tối thiểu như sau. Cột Trạng thái dùng đúng ba giá trị: **Đã làm** / **Đơn giản hóa** / **Chưa hiện thực**.

| FR | Use Case | Trạng thái | Controller | Service | Entity |
|---|---|---|---|---|---|
| FR-01 | UC1.1, UC4 (UC1.2, UC12 chưa hiện thực) | Đơn giản hóa | Auth, Account | AuthService, AccountService | Account |
| FR-02 | UC5, UC3 (UC3 chưa hiện thực — seed) | Đơn giản hóa | Menu, Table | MenuService, TableService | MenuItem, DiningArea, DiningTable |
| FR-03 | UC7 (không sửa đặt bàn) | Đơn giản hóa | Table | ReservationService | Reservation, DiningTable |
| FR-04 | UC8.1, UC11.1 | Đã làm | ServiceSession, Payment | ServiceSessionService, PaymentService | DiningTable, ServiceSession |
| FR-05 | UC8.2 | Đã làm | ServiceSession | ServiceSessionService | FoodOrder, OrderItem |
| FR-06 | UC8.2, UC9 (chỉ hủy khi chờ chế biến) | Đơn giản hóa | ServiceSession, Kitchen | ServiceSessionService, KitchenService | OrderItem |
| FR-07 | UC9 | Đã làm | Kitchen | KitchenService | OrderItem |
| FR-08 | UC8.3 | Đã làm | ServiceSession | ServiceSessionService | OrderItem |
| FR-09 | UC11.1 | Đã làm | Payment | PaymentService | Invoice, ServiceSession |
| FR-10 | UC11.2 | Đã làm | Payment | ReconciliationService | Invoice, RevenueReconciliation |
| FR-11 | UC2 | Đã làm | Inventory | InventoryService | Ingredient |
| FR-12 | UC10.3 | Đã làm | Inventory | InventoryService | StockReceipt, StockReceiptItem, IngredientLot, StockMovement |
| FR-13 | UC6.2 (không tồn theo lô) | Đơn giản hóa | Inventory | InventoryService | Ingredient, IngredientLot, StockMovement |
| FR-14 | UC10.1 (theo NVL) | Đơn giản hóa | Inventory | InventoryService | Stocktake, StocktakeItem, StockMovement |
| FR-15 | UC10.2 | Đã làm | Inventory | InventoryService | StockMovement |
| FR-16 | UC6.3 + lịch sử hóa đơn/đặt bàn | Đơn giản hóa | Inventory, Payment, Table | InventoryService, PaymentService, ReservationService | nhiều bảng |
| FR-17 | UC6.1 (1 trang báo cáo) | Đơn giản hóa | Payment, Inventory | PaymentService, InventoryService | Invoice, OrderItem, StockMovement |
| FR-18 | Định lượng + UC9 | Đã làm | Menu, Kitchen | MenuService, KitchenService | RecipeItem, StockMovement |

Thêm bảng ngắn cho TR/NFR: cách đáp ứng (lấy từ mục 2.2, 2.4).

**Ghi chú cho báo cáo khóa luận:**
- Chương mô tả công nghệ/hiện thực cần cập nhật sang Spring Boot + React + Neon.
- Các UC “Chưa hiện thực” trình bày là phạm vi prototype / hướng phát triển.

---

# 20. SEED DATA CHO DEMO

`DataSeeder` (`CommandLineRunner`):
- mọi khối seed chỉ chạy khi `app.seed = true`;
- `DataSeeder` nền tảng (`@Order(0)`, tài khoản/khu vực/bàn) giữ điều kiện bảng `account` rỗng;
- các phase sau thêm runner có `@Order` kế tiếp và điều kiện riêng cho từng khối (menu rỗng, NVL rỗng, định lượng rỗng, đặt bàn rỗng; kiểm kê/nhập chỉ khi chưa có giao dịch seed tương ứng). Không đặt các runner này sau lệnh return kiểm tra account. Mỗi runner có transaction và không ghi đè dữ liệu hiện có;
- hash mật khẩu bằng `PasswordEncoder`;
- tạo nghiệp vụ (nhập, kiểm kê) qua ServiceImpl để dữ liệu nhất quán.

Chủ dự án duyệt cổng seed theo từng khối ngày 22/10/2026; làm trên Neon `main`, không bắt buộc branch/reset. Phase 0 chỉ có runner nền tảng; các runner nghiệp vụ được thêm đúng phase. Nếu một khối đã có dữ liệu một phần thì bỏ qua và báo để kiểm tra, không tự xóa hay điền đè.

Các mốc tương đối (45 phút tới, ngày mai, HSD còn 2 ngày) được tính tại lúc khối tương ứng seed lần đầu. Khởi động lại không làm mới ngày của dữ liệu cũ. Trước demo 27/10, kiểm tra lại độ tươi; khi cần tạo đặt bàn/phiếu nhập mới qua workflow của app, không sửa lịch sử hoặc reset DB tự động.

Nội dung seed:
- **6 tài khoản**, mỗi vai trò một, SĐT `0900000001`–`0900000006`, mật khẩu demo `Demo@123` (ghi trong README, không lưu plaintext trong DB).
- **Khu vực và bàn:** 3 khu vực (Tầng 1, Tầng 2, Sân vườn); 12 bàn `T01`–`T12`, sức chứa 2/4/6/8.
- **Món:** 10 món (vd. phở bò, bún chả, cơm tấm, gỏi cuốn, cà phê sữa đá, trà đá...).
- **NVL:** 10 NVL có đơn vị tính (kg, lít, hộp, quả); 3 NVL `trackExpiry = true`.
- **Định lượng:** cho ít nhất 6 món.
- **Tồn đầu:** 1 phiếu kiểm kê khởi tạo (hệ thống 0 → thực tế = tồn đầu).
- **Lô:** 1 phiếu nhập có lô + HSD, trong đó 1 lô còn 2 ngày, 1 lô đã hết hạn, để cảnh báo hiện ngay.
- **Tồn thấp:** 2 NVL tồn dưới ngưỡng.
- **Đặt bàn:** 3 đơn — 1 đơn bắt đầu trong khoảng 45 phút tới, 2 đơn ngày mai.

---

# 21. KIỂM THỬ

## 21.1 Unit test (JUnit 5 + Mockito, không cần DB)

1. Trùng lịch đặt bàn: trùng một phần bị chặn; chạm biên (18–20 và 20–22) không trùng.
2. Tổng tiền phiên: loại `CANCELLED`/`UNAVAILABLE`; dùng `unitPriceAtOrder`.
3. Hoàn thành món: số movement = số dòng định lượng, `quantityChange = −(định mức × số lượng)`; gọi lần 2 không tạo thêm.
4. Kiểm kê: chênh lệch đúng; chênh lệch = 0 không tạo movement.
5. Loại bỏ: ≤ 0, vượt tồn, thiếu lý do → `BusinessException`.
6. `OrderItem`: chuyển trạng thái sai (vd. `PENDING → READY`, hủy món `COOKING`) → `BusinessException`.

Xóa test `contextLoads()` mặc định của start.spring.io (cần kết nối DB), hoặc chỉ chạy nó khi có biến môi trường Neon.

## 21.2 Checklist thủ công (chạy trên app thật)

**Auth/tài khoản**
1. Đăng nhập đúng → về trang mặc định theo vai trò.
2. Đăng nhập sai → thông báo chung.
3. Tài khoản bị khóa không đăng nhập được.
4. Gọi API sai vai trò → 403.
5. Tạo tài khoản trùng SĐT bị chặn.
6. Chủ quán không tự khóa/đổi vai trò mình.

**Bàn/đặt bàn**
7. Đặt bàn vượt sức chứa bị chặn.
8. Đặt bàn trùng lịch bị chặn.
9. Hủy đặt bàn → `CANCELLED`, vẫn còn trong danh sách.
10. Không hủy được đặt bàn đã nhận bàn.

**Phiên/gọi món**
11. Walk-in mở phiên được; bàn → Đang phục vụ.
12. Mở phiên với đặt bàn → liên kết + `SEATED`.
13. Không mở 2 phiên cho cùng bàn (thử bấm 2 lần / 2 tab).
14. Gọi thêm tạo `FoodOrder` mới cùng phiên.
15. Đổi giá món không đổi giá món đã gọi.
16. Món ngừng kinh doanh không chọn được.
17. Chỉ hủy được món Chờ chế biến.

**Bếp/phục vụ**
18. Chờ chế biến → Đang chế biến.
19. Không thể chế biến bắt buộc lý do, không tạo tiêu hao, phục vụ thấy lý do.
20. Hoàn thành tạo tiêu hao đúng định lượng.
21. Bấm Hoàn thành 2 lần không trừ kho 2 lần.
22. Chỉ món Hoàn thành mới xác nhận Đã phục vụ.

**Kho**
23. Nhập tạo phiếu + chi tiết + lô (nếu có) + `RECEIPT` trong một transaction; thiếu HSD với NVL theo dõi HSD bị chặn.
24. Kiểm kê tính chênh lệch đúng; chênh lệch 0 không tạo movement.
25. Loại bỏ ≤ 0 / vượt tồn / thiếu lý do bị chặn.
26. Tồn hiển thị = Σ biến động.
27. Cảnh báo tồn thấp và lô sắp/đã hết hạn đúng.
28. Biến động hiển thị đủ 4 loại kèm nguồn.

**Thanh toán/đối soát**
29. Món hủy / không thể chế biến không tính tiền; tổng dùng giá snapshot.
30. Còn món chưa xong → không thanh toán được.
31. Bấm thanh toán 2 lần không tạo hóa đơn thứ hai.
32. Thanh toán xong: phiên đóng, bàn → Trống.
33. Đối soát chỉ lấy hóa đơn trong khoảng; không làm đổi doanh thu.
34. Quản lý xác nhận → có `managerId`; chưa xác nhận hiển thị “Chưa xác nhận”.

**Real-time/NFR**
35. Mở 2 trình duyệt (phục vụ + bếp): bếp thấy món mới, phục vụ thấy món hoàn thành, sơ đồ bàn đổi trạng thái — không cần F5, trong khoảng 1–2 giây.
36. Reload/đăng nhập lại không mất dữ liệu đã commit; giao diện dùng được trên tablet.

---

# 22. PHASE VÀ LỊCH (hạn nộp 27/10/2026)

| Phase | Ngày | Nội dung | Checklist |
|---|---|---|---|
| 0 — Nền tảng | 22/10 tối – 23/10 sáng | Tạo backend (start.spring.io) + frontend (`bun create vite`); kết nối Neon; `V1__init_schema.sql` đủ 18 bảng + constraint + index; 18 entity + enum + repository, `ddl-auto: validate` chạy qua; GlobalExceptionHandler, ErrorResponse, PageResponse; Security JWT + UC1.1 + `/me`; DataSeeder; frontend: AuthContext, Login, AppLayout menu theo vai trò, route guard, trang mặc định | 1–4 |
| 1 — Danh mục + Đặt bàn + Mở phiên | 23/10 | UC4 tài khoản; UC5 thực đơn; FR-18 định lượng; sơ đồ bàn; UC7 đặt bàn; UC8.1 mở phiên | 5–13, 15–16 |
| 2 — Gọi món + Bếp + Real-time | 24/10 | UC8.2 gọi món/gọi thêm/hủy; UC9 bếp + tiêu hao; UC8.3 phục vụ; SSE (mục 14) | 14, 17–22, 35 |
| 3 — Thanh toán + Kho | 25/10 | UC11.1 thanh toán + hóa đơn; UC2 NVL; UC10.3 nhập; UC6.2 tồn + cảnh báo; UC10.1 kiểm kê; UC10.2 loại bỏ; UC6.3 biến động | 23–32 |
| 4 — Đối soát + Báo cáo + Hoàn thiện | 26/10 | UC11.2 đối soát; UC6.1/FR-17 báo cáo; 6 unit test; chạy lại toàn bộ checklist; `TRACEABILITY.md`; README; chỉnh UI | 33–36 + toàn bộ |
| Dự phòng | 27/10 | Sửa lỗi; tạo branch Neon `demo-snapshot`; chụp màn hình cho báo cáo; nộp | — |

Không sang phase sau nếu phase hiện tại chưa build sạch.

---

# 23. MÔI TRƯỜNG VÀ LỆNH

Cài:
- JDK 21, Bun, Git, IntelliJ IDEA hoặc VS Code.
- Node.js không bắt buộc với Bun; nếu Vite báo lỗi thì cài Node LTS hoặc chạy `bun --bun run dev`.
- PostgreSQL client tools (`pg_dump`) chỉ cần cho backup, đúng hoặc mới hơn major version Postgres của Neon.

`application.yml` (commit được):
```yaml
spring:
  datasource:
    url: ${DB_URL}              # jdbc:postgresql://<host>.neon.tech/<db>?sslmode=require (endpoint direct)
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 5
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
app:
  timezone: Asia/Ho_Chi_Minh
  seed: true
  jwt:
    secret: ${JWT_SECRET}
    expiration-hours: 12
  alert:
    expiry-days: 3
  reservation:
    upcoming-warning-minutes: 60
```
Giá trị thật đặt trong `application-local.yml` (gitignore) hoặc biến môi trường.

Backend:
```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"   # http://localhost:8080, Swagger: /swagger-ui.html
.\mvnw.cmd clean verify
```

Frontend:
```powershell
cd frontend
bun install
bun run dev      # http://localhost:5173, proxy /api → http://localhost:8080
bun run build
```

`.gitignore` tối thiểu: `backend/target/`, `application-local.yml`, `.env*`, `frontend/node_modules/`, `frontend/dist/`, `.idea/`.

---

# 24. BACKUP/RESTORE (TR-09)

- **Neon:** dùng tính năng restore theo thời điểm và branch có sẵn (trong giới hạn gói). Trước buổi demo, tạo branch `demo-snapshot` từ `main` để khôi phục dữ liệu demo nhanh.
- README ghi lệnh thủ công:
  ```powershell
  pg_dump "<neon-connection-uri>" -Fc -f backup.dump
  pg_restore --clean --no-owner -d "<neon-connection-uri>" backup.dump
  ```
- Không viết script backup riêng (đã cắt giảm).

---

# 25. DEFINITION OF DONE

- `mvnw clean verify` và `bun run build` sạch lỗi; 6 unit test pass.
- Đúng 18 bảng domain, schema khớp mục 7 và các xử lý ở mục 10.
- 6 vai trò đăng nhập được, phân quyền backend đúng.
- **Demo bán hàng xuyên suốt:** đặt bàn/walk-in → mở phiên → gọi món → gọi thêm → bếp → tiêu hao → phục vụ → thanh toán → đóng phiên → đối soát → báo cáo.
- **Demo kho:** nhập (lô/HSD) → tồn → cảnh báo → kiểm kê → điều chỉnh → loại bỏ → biến động.
- **Real-time:** bếp, phục vụ, sơ đồ bàn tự cập nhật, không cần F5.
- Không hard delete dữ liệu lịch sử; không business rule cốt lõi ở frontend; không thêm bảng/chức năng ngoài file này.
- `docs/TRACEABILITY.md` ghi rõ trạng thái từng FR/UC.
- README đủ: tạo project Neon, biến môi trường, chạy backend/frontend, tài khoản demo, backup/restore.
- Checklist mục 21.2 đã chạy và ghi kết quả.

---

# 26. PROMPT KHỞI ĐẦU CHO AGENT

```text
Bạn là coding agent chịu trách nhiệm xây dựng hệ thống khóa luận theo file CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md trong workspace.
Đây là source of truth cho phần hiện thực (thay thế bản ASP.NET).

Trước khi viết code:
1. Đọc toàn bộ file.
2. Tóm tắt phạm vi: GIỮ / ĐƠN GIẢN HÓA / BỎ (mục 1).
3. Liệt kê 18 entity theo mục 7.
4. Tóm tắt 6 vai trò và quyền (mục 5).
5. Tóm tắt các workflow ở mục 12 và điểm [TX]/[EV].
6. Liệt kê các quyết định ở mục 10.
7. Chưa tạo/sửa/xóa code.

Không tự thay đổi schema, nghiệp vụ, phạm vi hoặc thêm framework/pattern.
Sau khi tôi xác nhận, chỉ triển khai Phase 0.
```

# 27. PROMPT CHO MỖI PHASE

```text
Triển khai Phase <N> theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md.

Trước khi code: liệt kê Requirement/Use Case, entity/table, business rule, file dự kiến sửa, mục checklist sẽ kiểm.

Trong khi code:
- giữ đúng ERD (mục 7) và API contract (mục 13);
- Controller → Service → ServiceImpl → Repository, DTO là record, không trả entity ra API;
- authorization ở backend;
- business logic ở ServiceImpl/entity, không ở frontend;
- transaction + khóa dòng theo mục 16.3; phát event real-time sau commit;
- không thêm bảng/chức năng ngoài spec; không over-engineer.

Sau khi code:
1. mvnw clean verify và bun run build;
2. chạy app, kiểm các mục checklist của phase;
3. báo file đã thay đổi;
4. báo Requirement/Use Case đã hoàn thành;
5. báo mọi khác biệt với spec.

Không tự bắt đầu phase tiếp theo.
```

# 28. PROMPT REVIEW SAU PHASE

```text
Review phase vừa hoàn thành theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md.

Kiểm tra:
1. Có bám Requirement và phạm vi mục 1 không (không làm thừa chức năng đã BỎ)?
2. Vai trò/phân quyền có đúng mục 5 và mục 13 không?
3. Workflow có đúng mục 12 không?
4. Entity/relationship/constraint có đúng mục 7, 9, 16 không?
5. Hành vi entity có đúng ý nghĩa Class Diagram (mục 8) không?
6. Có thêm bảng/cột/domain ngoài spec không?
7. Transaction/khóa dòng có thiếu không? Có lỗi double-submit/idempotency không?
8. Có business logic nằm sai ở Controller/frontend không?
9. Có N+1/query thừa không?
10. Event real-time có phát sau commit và đúng loại không?
11. Thuật ngữ/nhãn trạng thái UI có nhất quán mục 6 không?
12. Build và unit test có sạch không? Checklist liên quan có đạt không?

Nếu phát hiện lệch khóa luận, đề xuất cách sửa nhưng không tự thay đổi mô hình nếu ảnh hưởng ERD/Requirement.
```

---

# 29. GHI NHỚ CUỐI CÙNG

```text
Đúng nghiệp vụ
> đúng Requirement
> đúng dữ liệu
> chạy ổn định
> kịp hạn 27/10
> dễ demo
> dễ giải thích
> công nghệ vừa đủ
```

Khi có lựa chọn giữa cách đơn giản, rõ ràng, đúng khóa luận và cách phức tạp nhưng “enterprise” hơn:

**luôn chọn cách đơn giản, rõ ràng, đúng khóa luận.**


---

# PHỤ LỤC A — ĐỐI CHIẾU TÊN KHÓA LUẬN ↔ TÊN TRONG CODE

Dùng khi viết báo cáo hoặc khi bảo vệ: tên trong ERD/Class Diagram tương ứng tên nào trong code. Các thuộc tính ở mục 7, 8 khi hiện thực đều theo bảng này.

## A.1 Thực thể / bảng

| Khóa luận (ERD, Class Diagram) | Entity (Java) | Bảng (PostgreSQL) |
|---|---|---|
| TaiKhoan | `Account` | `account` |
| KhuVucBan | `DiningArea` | `dining_area` |
| Ban | `DiningTable` | `dining_table` |
| DonDatBan | `Reservation` | `reservation` |
| PhienPhucVu | `ServiceSession` | `service_session` |
| DonGoiMon | `FoodOrder` | `food_order` |
| ChiTietDonGoiMon | `OrderItem` | `order_item` |
| MonAn | `MenuItem` | `menu_item` |
| DinhLuongMonAn | `RecipeItem` | `recipe_item` |
| NguyenVatLieu | `Ingredient` | `ingredient` |
| LoNguyenVatLieu | `IngredientLot` | `ingredient_lot` |
| PhieuNhap | `StockReceipt` | `stock_receipt` |
| ChiTietPhieuNhap | `StockReceiptItem` | `stock_receipt_item` |
| PhieuKiemKe | `Stocktake` | `stocktake` |
| ChiTietKiemKe | `StocktakeItem` | `stocktake_item` |
| BienDongKho | `StockMovement` | `stock_movement` |
| HoaDon | `Invoice` | `invoice` |
| DoiSoatDoanhThu | `RevenueReconciliation` | `revenue_reconciliation` |

Tên bảng tránh từ khóa SQL: không dùng `table`, `order`, `user`.

## A.2 Thuộc tính

| Khóa luận | Field (Java) | Cột |
|---|---|---|
| maXxx (khóa chính) | `id` | `id` |
| maBan / maKhuVuc / maDatBan / maPhienPhucVu / maDonGoiMon | `tableId` / `areaId` / `reservationId` / `sessionId` / `orderId` | `table_id` / `area_id` / `reservation_id` / `session_id` / `order_id` |
| maMonAn / maNguyenVatLieu / maLo | `menuItemId` / `ingredientId` / `lotId` | `menu_item_id` / `ingredient_id` / `lot_id` |
| maPhieuNhap / maPhieuKiemKe | `receiptId` / `stocktakeId` | `receipt_id` / `stocktake_id` |
| maChiTietNhap / maChiTietDon / maChiTietKiemKe | `receiptItemId` / `orderItemId` / `stocktakeItemId` | `receipt_item_id` / `order_item_id` / `stocktake_item_id` |
| maNguoiTao / maNguoiThucHien | `createdById` / `performedById` | `created_by_id` / `performed_by_id` |
| maThuNgan / maQuanLy | `cashierId` / `managerId` | `cashier_id` / `manager_id` |
| hoTen / soDienThoai / matKhau | `fullName` / `phone` / `passwordHash` | `full_name` / `phone` / `password_hash` |
| vaiTro / trangThai | `role` / `status` | `role` / `status` |
| tenKhuVuc / tenBan / tenMon / tenNguyenVatLieu | `name` | `name` |
| sucChua | `capacity` | `capacity` |
| tenKhach / soDienThoaiKhach / soLuongKhach | `customerName` / `customerPhone` / `guestCount` | `customer_name` / `customer_phone` / `guest_count` |
| thoiGianBatDau / thoiGianKetThuc | `startTime` / `endTime` | `start_time` / `end_time` |
| thoiGianMo / thoiGianDong | `openedAt` / `closedAt` | `opened_at` / `closed_at` |
| ngayTao / thoiGianTao | `createdAt` | `created_at` |
| ghiChu | `note` | `note` |
| soLuong / soLuongNhap | `quantity` | `quantity` |
| lyDoKhongTheCheBien | `unavailableReason` | `unavailable_reason` |
| donGiaTaiThoiDiem | `unitPriceAtOrder` | `unit_price_at_order` |
| giaBan | `price` | `price` |
| soLuongDinhMuc | `quantityPerServing` | `quantity_per_serving` |
| donViTinh | `unit` | `unit` |
| nguongTonToiThieu | `minStock` | `min_stock` |
| theoDoiLo / theoDoiHSD | `trackLot` / `trackExpiry` | `track_lot` / `track_expiry` |
| soLo / hanSuDung | `lotNumber` / `expiryDate` | `lot_number` / `expiry_date` |
| soLuongHeThong / soLuongThucTe | `systemQuantity` / `actualQuantity` | `system_quantity` / `actual_quantity` |
| loaiBienDong / soLuongThayDoi / lyDo / thoiGian | `movementType` / `quantityChange` / `reason` / `occurredAt` | `movement_type` / `quantity_change` / `reason` / `occurred_at` |
| phuongThuc / soTien / thoiGianThanhToan | `paymentMethod` / `amount` / `paidAt` | `payment_method` / `amount` / `paid_at` |
| doanhThuHeThong / soTienThucNhan | `systemRevenue` / `actualAmount` | `system_revenue` / `actual_amount` |
| lyDoChenhLech / thoiGianDoiSoat | `differenceReason` / `reconciledAt` | `difference_reason` / `reconciled_at` |

## A.3 Phương thức (Class Diagram)

| Khóa luận | Code | Khóa luận | Code |
|---|---|---|---|
| xacThucMatKhau | `verifyPassword` | tinhThanhTien | `calculateSubtotal` |
| capNhatThongTin | `updateInfo` | batDauCheBien | `startCooking` |
| doiMatKhau | `changePassword` | baoKhongTheCheBien | `markUnavailable` |
| khoa / moKhoa | `lock` / `unlock` | hoanThanh | `markReady` |
| thayDoiVaiTro | `changeRole` | xacNhanDaPhucVu | `markServed` |
| kichHoat / ngungSuDung | `activate` / `deactivate` | thayDoiGia | `changePrice` |
| kiemTraSucChua | `hasEnoughCapacity` | ngungKinhDoanh | `discontinue` |
| kiemTraTrungLich | `checkOverlap` | tinhLuongTieuHao | `calculateConsumption` |
| huy | `cancel` | kiemTraDuoiNguong | `isBelowMinStock` |
| xacNhanNhanBan | `confirmSeated` | kiemTraHetHan / kiemTraSapHetHan | `isExpired` / `isExpiringSoon` |
| tinhTongTien | `calculateTotal` | themChiTietMon / themChiTietNhap / themChiTietKiemKe | `addItem` |
| kiemTraDieuKienThanhToan | `checkPayable` | tinhChenhLech | `calculateDifference` |
| ketThuc | `close` | laTangKho / laGiamKho | `isIncrease` / `isDecrease` |
| xacNhan | `confirm` | | |

## A.4 Trạng thái, vai trò, loại

| Khóa luận | Enum (Java) | Giá trị khóa luận → giá trị trong code |
|---|---|---|
| Vai trò | `Role` | `CHU_QUAN`→`OWNER` · `QUAN_LY`→`MANAGER` · `THU_NGAN`→`CASHIER` · `NHAN_VIEN_PHUC_VU`→`WAITER` · `NHAN_VIEN_BEP`→`KITCHEN_STAFF` · `BEP_TRUONG`→`HEAD_CHEF` |
| Trạng thái tài khoản | `AccountStatus` | `HOAT_DONG`→`ACTIVE` · `BI_KHOA`→`LOCKED` |
| Trạng thái khu vực | `AreaStatus` | `HOAT_DONG`→`ACTIVE` · `NGUNG_SU_DUNG`→`INACTIVE` |
| Trạng thái bàn | `TableStatus` | `TRONG`→`AVAILABLE` · `DANG_PHUC_VU`→`OCCUPIED` · `NGUNG_SU_DUNG`→`INACTIVE` |
| Trạng thái đặt bàn | `ReservationStatus` | `DA_XAC_NHAN`→`CONFIRMED` · `DA_NHAN_BAN`→`SEATED` · `DA_HUY`→`CANCELLED` |
| Trạng thái phiên | `SessionStatus` | `DANG_HOAT_DONG`→`ACTIVE` · `DA_KET_THUC`→`CLOSED` |
| Trạng thái món trong đơn | `OrderItemStatus` | `CHO_CHE_BIEN`→`PENDING` · `DANG_CHE_BIEN`→`COOKING` · `HOAN_THANH`→`READY` · `DA_PHUC_VU`→`SERVED` · `KHONG_THE_CHE_BIEN`→`UNAVAILABLE` · `DA_HUY`→`CANCELLED` |
| Trạng thái món ăn | `MenuItemStatus` | `DANG_KINH_DOANH`→`ON_SALE` · `NGUNG_KINH_DOANH`→`DISCONTINUED` |
| Trạng thái NVL | `IngredientStatus` | `DANG_SU_DUNG`→`ACTIVE` · `NGUNG_SU_DUNG`→`INACTIVE` |
| Loại biến động | `MovementType` | `NHAP`→`RECEIPT` · `TIEU_HAO`→`CONSUMPTION` · `DIEU_CHINH_KIEM_KE`→`STOCKTAKE_ADJUSTMENT` · `LOAI_BO`→`DISPOSAL` |
| Phương thức thanh toán | `PaymentMethod` | `TIEN_MAT`→`CASH` · `CHUYEN_KHOAN`→`BANK_TRANSFER` |

## A.5 Controller / Service

| Nhóm chức năng | Controller | Service |
|---|---|---|
| Đăng nhập | `AuthController` | `AuthService` |
| Tài khoản | `AccountController` | `AccountService` |
| Sơ đồ bàn, đặt bàn | `TableController` | `TableService`, `ReservationService` |
| Phiên phục vụ, gọi món, phục vụ | `ServiceSessionController` | `ServiceSessionService` |
| Bếp | `KitchenController` | `KitchenService` |
| Thực đơn, định lượng | `MenuController` | `MenuService` |
| Kho (NVL, nhập, kiểm kê, loại bỏ, biến động) | `InventoryController` | `InventoryService` |
| Thanh toán, hóa đơn, báo cáo doanh thu | `PaymentController` | `PaymentService` |
| Đối soát cuối ca | `PaymentController` | `ReconciliationService` |
| Real-time (SSE) | `EventController` | — (`SseHub`) |
