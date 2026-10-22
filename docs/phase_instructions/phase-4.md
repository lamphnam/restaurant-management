# Phase 4 — Đối soát + Báo cáo + Hoàn thiện (26/10)

**Đọc trước:** §10.1 (ý 1), §10.2 (D9), §12.18–§12.19, §13.9, §19, §21, §24, §25.
**Requirement:** FR-10 (UC11.2), FR-16, FR-17 (UC6.1), BR-05/08/09, TR-09.
**Checklist cuối phase:** 33–36 và chạy lại toàn bộ 1–36.

## Backend
1. Đối soát (`ReconciliationService`): `preview?from&to` (số hóa đơn, `systemRevenue`, tách tiền mặt/chuyển khoản); `POST` tạo (backend tự tính lại `systemRevenue`, `reconciledAt = now`, `managerId = NULL`); `GET` danh sách; `PATCH .../confirm` gán `managerId` (đã xác nhận → 409). "Ca" = khoảng `[startTime, endTime)`.
2. Báo cáo: `GET /api/payments/summary?from&to` (doanh thu, số hóa đơn, theo phương thức, top món — chỉ tính chi tiết không `CANCELLED/UNAVAILABLE` của phiên có hóa đơn trong khoảng). Doanh thu chỉ lấy từ `Invoice`.
3. **6 unit test** (§21.1): trùng lịch, tổng tiền phiên, hoàn thành món (+ idempotent), kiểm kê, loại bỏ, chuyển trạng thái sai của `OrderItem`.

## Frontend
- `/reconciliation` (CASHIER lập; MANAGER thấy danh sách "Chưa xác nhận" + Xác nhận), `/reports` (Statistic + Table, trạng thái "Không có dữ liệu").
- Rà UI toàn app: nhãn/trạng thái nhất quán (§6), tablet, `loading` chống double submit, `Popconfirm` cho thao tác không hoàn tác.

## Tài liệu
- `docs/TRACEABILITY.md` theo §19 (trạng thái Đã làm / Đơn giản hóa / Chưa hiện thực) + bảng TR/NFR.
- `README.md`: tạo project Neon, biến môi trường, chạy backend/frontend, tài khoản demo, backup/restore (§24).

## Xong khi
- `.\mvnw.cmd clean verify` (6 test pass) và `bun run build` sạch.
- Checklist §21.2 chạy đủ 36 mục, ghi kết quả.
- Demo xuyên suốt đúng Definition of Done (§25): đặt bàn/walk-in → … → đối soát → báo cáo; và luồng kho.

## Prompt
```text
Triển khai Phase 4 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-4.md.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build, chạy lại toàn bộ checklist 1–36, tạo TRACEABILITY.md và README.md, báo file đã đổi và khác biệt với spec.
```
