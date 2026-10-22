# Phase 1 — Danh mục + Đặt bàn + Mở phiên (23/10)

**Đọc trước:** §5, §10.2 (D1–D3, D11, D12), §12.2–§12.8, §13.3–§13.5, §13.7, §15, §16.3.
**Requirement:** FR-01 (UC4), FR-02 (UC5), FR-03 (UC7), FR-04 (UC8.1), FR-18 (định lượng).
**Checklist cuối phase:** 5–13, 15–16 (§21.2).

## Backend
1. `AccountController/Service`: danh sách, tạo (SĐT unique, BCrypt, mật khẩu ≥ 6), khóa/mở khóa, đổi vai trò. Chủ quán không tự khóa/đổi vai trò mình.
2. `MenuController/Service`: CRUD món (`ON_SALE`/`DISCONTINUED`), đổi giá, `GET/PUT /api/menu-items/{id}/recipe` (thay toàn bộ dòng, `quantityPerServing > 0`, không trùng NVL; chỉ kiểm `ACTIVE` với dòng mới, cho phép giữ/sửa dòng NVL đã ngừng). Khóa `MenuItem` trước khi đọc/diff để tuần tự hóa các PUT cùng món (review 22/10/2026).
   - Cần dữ liệu NVL: thêm tối thiểu CRUD đọc `Ingredient` để chọn trong form định lượng (CRUD đầy đủ ở Phase 3).
3. `TableController`: `GET /api/tables/floor-plan` (khu vực → bàn, phiên đang mở, đặt bàn hiệu lực/sắp tới theo D2).
4. Đặt bàn (`ReservationService`): `GET` (lọc ngày/trạng thái/q, phân trang; thêm `tableId` tùy chọn và `unexpired=true` → `endTime > now`, mặc định false), `available-tables`, tạo, hủy.
   - Tạo: khóa dòng `DiningTable` → `hasEnoughCapacity` → `checkOverlap` (`newStart < existingEnd AND newEnd > existingStart`, chạm biên không trùng) → `CONFIRMED`.
   - Hủy chỉ khi `CONFIRMED`, không DELETE.
5. Mở phiên (`ServiceSessionService.open`) `[TX]`: khóa bàn, bàn không `INACTIVE`, không có phiên `ACTIVE`, nếu có đặt bàn thì `confirmSeated()` + gắn `reservationId`, tạo `ServiceSession`, bàn → `OCCUPIED`.
6. Seed bổ sung: món (10), NVL (10), định lượng (≥ 6 món), 3 đặt bàn (§20). Dùng runner `@Order` sau seed nền tảng, có cổng riêng cho từng khối và transaction; không phụ thuộc account rỗng. Giữ dữ liệu Neon main hiện có, kiểm tra độ tươi ngày demo.

Lưu ý từ review Phase 0: AccountController dùng `@PreAuthorize`, đồng thời gỡ rule URL `/api/accounts/**` đang dành sẵn trong SecurityConfig. Đổi role tuân theo D10 mở rộng (token cũ giữ quyền đến hết 12h, `/me` dùng role token). POST mở phiên chỉ nhận reservation CONFIRMED; siết `confirmSeated()` và test khi triển khai service. PUT thay toàn bộ recipe cần diff các dòng hoặc delete + flush trước insert để tránh trùng khóa kép. Bổ sung ErrorCode nghiệp vụ cụ thể và `@Size` theo độ dài cột trong DTO. Quyền CASHIER xem sơ đồ bàn theo §13.4/§15 (cần đồng bộ mục §5 khi chốt báo cáo).

## Frontend
- `/accounts`, `/menu` (+ Drawer Định lượng), `/floor-plan` (card bàn, nút Mở phiên/Xem phiên, hỏi xác nhận khi walk-in sát giờ đặt), `/reservations` (tạo → gợi ý bàn, hủy).
- Chưa cần real-time (Phase 2); dùng `refetchOnWindowFocus`.
- Modal mở phiên chỉ tải đặt bàn khi chọn chế độ đặt trước; lọc theo bàn và chưa hết giờ trên server. Walk-in không chờ/lệ thuộc query đặt bàn. Phân trang tiếp bằng nút Tải thêm, không tự quét toàn bộ đặt bàn của quán.

## Xong khi
- Build sạch; checklist 5–13, 15–16 đạt.
- Mở 2 phiên cho cùng bàn (bấm 2 lần / 2 tab) → chỉ một thành công.

## QA và dữ liệu — quyết định mới nhất 22/10/2026

- Chủ dự án đã thay yêu cầu branch QA: dùng trực tiếp Neon `main`, không tạo `phase1-qa` và không yêu cầu Neon MCP/CLI.
- Được reset/init lại dữ liệu demo nếu lỗi cần đến việc đó; ghi rõ hành động và kết quả trong phase report. Khởi động bình thường vẫn không sửa/xóa dữ liệu có sẵn.
- Dữ liệu thử có tiền tố `[QA]`; không in DB password/JWT secret/token. Chưa có đóng phiên nên bàn mở khi QA có thể còn OCCUPIED.
- Kiểm tra cổng 8080/5173 trước khi chạy, không dừng nhầm tiến trình. Không commit/push nếu chủ dự án chưa yêu cầu.
- Script ghi dữ liệu yêu cầu `PHASE1_QA_ALLOW_WRITES=main` cho lần chạy cụ thể, không tự reset. Chạy `node scripts/phase1-demo-readiness.mjs` trước để xem bàn trống và độ tươi đặt bàn. Quyền dùng main/reset xuất phát từ chỉ dẫn của chủ dự án: “cứ làm trên branch main của Neon không cần tạo thêm gì nữa hết. Nếu lỗi cứ reset và init lại data”.

## Prompt
```text
Triển khai Phase 1 theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-1.md.
Trước khi code: liệt kê requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm.
Sau khi code: build cả hai phía, chạy app, kiểm checklist 5–13 và phần Phase 1 của 15–16; test ma trận 6 vai trò, race mở phiên, recipe diff và seed chạy lại. QA trực tiếp trên Neon main theo duyệt 22/10/2026, không tạo branch; được reset/init demo khi lỗi cần đến, ghi vào report. Không tự sang Phase 2, không commit/push.
```
