# Phase 1 — Danh mục + Đặt bàn + Mở phiên (23/10)

**Đọc trước:** §5, §10.2 (D1–D3, D11, D12), §12.2–§12.8, §13.3–§13.5, §13.7, §15, §16.3.
**Requirement:** FR-01 (UC4), FR-02 (UC5), FR-03 (UC7), FR-04 (UC8.1), FR-18 (định lượng).
**Checklist cuối phase:** 5–13, 15–16 (§21.2).

## Backend
1. `AccountController/Service`: danh sách, tạo (SĐT unique, BCrypt, mật khẩu ≥ 6), khóa/mở khóa, đổi vai trò. Chủ quán không tự khóa/đổi vai trò mình.
2. `MenuController/Service`: CRUD món (`ON_SALE`/`DISCONTINUED`), đổi giá, `GET/PUT /api/menu-items/{id}/recipe` (thay toàn bộ dòng, `quantityPerServing > 0`, không trùng NVL, chỉ NVL `ACTIVE`).
   - Cần dữ liệu NVL: thêm tối thiểu CRUD đọc `Ingredient` để chọn trong form định lượng (CRUD đầy đủ ở Phase 3).
3. `TableController`: `GET /api/tables/floor-plan` (khu vực → bàn, phiên đang mở, đặt bàn hiệu lực/sắp tới theo D2).
4. Đặt bàn (`ReservationService`): `GET` (lọc ngày/trạng thái/q, phân trang), `available-tables`, tạo, hủy.
   - Tạo: khóa dòng `DiningTable` → `hasEnoughCapacity` → `checkOverlap` (`newStart < existingEnd AND newEnd > existingStart`, chạm biên không trùng) → `CONFIRMED`.
   - Hủy chỉ khi `CONFIRMED`, không DELETE.
5. Mở phiên (`ServiceSessionService.open`) `[TX]`: khóa bàn, bàn không `INACTIVE`, không có phiên `ACTIVE`, nếu có đặt bàn thì `confirmSeated()` + gắn `reservationId`, tạo `ServiceSession`, bàn → `OCCUPIED`.
6. Seed bổ sung: món (10), NVL (10), định lượng (≥ 6 món), 3 đặt bàn (§20).

## Frontend
- `/accounts`, `/menu` (+ Drawer Định lượng), `/floor-plan` (card bàn, nút Mở phiên/Xem phiên, hỏi xác nhận khi walk-in sát giờ đặt), `/reservations` (tạo → gợi ý bàn, hủy).
- Chưa cần real-time (Phase 2); dùng `refetchOnWindowFocus`.

## Xong khi
- Build sạch; checklist 5–13, 15–16 đạt.
- Mở 2 phiên cho cùng bàn (bấm 2 lần / 2 tab) → chỉ một thành công.

## Prompt
```text
Triển khai Phase 1 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-1.md.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build cả hai phía, chạy app, kiểm checklist, báo file đã đổi và khác biệt với spec. Không tự sang Phase 2.
```
