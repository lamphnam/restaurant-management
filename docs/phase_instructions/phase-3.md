# Phase 3 — Thanh toán + Kho (25/10)

**Đọc trước:** §10.2 (D5–D8, D12), §11, §12.3, §12.12–§12.17, §13.8–§13.9 (phần thanh toán), §16.3.
**Requirement:** FR-09, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16 (UC6.3), BR-06/07/11.
**Checklist cuối phase:** 23–32 (§21.2).

Lưu ý review Phase 0: khi làm thanh toán, rà guard của ServiceSession.close() và DiningTable.release(), test chuyển sai trạng thái; idempotency của PATCH được xử lý theo §13.1. Seed kiểm kê/nhập có runner/cổng riêng theo §20, không phụ thuộc account rỗng và không tự sửa ngày của dữ liệu lịch sử để làm mới demo.

## Backend — Thanh toán (UC11.1)
1. `open-sessions`: phiên `ACTIVE` + tạm tính + cờ còn món `PENDING/COOKING`.
2. Xem trước hóa đơn: bỏ `CANCELLED`, `UNAVAILABLE`; tổng = Σ `quantity × unitPriceAtOrder`; liệt kê món chặn thanh toán.
3. `POST /api/payments` `[TX]`: khóa `ServiceSession` → phải `ACTIVE`, chưa có `Invoice` (409 "Phiên đã được thanh toán") → không còn `PENDING/COOKING` → tính lại tổng ở backend → tạo `Invoice` → `close()` → bàn `AVAILABLE` → phát `FLOOR_PLAN`. Phiên 0đ vẫn đóng được (D8).
4. `GET /api/invoices` (lọc từ/đến, phương thức, phân trang).

## Backend — Kho
1. NVL: CRUD, ngừng/kích hoạt; không đổi `unit` nếu đã có `StockMovement` (D12). Danh sách kèm `currentStock` (một query `GROUP BY ingredient_id`) và `belowMinStock`.
2. Nhập (`POST /api/inventory/receipts`) `[TX]`: `StockReceipt` → mỗi dòng: `trackExpiry` thì `expiryDate` bắt buộc; `trackLot` hoặc `trackExpiry` thì tạo `IngredientLot` → `StockReceiptItem` → `StockMovement` `RECEIPT` dương.
3. Kiểm kê `[TX]`: `template` trả tồn hiện tại; `POST` tính lại `systemQuantity` ở backend (D7), tạo `Stocktake` + `StocktakeItem`; chênh lệch ≠ 0 mới tạo `STOCKTAKE_ADJUSTMENT`. Dùng kiểm kê khởi tạo để seed tồn đầu.
4. Loại bỏ `[TX]`: khóa `Ingredient`; `quantity > 0`, không vượt tồn tổng, lý do bắt buộc; `DISPOSAL` âm.
5. `lots/attention` (đã/sắp hết hạn theo `app.alert.expiry-days`, múi giờ `app.timezone`); `movements` (lọc NVL/loại/thời gian, phân trang, đủ 4 loại kèm nguồn).
6. Seed: phiếu nhập có lô (1 lô còn 2 ngày, 1 lô đã hết hạn), 2 NVL tồn thấp, kiểm kê khởi tạo.

## Frontend
- `/payment` (danh sách → xem trước → chọn phương thức → xác nhận, `Popconfirm`), `/invoices`.
- `/inventory` (tab Tồn kho / Lô cần chú ý / Biến động; tag tồn thấp, đỏ khi âm; nút Loại bỏ), `/inventory/receipts`, `/inventory/stocktake`.

## Xong khi
- Build sạch; checklist 23–32 đạt; bấm Thanh toán 2 lần chỉ ra 1 hóa đơn.
- Tồn hiển thị = tổng biến động (kiểm tay trên 1–2 NVL).

## Prompt
```text
Triển khai Phase 3 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-3.md.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build cả hai phía, chạy app, kiểm checklist, báo file đã đổi và khác biệt với spec. Không tự sang Phase 4.
```
