# Phase 2 — Gọi món + Bếp + Real-time (24/10)

**Đọc trước:** §6 (chuyển trạng thái), §10.2 (D4, D5), §11, §12.9–§12.11, §13.5–§13.6, §14, §16.3.
**Requirement:** FR-05, FR-06, FR-07, FR-08, FR-18 (tiêu hao), TR-11, NFR-02, BR-03/04/11.
**Checklist cuối phase:** 14, 17–22, 35 (§21.2).

Ghi chú bàn giao từ Phase 1: ReservationServiceImpl và ServiceSessionServiceImpl đã đánh dấu vị trí publish RESERVATION/FLOOR_PLAN; Phase 2 mới thêm event và phát sau commit, bỏ qua PATCH no-op. GET /api/sessions/{id} và màn chi tiết vẫn chưa có; giữ snapshot unitPriceAtOrder khi tạo OrderItem. QA Phase 1 dùng Neon main theo duyệt mới nhất, còn các phiên ACTIVE được ghi trong phase-1 report.

## Backend
1. Gọi món `[TX]`: phiên phải `ACTIVE`; tạo `FoodOrder` mới; thêm `OrderItem` chỉ cho món `ON_SALE`, `quantity > 0`, snapshot `unitPriceAtOrder = MenuItem.price`, trạng thái `PENDING`. Gọi thêm = `FoodOrder` mới cùng phiên.
2. Hủy món: chỉ `PENDING → CANCELLED` (WAITER, MANAGER).
3. `GET /api/sessions/{id}` (đợt gọi món + món + tạm tính) và `GET /api/sessions/items/awaiting-service` (`READY` + `UNAVAILABLE` kèm lý do).
4. Bếp (`KitchenService`): `queue`, `start`, `unavailable` (lý do bắt buộc, không tiêu hao), `complete`.
   - `complete` `[TX]`: khóa dòng `OrderItem` → nếu đã `READY/SERVED` trả thành công không làm gì → nếu không phải `COOKING` thì 409 → với mỗi `RecipeItem` tạo `StockMovement` `CONSUMPTION`, `quantityChange = −(quantityPerServing × quantity)`, `lotId = NULL`, `performedById` = người bấm → `markReady()`. Món chưa có định lượng vẫn hoàn thành. Tồn âm vẫn cho phép (D5).
5. Phục vụ: `PATCH .../serve` chỉ `READY → SERVED`.
6. Entity guard chuyển trạng thái (`startCooking`, `markUnavailable`, `markReady`, `markServed`, `cancel`) ném `BusinessException` khi sai.
7. SSE (§14.1): `EventController` (`SseEmitter`), `SseHub`, heartbeat 20s, `RealtimeEvent` + `@TransactionalEventListener(AFTER_COMMIT)`. Phát `FLOOR_PLAN`, `RESERVATION`, `ORDER` đúng bảng §14.1 (gồm cả các thao tác Phase 1).

## Frontend
- `/sessions/:id` (gọi món/gọi thêm, hủy món, Đã phục vụ, tạm tính), `/awaiting-service`, `/kitchen` (2 cột, chữ lớn, tablet).
- `useRealtime` (§14.2) gắn trong `AppLayout`, map event → invalidate query key; `refetchInterval: 30_000` dự phòng cho sơ đồ bàn, bếp, món chờ phục vụ.

## Xong khi
- Build sạch; checklist 14, 17–22 đạt.
- Mở 2 trình duyệt (WAITER + KITCHEN_STAFF): bếp thấy món mới, phục vụ thấy món hoàn thành, sơ đồ bàn đổi trạng thái không cần F5 (mục 35). Bấm Hoàn thành 2 lần không trừ kho 2 lần.

## Prompt
```text
Triển khai Phase 2 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-2.md.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build cả hai phía, chạy app, kiểm checklist (gồm test real-time 2 trình duyệt), báo file đã đổi và khác biệt với spec. Không tự sang Phase 3.
```
