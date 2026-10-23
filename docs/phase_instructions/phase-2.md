# Phase 2 — Gọi món + Bếp + Real-time (24/10)

> **Hướng dẫn lịch sử:** Phase 0–3/review đã triển khai. Code tiếp theo dùng
> [bàn giao Phase 4](../PHASE_4_HANDOFF.md), [hướng dẫn](phase-4.md);
> các mốc Phase 2 dưới đây là nguồn hồi quy, không phải lệnh triển khai lại.

**Trạng thái:** đã triển khai ngày 23/10/2026 theo yêu cầu chủ dự án;
kết quả và giới hạn ở [báo cáo Phase 2](../phase_results/phase-2.md).
Ngày 24/10 trong tiêu đề là lịch dự kiến ban đầu.

**Đọc trước:** [CLAUDE.md](../../CLAUDE.md), [bàn giao Phase 2](../PHASE_2_HANDOFF.md),
[review Phase 1](../phase_results/phase-1-review.md),
và master §1, §4–§9, §10.2 (D4, D5, D10, D11), §11, §12.9–§12.11,
§13.1/§13.5/§13.6/§13.10, §14–§18, §20–§21, Phụ lục A.
**Requirement:** FR-05/UC8.2, FR-06/UC8.2/UC9, FR-07/UC9, FR-08/UC8.3,
FR-18 (tiêu hao), TR-11, NFR-02, BR-03/04/11.
**Checklist cuối phase:** 14, hoàn thiện 15–16 phần Phase 2, 17–22, 35;
kiểm thêm reload/tablet phần Phase 2 của 36 (§21.2).

## Ranh giới và nền cần giữ

- Chỉ Phase 2: gọi món, bếp, tiêu hao CONSUMPTION, phục vụ và SSE. Không làm thanh toán,
  đóng phiên/trả bàn, phiếu nhập/kiểm kê/loại bỏ, tồn kho đầy đủ, đối soát/báo cáo.
- Không đổi V1, không thêm bảng/cột/migration hoặc role/trạng thái. Nếu thực sự cần đổi schema,
  nêu nhu cầu và dừng phần phụ thuộc để hỏi chủ dự án theo §0.
- Giữ D10, seed theo từng khối, PUT recipe khóa MenuItem, cho giữ NVL inactive đã có,
  bộ lọc tableId/unexpired và walk-in độc lập query. Không mở lại nợ review đã sửa.
- Nền backend có OrderItem guard, FoodOrder.addItem/calculateTotal, RecipeItem.calculateConsumption,
  OrderItemRepository.findLockedById và constructor snapshot giá. Chưa có service/query Phase 2.
- Giữ style sau review: import và kiểu tường minh cho kết quả repository/Optional/thời gian,
  không wildcard/FQN inline hoặc nhiều lệnh một dòng; var chỉ khi new X hiển nhiên.
- ReservationServiceImpl và ServiceSessionServiceImpl có comment vị trí publish;
  Phase 2 nối event sau commit và bỏ qua PATCH no-op. Không thêm một đường mở phiên mới.

## Backend

Giữ Controller → Service interface → ServiceImpl → Repository; DTO record, mapper thủ công.
Controller validate + @PreAuthorize + gọi service; không truy cập repository hoặc xử lý workflow.
Thời gian dùng Clock/Instant, audit lấy CurrentUser, số lượng/tiền dùng BigDecimal;
request kiểm @Size theo độ dài cột (note/reason tối đa 500), @NotBlank cho reason,
quantity từ 1–99 và items từ 1–50 dòng (chủ dự án chốt review 23/10/2026).
Không tin giá/người/thời điểm nghiệp vụ từ client.

### API cần thêm theo §13

| Method | Endpoint | Role | Body / kết quả |
|---|---|---|---|
| GET | `/api/sessions/{id}` | WAITER, MANAGER, CASHIER | Chi tiết bàn/đặt bàn/giờ mở, đợt gọi món + items/trạng thái, tạm tính |
| POST | `/api/sessions/{id}/orders` | WAITER, MANAGER | `{items:[{menuItemId, quantity, note?}]}`; một FoodOrder mới |
| PATCH | `/api/sessions/items/{orderItemId}/cancel` | WAITER, MANAGER | Hủy PENDING |
| PATCH | `/api/sessions/items/{orderItemId}/serve` | WAITER | READY → SERVED |
| GET | `/api/sessions/items/awaiting-service` | WAITER | READY và UNAVAILABLE kèm lý do, chỉ phiên ACTIVE |
| GET | `/api/kitchen/queue` | KITCHEN_STAFF, HEAD_CHEF | PENDING/COOKING của phiên ACTIVE, sắp FoodOrder.createdAt |
| PATCH | `/api/kitchen/items/{id}/start` | KITCHEN_STAFF, HEAD_CHEF | PENDING → COOKING |
| PATCH | `/api/kitchen/items/{id}/unavailable` | KITCHEN_STAFF, HEAD_CHEF | `{reason}` |
| PATCH | `/api/kitchen/items/{id}/complete` | KITCHEN_STAFF, HEAD_CHEF | COOKING → READY và tiêu hao |
| GET | `/api/events` | Đăng nhập | SSE text/event-stream |

Mở rộng ServiceSessionController/ServiceSessionService hiện có; thêm KitchenController/
KitchenService/KitchenServiceImpl, EventController và các DTO/mapper/query cần thiết.
Không đổi response POST mở phiên đang dùng sessionId.

### Workflow

1. Gọi món `[TX]`: phiên phải `ACTIVE`; tạo `FoodOrder` mới; thêm `OrderItem` chỉ cho món `ON_SALE`, `quantity > 0`, snapshot `unitPriceAtOrder = MenuItem.price`, trạng thái `PENDING`. Gọi thêm = `FoodOrder` mới cùng phiên.
2. Hủy món: chỉ `PENDING → CANCELLED` (WAITER, MANAGER).
3. `GET /api/sessions/{id}` (đợt gọi món + món + tạm tính) và `GET /api/sessions/items/awaiting-service` (`READY` + `UNAVAILABLE` kèm lý do).
4. Bếp (`KitchenService`): `queue`, `start`, `unavailable` (lý do bắt buộc, không tiêu hao), `complete`.
   - `complete` `[TX]`: khóa dòng `OrderItem` → nếu đã `READY/SERVED` trả thành công không làm gì → nếu không phải `COOKING` thì 409 → với mỗi `RecipeItem` tạo `StockMovement` `CONSUMPTION`, `quantityChange = −(quantityPerServing × quantity)`, `lotId = NULL`, `performedById` = người bấm → `markReady()`. Món chưa có định lượng vẫn hoàn thành. Tồn âm vẫn cho phép (D5).
5. Phục vụ: `PATCH .../serve` chỉ `READY → SERVED`.
6. Entity guard chuyển trạng thái (`startCooking`, `markUnavailable`, `markReady`, `markServed`, `cancel`) ném `BusinessException` khi sai.
7. SSE (§14.1): `EventController` (`SseEmitter`), `SseHub`, heartbeat 20s, `RealtimeEvent` + `@TransactionalEventListener(AFTER_COMMIT)`. Phát `FLOOR_PLAN`, `RESERVATION`, `ORDER` đúng bảng §14.1 (gồm cả các thao tác Phase 1).

- Mọi chuyển trạng thái món lấy sessionId bằng query scalar, khóa Session → OrderItem theo §16.3;
  kiểm phiên ACTIVE trước cả nhánh no-op, giữ check và thay đổi trong cùng transaction.
  Lặp complete ở READY/SERVED là no-op trước khi đọc recipe/tạo movement.
- Complete đọc recipe hiện tại, bao gồm NVL inactive được giữ từ trước; không lọc ACTIVE
  làm mất tiêu hao. Không cần recipe snapshot mới. Định lượng đổi không sửa movement đã ghi.
- Unique sẵn có `uq_consumption_order_ingredient` là lưới an toàn; không thay lock bằng
  check tồn tại ngoài transaction. Lỗi DB ra 409 sạch qua handler, không lộ SQL hoặc báo nhầm SESSION_ALREADY_ACTIVE.
- Tạm tính từ unitPriceAtOrder × quantity, bỏ CANCELLED/UNAVAILABLE. Không lấy giá hiện tại
  hoặc tổng client. Đây chưa phải Invoice/thanh toán.
- Query session/orders/items và queue tránh N+1; map khi transaction đọc còn mở vì OSIV=false.
- PATCH cùng đích không phát event mới; rollback không phát. cancel reservation đã CANCELLED
  hiện là no-op, phải phân biệt trước khi publish RESERVATION.
- SSE sau commit chỉ enqueue sang executor riêng, không gửi trên thread HTTP; task gửi bắt Exception,
  lỗi dispatch/rejection không làm hỏng response đã commit. Queue hữu hạn, không CallerRuns.

## Frontend
- `/sessions/:id` (gọi món/gọi thêm, hủy món, Đã phục vụ, tạm tính), `/awaiting-service`, `/kitchen` (2 cột, chữ lớn, tablet).
- `useRealtime` (§14.2) gắn trong `AppLayout`, map event → invalidate query key; `refetchInterval: 30_000` dự phòng cho sơ đồ bàn, bếp, món chờ phục vụ.

- Dùng api/<name>Api.ts, types/<name>.ts, page lazy-load. Không thêm UI/state lib.
  Nhãn/màu từ labels.ts/StatusTag, tiền MoneyText, thời gian DD/MM/YYYY HH:mm giờ Việt Nam;
  lỗi message/fieldErrors qua useApiFeedback; loading/disable khi gửi và Popconfirm trước hủy món.
- Session page chỉ WAITER/MANAGER theo §15; MANAGER có gọi/hủy, nút Đã phục vụ chỉ WAITER.
  Quyền GET backend cho CASHIER phục vụ Phase 3, không tự mở route gọi món cho CASHIER/OWNER.
- Gọi món chỉ chọn GET menu-items?status=ON_SALE; backend vẫn kiểm món vừa bị ngừng.
  UI không tự tính tổng làm nguồn quyết định nghiệp vụ.
- SSE dùng fetch-event-source với Authorization, openWhenHidden=true, timeout server 30 phút,
  heartbeat 20s; cleanup khi logout/unmount/đổi token. Không mở stream công khai hoặc thêm token vào URL.
- Event chỉ chứa type/sessionId theo §14.1; refetch REST và chuẩn hóa kiểu sessionId trong key.
  FLOOR_PLAN invalidate floor-plan/payment/session; RESERVATION invalidate reservations/floor-plan;
  ORDER invalidate kitchen/session/awaiting-service/payment. Khi reconnect invalidate lại toàn bộ key liên quan.
  Giữ prefix để picker reservations theo bàn cũng được làm mới. Query payment chưa có vẫn được giữ trong mapping.
- Giữ chính sách retry không lặp 4xx, chống stale 401 và xóa cache khi đổi tài khoản;
  không lặp toast do tự thêm interceptor khác. SSE disconnect dùng handler debug hiện có.

## Test và QA

JUnit 5 + Mockito, không cần DB: tổng phiên/giá snapshot, gọi thêm, món đã ngừng,
phiên không ACTIVE, OrderItem guard/no-op, unavailable có lý do/không tiêu hao,
complete đúng dấu/nguồn/số movement, recipe rỗng/inactive, tồn âm, lặp complete,
ma trận 6 role và annotation coverage. Test event đúng loại, không phát cho no-op/rollback.

QA app thật trên Neon main theo quyết định 22/10; không bắt tạo branch.
Đọc readiness trước. Snapshot gần nhất có 9 phiên ACTIVE/3 bàn trống; dùng lại phiên QA
phù hợp sau khi xác minh và lấy id qua API để hạn chế chiếm thêm bàn. Chưa có đóng phiên.
Không sửa ngày seed hoặc movement để dọn QA. Dữ liệu [QA], guard cho script ghi tương đương
PHASE1_QA_ALLOW_WRITES=main, không tự reset; nếu thực sự reset theo quyền đã cấp thì ghi report.

Kiểm 2 request complete song song chỉ có một bộ movement, rollback không lưu một phần;
2 browser context WAITER/KITCHEN_STAFF trên API thật cập nhật 1–2 giây không F5;
reconnect, logout, fallback polling, unavailable hiện đúng lý do và tablet không tràn ngang.
Chỉ rõ kiểm nào dùng mock, kiểm nào dùng Neon thật; không gọi unit/mock là nghiệm thu end-to-end.

## Xong khi
- Build sạch; checklist 14, 17–22 đạt.
- Mở 2 trình duyệt (WAITER + KITCHEN_STAFF): bếp thấy món mới, phục vụ thấy món hoàn thành, sơ đồ bàn đổi trạng thái không cần F5 (mục 35). Bấm Hoàn thành 2 lần không trừ kho 2 lần.
- Backend `mvnw.cmd clean verify` nêu số test; frontend `bun run test`, `bun run build`,
  `bun run lint` sạch. Baseline trước Phase 2: 83 backend, 13 frontend, 4 test guard.
- Cập nhật TRACEABILITY đúng phần đã làm và tạo docs/phase_results/phase-2.md có checklist
  từng mục, tác động dữ liệu, file đổi, lệnh tái lập, khác biệt/giới hạn và bàn giao Phase 3.
- Không coi FR-04 hoàn tất khi chưa đóng phiên Phase 3. Không commit/push hoặc tự sang Phase 3.

## Prompt

Bản đầy đủ, sẵn để copy: [phase-2-prompt.md](phase-2-prompt.md).

```text
Triển khai Phase 2 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-2.md.
Đọc docs/PHASE_2_HANDOFF.md và docs/phase_results/phase-1-review.md để giữ các quyết định sau review.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build/test/lint cả hai phía, kiểm 14–22 và 35, phần Phase 2 của 36, gồm real-time 2 trình duyệt và race complete.
QA Neon main có guard, không tự reset; ghi rõ dữ liệu và giới hạn. Không commit/push, không tự sang Phase 3.
```
