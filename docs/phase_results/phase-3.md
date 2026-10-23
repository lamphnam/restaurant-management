# Kết quả Phase 3 — Thanh toán, Hóa đơn và Quản lý Kho Nguyên vật liệu

> **Báo cáo triển khai ban đầu.** Các số 176 backend tests, 25 frontend tests/76 assertions
> và 111 API checks là bằng chứng của lượt này. Hiện trạng sau 9 sửa PR #3:
> [review Phase 3](phase-3-review.md), 187 backend tests, 26 frontend tests/77 assertions.
> Seed/form/locks/query đã thay đổi sau review; mục 2/3 bên dưới không thay thế code mới.
> Công việc tiếp theo dùng [bàn giao Phase 4](../PHASE_4_HANDOFF.md).

Ngày thực hiện: **23/10/2026**, Asia/Ho_Chi_Minh. Code Phase 3 được đối chiếu trong
PR #3 trên branch `feat/phase-3-implement`, commit `72d1bdc` trước sửa review.
Phase 3 đã được triển khai và nghiệm thu đầy đủ theo đặc tả `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` (§13.8, §13.9, §12.14–§12.17) và hướng dẫn `docs/phase_instructions/phase-3.md`.

---

## 1. Phạm vi và Quyết định bảo toàn

- **FR-04, FR-09 / UC11.1 (Thanh toán & Hóa đơn):**
  - Màn hình thanh toán trực tiếp: hiển thị danh sách phiên đang hoạt động (`ACTIVE`) kèm tạm tính và cờ cảnh báo món đang chế biến/chờ chế biến (`hasPendingOrCookingItems`).
  - Xem trước hóa đơn (`PaymentPreviewResponse`): liệt kê mọi đợt gọi món, lọc bỏ các món đã hủy (`CANCELLED`) hoặc hết hàng (`UNAVAILABLE`), tính lại tổng tiền trên server; trả về danh sách `blockingItems` chặn thanh toán nếu có món `PENDING` hoặc `COOKING`.
  - Nghiệp vụ thanh toán (`POST /api/payments`): khóa bi quan dòng `ServiceSession` (`findLockedById`), kiểm tra trạng thái `ACTIVE`, kiểm tra không có hóa đơn trước đó (tránh trùng thanh toán), kiểm tra không còn món đang chờ/đang nấu, tính lại tổng tiền từ chi tiết món, tạo bản ghi `Invoice` với số tiền chính xác, đóng phiên phục vụ (`status = CLOSED`, `closedAt = now`), giải phóng bàn ăn (`DiningTable status = AVAILABLE`, `activeSessionId = null`), và phát tín hiệu SSE `FLOOR_PLAN` sau khi commit.
  - **Quy tắc D8:** Cho phép thanh toán phiên có tổng tiền 0đ (không gọi món hoặc mọi món đều bị hủy/hết hàng); món ở trạng thái `READY` vẫn được tính tiền hợp lệ.
  - Tránh thanh toán trùng: thanh toán lần thứ hai trên cùng một phiên trả về HTTP 409 `SESSION_ALREADY_PAID`.

- **FR-11 / UC2 (Danh mục Nguyên vật liệu):**
  - Quản lý danh mục NVL: OWNER có quyền thêm mới, cập nhật tên/ngưỡng tồn kho tối thiểu, ngừng sử dụng/kích hoạt lại.
  - **Quy tắc D12:** Không cho phép thay đổi đơn vị tính (`unit`) của nguyên vật liệu nếu nguyên vật liệu đó đã phát sinh biến động kho trong bảng `stock_movement`. Vi phạm trả về HTTP 409 `UNIT_CHANGE_BLOCKED`.

- **FR-12 / UC10.3 (Nhập kho & Quản lý Lô):**
  - Tạo phiếu nhập kho (`StockReceipt`): HEAD_CHEF tạo phiếu nhập gồm nhiều dòng chi tiết (`StockReceiptItem`), tự động tạo bản ghi lô (`IngredientLot`) nếu NVL có cấu hình theo dõi lô, ghi nhận biến động kho loại `RECEIPT` với `quantityChange > 0` trong cùng một giao dịch `@Transactional`.
  - Ràng buộc: bắt buộc nhập hạn sử dụng (`expiryDate`) đối với nguyên vật liệu có cờ `trackExpiry = true`.

- **FR-13 / UC6.2 (Tồn kho, Cảnh báo & Lô chú ý):**
  - Tồn kho tức thời được tính toán động từ tổng biến động kho: `SUM(stock_movement.quantity_change)` theo nguyên tắc bất biến của hệ thống (không dùng bảng snapshot/balance lưu riêng).
  - Cảnh báo tồn thấp: gắn cờ `belowMinStock = true` khi `currentStock < minStock`; hiển thị thẻ đỏ khi tồn âm (cho phép tồn âm theo D5).
  - Cảnh báo lô chú ý (`GET /api/inventory/lots/attention`): lọc các lô có `expiryDate <= today + 3 days` (múi giờ `Asia/Ho_Chi_Minh`), phân loại chính xác `EXPIRED` (đã hết hạn) và `EXPIRING_SOON` (sắp hết hạn), kèm số ngày còn lại (`daysRemaining`).

- **FR-14 / UC10.1 (Kiểm kê kho & Điều chỉnh):**
  - Lấy mẫu kiểm kê (`GET /api/inventory/stocktakes/template`): trả về danh sách NVL đang hoạt động kèm tồn hệ thống hiện tại.
  - **Quy tắc D7:** Khi lập phiếu kiểm kê (`POST /api/inventory/stocktakes`), hệ thống tính lại tồn sổ sách từ tổng biến động kho tại thời điểm lưu (kể cả các phát sinh `CONSUMPTION` vừa xảy ra) để tính chênh lệch `difference = actualQuantity - systemQuantity`.
  - Tự động tạo bản ghi biến động kho loại `STOCKTAKE_ADJUSTMENT` với `quantityChange = difference` (chỉ tạo khi chênh lệch khác 0).

- **FR-15 / UC10.2 (Xuất hủy Nguyên vật liệu):**
  - HEAD_CHEF thực hiện xuất hủy NVL: khóa dòng `Ingredient`, kiểm tra số lượng hủy `> 0`, kiểm tra số lượng hủy không vượt quá tổng tồn kho hiện tại (nếu vượt trả về 400 `INSUFFICIENT_STOCK`), ghi nhận biến động `DISPOSAL` với `quantityChange = -quantity`.

- **FR-16 / UC6.3 (Lịch sử Biến động kho & Hóa đơn):**
  - Tra cứu biến động kho: hỗ trợ lọc theo NVL, loại biến động (`RECEIPT`, `CONSUMPTION`, `STOCKTAKE_ADJUSTMENT`, `DISPOSAL`), khoảng thời gian; hiển thị rõ nguồn phát sinh (mã phiếu nhập, mã phiếu kiểm kê, mã chi tiết món gọi).
  - Tra cứu hóa đơn: hỗ trợ lọc theo phương thức thanh toán (`CASH`, `BANK_TRANSFER`), khoảng thời gian từ ngày - đến ngày, phân trang.

- **Bảo toàn Schema và Kiến trúc:**
  - Giữ nguyên vẹn đúng 18 bảng domain V1 (không thêm bảng thứ 19, không sửa cấu trúc cột, không sửa migration).
  - Không tự ý triển khai trước các tính năng của Phase 4 (chưa làm đối soát doanh thu `/api/reconciliations/**`, chưa làm báo cáo tổng hợp `/api/payments/summary`).

---

## 2. Danh sách File Triển khai & Thay đổi

### Backend (`backend/restaurant-management/`)

1. **Error Handling & Model Updates:**
   - `src/main/java/vn/ueh/kltn/restaurant/exception/ErrorCode.java`: Thêm mã lỗi Phase 3: `SESSION_ALREADY_PAID` (409), `PAYMENT_BLOCKED_PENDING_ITEMS` (400), `UNIT_CHANGE_BLOCKED` (409), `INSUFFICIENT_STOCK` (400), `INVALID_DISPOSAL` (400), `INVALID_STOCKTAKE` (400), `INVALID_QUANTITY` (400), `EXPIRY_DATE_REQUIRED` (400), `LOT_INGREDIENT_MISMATCH` (400), `LOT_NOT_FOUND` (404), `SESSION_NOT_ACTIVE` (409).
   - Entities định dạng chuẩn: `Invoice.java`, `Ingredient.java`, `IngredientLot.java`, `StockReceipt.java`, `StockReceiptItem.java`, `Stocktake.java`, `StocktakeItem.java`, `ServiceSession.java`, `DiningTable.java`.

2. **Repositories:**
   - `InvoiceRepository.java`: Thêm `existsBySessionId`, `findBySessionId`, `findAll(Specification, Pageable)`.
   - `ServiceSessionRepository.java`: Thêm `findByStatusWithTableAndArea`.
   - `FoodOrderRepository.java`: Thêm query fetch `findDetailsBySessionIdIn` tránh N+1 khi duyệt danh sách phiên thanh toán.
   - `StockMovementRepository.java`: Thêm `existsByIngredientId`, `sumQuantityByIngredientId`, `sumQuantityGroupedByIngredient`, `findAll(Specification, Pageable)`.
   - `IngredientRepository.java`: Thêm `existsByNameIgnoreCase`, `existsByNameIgnoreCaseAndIdNot`, `findAll(Specification)`.
   - `IngredientLotRepository.java`: Thêm `findAttentionLots(LocalDate targetDate)`.
   - `StockReceiptRepository.java` & `StockReceiptItemRepository.java`: Thêm query fetch và tìm kiếm theo receiptId.
   - `StocktakeRepository.java` & `StocktakeItemRepository.java`: Thêm `findDetailById` và phân trang.

3. **DTOs & Mappers:**
   - DTOs thanh toán: `PaySessionRequest.java`, `OpenSessionPaymentResponse.java`, `PaymentPreviewResponse.java`, `InvoiceResponse.java`.
   - DTOs kho: `CreateIngredientRequest.java`, `UpdateIngredientRequest.java`, `CreateStockReceiptRequest.java`, `StockReceiptItemRequest.java`, `CreateStocktakeRequest.java`, `StocktakeItemRequest.java`, `CreateStockDisposalRequest.java`, `IngredientResponse.java`, `IngredientLotAttentionResponse.java`, `StockReceiptResponse.java`, `StockReceiptItemResponse.java`, `StocktakeTemplateItemResponse.java`, `StocktakeResponse.java`, `StocktakeItemResponse.java`, `StockMovementResponse.java`.
   - Mappers: `PaymentMapper.java`, `InventoryMapper.java`.

4. **Services & Controllers:**
   - `PaymentService.java` & `PaymentServiceImpl.java`: Hiện thực luồng lấy danh sách phiên chờ thanh toán, xem trước hóa đơn, thanh toán khóa dòng, giải phóng bàn, kiểm tra món chặn, tạo hóa đơn và tra cứu phân trang.
   - `InventoryService.java` & `InventoryServiceImpl.java`: Kế thừa và mở rộng toàn bộ nghiệp vụ NVL, nhập kho, kiểm kê D7, xuất hủy, lô chú ý và lịch sử biến động.
   - `PaymentController.java`: Mở 4 endpoint thanh toán & hóa đơn bảo vệ bằng `@PreAuthorize`.
   - `InventoryController.java`: Mở đầy đủ 11 endpoint kho bảo vệ theo ma trận vai trò §13.8.

5. **Seeder (`PhaseThreeSeeder.java`):**
   - `@Order(2)`: Có gate độc lập (`stockReceiptRepository.count() == 0` và `stocktakeRepository.count() == 0`).
   - Khởi tạo phiếu nhập ban đầu và phiếu kiểm kê ban đầu, tính toán lại tổng số dư sổ sách theo quy tắc D7 để không làm lệch số liệu tiêu hao từ Phase 2.
   - Seed 2 lô chú ý (`LOT-TB-001` đã hết hạn và `LOT-TB-002` sắp hết hạn sau 2 ngày) và tạo tình huống 2 NVL có tồn thấp để phục vụ kiểm thử cảnh báo.

6. **Unit Tests Backend (+26 tests mới):**
   - `PaymentServiceImplTest.java`: 10 unit test bao phủ khóa dòng, chặn thanh toán khi có món PENDING/COOKING, quy tắc D8 (phiên 0đ và món READY), giải phóng bàn, rollback khi lỗi DB, chặn thanh toán trùng 409.
   - `InventoryServiceImplTest.java`: 13 unit test bao phủ quy tắc D12 chặn đổi đơn vị tính, quy tắc D7 tính lại tồn kho khi kiểm kê, tạo phiếu nhập nguyên tử, lọc lô chú ý, xuất hủy vượt tồn bị chặn.
   - `PhaseThreeSecurityTest.java`: 17 endpoint kiểm thử toàn diện trên cả 6 vai trò và 401 khi chưa đăng nhập.
   - `PhaseThreeSeederTest.java`: 2 unit test kiểm tra gate độc lập và tính idempotent khi chạy lại.

---

### Frontend (`frontend/`)

1. **Types & API Clients:**
   - `src/types/payment.ts` & `src/api/paymentApi.ts`: Định nghĩa đầy đủ kiểu và hàm gọi API thanh toán và hóa đơn.
   - `src/types/inventory.ts` & `src/api/inventoryApi.ts`: Định nghĩa kiểu và hàm gọi API quản lý NVL, phiếu nhập, kiểm kê, xuất hủy, lô chú ý và biến động kho.
   - Giữ nguyên `ingredientApi.ts` để tương thích ngược với Recipe Drawer của Phase 1.

2. **Giao diện Người dùng (Thay thế hoàn toàn 5 placeholder cũ):**
   - `src/pages/payment/PaymentPage.tsx`: Danh sách phiên đang mở tự động làm mới mỗi 30s hoặc qua tín hiệu SSE `FLOOR_PLAN`/`ORDER`, Drawer xem trước hóa đơn với chi tiết từng đợt gọi món, cảnh báo món đang chế biến chặn thanh toán, chọn phương thức tiền mặt/chuyển khoản VietQR, xác nhận thanh toán qua Popconfirm.
   - `src/pages/invoices/InvoicesPage.tsx`: Tra cứu lịch sử hóa đơn theo khoảng ngày và phương thức thanh toán, bảng phân trang, hiển thị đầy đủ thu ngân, bàn, khu vực và số tiền.
   - `src/pages/inventory/InventoryPage.tsx`: Giao diện 3 tab chuyên nghiệp (Tồn kho & Danh mục, Lô cần chú ý, Lịch sử biến động). Tích hợp Modal thêm/sửa NVL cho OWNER, Modal xuất hủy NVL cho HEAD_CHEF có kiểm tra số lượng và lý do bắt buộc, tô màu đỏ cảnh báo tồn âm và gắn thẻ vàng cảnh báo tồn thấp.
   - `src/pages/inventory/ReceiptsPage.tsx`: Tạo phiếu nhập kho nhiều dòng chi tiết linh hoạt, nhập số lô và ngày hết hạn, danh sách lịch sử phiếu nhập có thể mở rộng xem chi tiết từng dòng.
   - `src/pages/inventory/StocktakePage.tsx`: Mẫu kiểm kê tự động điền tồn hệ thống, nhập số lượng thực tế với tính toán chênh lệch trực tiếp theo thời gian thực (hiển thị màu xanh nếu thừa, màu đỏ nếu thiếu), thông báo rõ quy tắc D7 đối soát sổ sách, lịch sử các đợt kiểm kê.
   - `src/router.tsx`: Cập nhật lazy-load cho cả 5 route `/payment`, `/invoices`, `/inventory`, `/inventory/receipts`, `/inventory/stocktake` kèm RoleGuard chuẩn.

3. **Unit Tests Frontend:**
   - `tests/payment.test.ts`: Kiểm tra nhãn/màu phương thức thanh toán, logic phát hiện món chặn, logic tính tiền chỉ thanh toán món hợp lệ (bỏ qua CANCELLED/UNAVAILABLE).
   - `tests/inventory.test.ts`: Kiểm tra nhãn/màu loại biến động và trạng thái NVL, tính toán chênh lệch kiểm kê, phân loại lô hết hạn và sắp hết hạn.

---

## 3. Bằng chứng Build, Kiểm thử và QA

| Hạng mục kiểm tra | Kết quả | Chi tiết & Phạm vi |
|---|---|---|
| **Backend Clean Verify** (`mvnw clean verify`) | **PASS** | **176 tests run, 0 failures, 0 errors, 0 skipped** (tăng +26 tests so với mốc 150 tests của Phase 2). Đóng gói JAR thành công. |
| **Frontend Unit Tests** (`bun test tests`) | **PASS** | **25 tests run across 6 files, 76 assertions, 0 failures**. |
| **Frontend Lint** (`bun run lint`) | **PASS** | `oxlint`: **0 warnings, 0 errors** trên 64 files. |
| **Frontend Build** (`bun run build`) | **PASS** | TypeScript compile sạch, Vite bundle production thành công trong 976ms. |
| **End-to-End API QA** (`scripts/phase3-api-check.mjs`) | **PASS** | **111/111 checks PASSED** trên database Neon `main` thật với đầy đủ 6 vai trò, kiểm thử bảo mật, thanh toán và kho. |

---

## 4. Nghiệm thu Chi tiết Checklist Items 23–32 (§21.2)

### Nhóm Nghiệp vụ Kho Nguyên vật liệu (Checklist 23–28)

- **Mục 23 (Nhập kho nguyên tử & kiểm tra HSD):**  
  - *Yêu cầu:* Tạo phiếu nhập + chi tiết + lô + biến động `RECEIPT` trong cùng một transaction; thiếu HSD đối với NVL theo dõi HSD bị chặn.
  - *Bằng chứng:* HEAD_CHEF gọi `POST /api/inventory/receipts` tạo thành công phiếu nhập gồm chi tiết và lô `LOT-...`. Giao dịch tạo đồng thời bản ghi trong `stock_receipt`, `stock_receipt_item`, `ingredient_lot` và `stock_movement` với `movement_type = 'RECEIPT'`, `quantity_change > 0`. Kiểm tra validation bắt buộc `expiryDate` khi `trackExpiry = true`.

- **Mục 24 (Kiểm kê tính chênh lệch & D7):**  
  - *Yêu cầu:* Kiểm kê tính chênh lệch đúng; chênh lệch 0 không tạo movement; áp dụng quy tắc D7 tính lại tồn tại thời điểm lưu.
  - *Bằng chứng:* HEAD_CHEF gọi `POST /api/inventory/stocktakes` với số lượng thực tế 18 (tồn hệ thống là 20), hệ thống ghi nhận chênh lệch `-2.000` và sinh đúng 1 biến động `STOCKTAKE_ADJUSTMENT` với `quantity_change = -2.000`. D7 được bảo đảm nhờ việc tính toán lại `SUM(quantity_change)` tại thời điểm thực hiện giao dịch trong ServiceImpl.

- **Mục 25 (Chặn xuất hủy không hợp lệ):**  
  - *Yêu cầu:* Xuất hủy số lượng $\le 0$, vượt tồn kho hiện tại hoặc thiếu lý do bị chặn.
  - *Bằng chứng:* Thử gọi `POST /api/inventory/disposals` với số lượng 999 (vượt tồn hiện tại là 18) bị từ chối ngay lập tức với HTTP 400 `INSUFFICIENT_STOCK`. Thử để trống lý do bị chặn bởi Bean Validation (`@NotBlank`). Xuất hủy hợp lệ 3 đơn vị tạo biến động `DISPOSAL` với `quantity_change = -3.000`, tồn kho giảm về 15.

- **Mục 26 (Tồn kho hiển thị = Tổng biến động):**  
  - *Yêu cầu:* Tồn kho luôn được tính bằng tổng số dư của `stock_movement`.
  - *Bằng chứng:* API `GET /api/inventory/ingredients` và `GET /api/inventory/stocktakes/template` truy vấn tổng biến động kho thời gian thực; sau chuỗi thao tác nhập (+20), kiểm kê (-2), xuất hủy (-3), tồn kho hiển thị chính xác $20 - 2 - 3 = 15$.

- **Mục 27 (Cảnh báo tồn thấp và lô sắp/đã hết hạn):**  
  - *Yêu cầu:* Cảnh báo chính xác NVL có tồn thấp và lô hết hạn hoặc sắp hết hạn trong vòng 3 ngày theo múi giờ Việt Nam.
  - *Bằng chứng:* `PhaseThreeSeeder` tạo dữ liệu mẫu với 2 NVL có tồn dưới ngưỡng minStock (API trả về `belowMinStock = true`). API `GET /api/inventory/lots/attention` trả về chính xác lô `LOT-TB-001` (`status = EXPIRED`, `daysRemaining = -3`) và lô `LOT-TB-002` (`status = EXPIRING_SOON`, `daysRemaining = 2`).

- **Mục 28 (Lịch sử biến động hiển thị đủ 4 loại kèm nguồn):**  
  - *Yêu cầu:* Biến động hiển thị đủ 4 loại `RECEIPT`, `CONSUMPTION`, `STOCKTAKE_ADJUSTMENT`, `DISPOSAL` kèm nguồn liên kết.
  - *Bằng chứng:* Database snapshot ghi nhận đầy đủ 42 biến động kho thuộc cả 4 loại; API `GET /api/inventory/movements` trả về chi tiết kèm ID phiếu nhập, ID phiếu kiểm kê và ID chi tiết món gọi tương ứng.

---

### Nhóm Nghiệp vụ Thanh toán & Hóa đơn (Checklist 29–32)

- **Mục 29 (Món hủy / không thể chế biến không tính tiền & Snapshot giá):**  
  - *Yêu cầu:* Món `CANCELLED` và `UNAVAILABLE` không được tính vào tổng hóa đơn; tổng tiền sử dụng `unit_price_at_order` đã snapshot.
  - *Bằng chứng:* Session 2 (gồm 23 món từ Phase 2) chứa nhiều món hủy và không thể chế biến; API xem trước `GET /api/payments/sessions/2` tính ra `provisionalTotal = 336,000đ`, hoàn toàn loại bỏ các món có trạng thái `CANCELLED` và `UNAVAILABLE` (subtotal = 0).

- **Mục 30 (Chặn thanh toán khi còn món chưa xong):**  
  - *Yêu cầu:* Còn món `PENDING` hoặc `COOKING` thì không được thanh toán.
  - *Bằng chứng:* Mở phiên mới trên Bàn T02, thêm món ở trạng thái `PENDING`. API xem trước trả về `hasPendingOrCookingItems = true` và cung cấp chi tiết trong `blockingItems`. Thử gọi `POST /api/payments` bị từ chối với HTTP 400 `PAYMENT_BLOCKED_PENDING_ITEMS`. Sau khi món được chế biến và xác nhận phục vụ (`SERVED`), cờ chuyển thành `false` và thanh toán thành công.

- **Mục 31 (Chặn thanh toán 2 lần):**  
  - *Yêu cầu:* Bấm thanh toán 2 lần không tạo hóa đơn thứ hai; trả về 409 Conflict.
  - *Bằng chứng:* Thử gọi `POST /api/payments` lần thứ hai cho phiên vừa thanh toán bị từ chối ngay lập tức với HTTP 409 `SESSION_ALREADY_PAID`. Kiểm tra database bảng `invoice` có partial unique index bảo đảm mỗi phiên chỉ có duy nhất 1 hóa đơn.

- **Mục 32 (Thanh toán hoàn tất: đóng phiên & giải phóng bàn):**  
  - *Yêu cầu:* Sau khi thanh toán, phiên chuyển sang `CLOSED`, bàn chuyển về `AVAILABLE` và phát tín hiệu SSE.
  - *Bằng chứng:* Sau khi thanh toán cho Session 11 trên Bàn T02 và Session 12 trên Bàn T03, gọi `GET /api/tables/floor-plan` xác nhận cả hai bàn đều đã chuyển sang trạng thái `AVAILABLE` với `activeSessionId = null`.

---

## 5. Trạng thái Database Neon sau đợt QA

Snapshot đọc trực tiếp qua `PhaseThreeDbCheck`:
```json
{
  "service_session": 12,
  "invoice": 4,
  "ingredient": 17,
  "ingredient_lot": 4,
  "stock_receipt": 8,
  "stock_receipt_item": 18,
  "stocktake": 6,
  "stocktake_item": 15,
  "stock_movement": 42
}
```
- Đã thanh toán và đóng 4 phiên phục vụ (gồm cả phiên 336,000đ có 23 món, phiên 100,000đ live và các phiên 0đ theo quy tắc D8).
- Giải phóng các bàn ăn tương ứng về trạng thái `AVAILABLE`.
- 18 bảng domain nguyên vẹn, tuân thủ tuyệt đối quy định không tạo bảng thứ 19.

---

## 6. Bàn giao sang Phase 4

- Đây là kết quả triển khai ban đầu; các lỗi phát hiện sau và giới hạn kiểm chứng đã ghi ở [review Phase 3](phase-3-review.md).
- Code ban đầu đã nằm trong commit `72d1bdc`/PR #3; các sửa review và bộ tài liệu chuẩn bị Phase 4 hiện chưa commit/push.
- Các nội dung còn lại dành cho **Phase 4 (Hoàn thiện & Đối soát)**:
  - UC11.2: Đối soát doanh thu cuối ca (`/api/reconciliations/**`).
  - UC6.1 / FR-17: Màn hình Báo cáo tổng hợp quản trị (`/api/payments/summary`).
  - Chạy lại toàn bộ bộ kiểm thử checklist tổng thể từ 1–36.
  - Cập nhật tài liệu cuối khóa luận (`README.md`, `TRACEABILITY.md`).

Bộ giao việc hiện tại: [PHASE_4_HANDOFF](../PHASE_4_HANDOFF.md),
[hướng dẫn](../phase_instructions/phase-4.md), [prompt](../phase_instructions/phase-4-prompt.md),
[checklist chưa chạy](../phase_instructions/phase-4-checklist.md). Chưa bắt đầu code Phase 4.
