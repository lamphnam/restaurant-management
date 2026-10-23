# Phase 3 — Thanh toán + Kho (kế hoạch 25/10)

> **Nguồn yêu cầu lịch sử.** Phase 3 và 9 sửa review PR #3 đã triển khai.
> Xem [review hiện tại](../phase_results/phase-3-review.md) và
> [bàn giao Phase 4](../PHASE_4_HANDOFF.md). Các dòng “chưa triển khai” bên dưới là mốc chuẩn bị cũ.
> Mục tương thích IngredientService đã được thay bằng InventoryService sau review; không khôi phục bean cũ.

**Trạng thái 23/10/2026:** mới chuẩn bị tài liệu theo yêu cầu chủ dự án, chưa triển khai.
Ngày trong tiêu đề là lịch dự kiến. Chỉ bắt đầu code khi chủ dự án yêu cầu riêng.

**Đọc trước:** [CLAUDE.md](../../CLAUDE.md), [bàn giao Phase 3](../PHASE_3_HANDOFF.md),
[review Phase 2](../phase_results/phase-2-review.md), [popup](../phase_results/phase-2-popup-fix.md),
[TRACEABILITY](../TRACEABILITY.md), master đầy đủ và các mục liên quan:
§1, §4–9, §10.1/10.2 (D5–D8, D10–D12), §11, §12.3/12.12–12.17,
§13.1/13.8/13.9 phần thanh toán, §14–18, §20–21, Phụ lục A.

**Requirement/UC:** FR-04 phần đóng phiên, FR-09/UC11.1; FR-11/UC2,
FR-12/UC10.3, FR-13/UC6.2, FR-14/UC10.1, FR-15/UC10.2,
FR-16 phần lịch sử hóa đơn và UC6.3. BR-02/05/06/07/09/11; TR-11/NFR-02/03/04/06/08.
**Checklist:** 23–32; kiểm phần Phase 3 của 35–36 và hồi quy Phase 1–2 liên quan.

## 1. Ranh giới và file dự kiến

- Không làm đối soát UC11.2, `/reconciliations/**`, `/payments/summary`, `/reports`
  hoặc FR-17 (Phase 4). Không thêm lịch sử tổng hợp, FEFO, tồn/kiểm kê theo lô,
  stock_balance/revenue/disposal_receipt, cổng thanh toán hay hóa đơn điện tử.
- Giữ V1/18 bảng/cột/quan hệ/role/trạng thái, D10, recipe diff/lock/inactive,
  cap order 99/50, Session → OrderItem, SSE async sau commit và reduced-motion fix.
- Backend: thêm PaymentController/PaymentService/Impl; mở rộng InventoryController hiện có,
  thêm InventoryService/Impl, DTO/mapper/query. Giữ tương thích IngredientService lookup,
  không tạo controller hoặc nguồn tính tồn trùng lặp.
- Rà/mở rộng entity/repository Invoice, ServiceSession, DiningTable, FoodOrder, OrderItem,
  Ingredient, IngredientLot, StockMovement, StockReceipt*, Stocktake*; Account phục vụ audit,
  RecipeItem/MenuItem cho hồi quy tiêu hao/snapshot. Không thêm bảng.
- Frontend: api/types/pages payment, invoices, inventory/receipts/stocktake; router lazy-load,
  giữ role guards. Thêm seeder kho có gate riêng, unit/MockMvc và QA script có guard.
  Tên DTO/helper là lựa chọn hiện thực, không bổ sung endpoint ngoài bảng dưới.

## 2. API và quyền

Theo §13.8–13.9; trả DTO/lỗi/page theo §13.1. Người thao tác từ JWT, thời điểm từ Clock,
tiền/số lượng BigDecimal. Không nhận total/systemQuantity/actor từ client.

| Method | API | Vai trò | Input/filter chính |
|---|---|---|---|
| GET | `/api/payments/open-sessions` | CASHIER | ACTIVE + tạm tính + cờ còn món chưa xong |
| GET | `/api/payments/sessions/{id}` | CASHIER | Preview các đợt/món tính tiền và món chặn |
| POST | `/api/payments` | CASHIER | `{sessionId, paymentMethod}` → Invoice DTO |
| GET | `/api/invoices` | CASHIER, MANAGER, OWNER | `from&to&paymentMethod&page&size` |
| GET | `/api/inventory/ingredients` | OWNER, HEAD_CHEF | `q&status&belowMinStockOnly`, currentStock/belowMinStock |
| POST | `/api/inventory/ingredients` | OWNER | name/unit/minStock/trackLot/trackExpiry |
| PUT | `/api/inventory/ingredients/{id}` | OWNER | Sửa danh mục, D12 |
| PATCH | `/api/inventory/ingredients/{id}/deactivate` | OWNER | Ngừng sử dụng, cùng đích no-op |
| PATCH | `/api/inventory/ingredients/{id}/activate` | OWNER | Kích hoạt, cùng đích no-op |
| GET | `/api/inventory/lots/attention` | OWNER, HEAD_CHEF | `days` tùy chọn, mặc định app.alert.expiry-days |
| POST | `/api/inventory/receipts` | HEAD_CHEF | `{items:[{ingredientId,quantity,lotNumber?,expiryDate?}]}` |
| GET | `/api/inventory/stocktakes/template` | HEAD_CHEF | NVL ACTIVE + tồn hiện tại |
| POST | `/api/inventory/stocktakes` | HEAD_CHEF | `{items:[{ingredientId,actualQuantity,note?}]}` |
| POST | `/api/inventory/disposals` | HEAD_CHEF | `{ingredientId,lotId?,quantity,reason}` |
| GET | `/api/inventory/movements` | OWNER, HEAD_CHEF | `ingredientId&movementType&from&to&page&size` |

Không tự mở quyền thanh toán cho OWNER/MANAGER hoặc kho cho KITCHEN_STAFF/WAITER.
Giữ GET ingredients có id/name/unit/status để RecipeDrawer dùng như cũ.
Không serialize entity/Page của Spring.

## 3. Backend thanh toán — UC11.1

1. Open-sessions trả ACTIVE, bàn/giờ mở/tạm tính/cờ PENDING hoặc COOKING, tránh N+1.
   Preview đủ các đợt, dùng snapshot, bỏ CANCELLED/UNAVAILABLE và liệt kê món chặn.
2. POST `[TX]`: khóa ServiceSession bằng findLockedById **trước khi load items/tính tiền**.
   Kiểm ACTIVE/chưa Invoice; đã thanh toán trả 409 “Phiên đã được thanh toán”.
   Không áp dụng no-op 200 của PATCH cho POST này.
3. Kiểm lại PENDING/COOKING trong khóa → chặn. READY chưa SERVED vẫn tính/chấp nhận,
   không tự chuyển READY thành SERVED; tổng 0đ vẫn được thanh toán (D8).
4. Tính lại Σ quantity × unitPriceAtOrder, tạo Invoice CASH/BANK_TRANSFER đúng cashier/paidAt;
   close(Instant), DiningTable.release trong cùng TX. Lỗi rollback cả Invoice/phiên/bàn.
5. Publish FLOOR_PLAN với sessionId trong TX, listener AFTER_COMMIT dispatch;
   POST trùng/rollback không event. Không emitter.send trên HTTP thread.
6. GET invoices lọc/phân trang; trả thời gian/thu ngân/phương thức/amount và bàn/phiên
   đủ tra cứu. Không thêm API detail/PDF/summary hoặc bảng dòng hóa đơn ngoài spec.

Payment dùng cùng khóa phiên với order/cancel/serve/start/unavailable/complete.
Nếu cần khóa item thì Session trước OrderItem, không đảo hoặc load entity cũ trước khóa.
Rà trả bàn với open session hiện có, không đổi luật mở phiên/đặt bàn.
Test guard/no-op/timestamp close/release, kể cả release bàn INACTIVE.

## 4. Backend kho

- **Danh mục:** tên/unit bắt buộc, minStock ≥ 0, trackLot/trackExpiry; OWNER thêm/sửa/
  ngừng/kích hoạt, không delete. D12 kiểm movement trước đổi unit. GET tên/status/tồn thấp,
  SUM theo nhóm NVL, mặc định 0, không gọi SUM từng dòng. Below min dùng `< minStock`;
  tồn âm vẫn hiển thị.
- **Nhập `[TX]`:** NVL ACTIVE/quantity > 0; trackExpiry bắt buộc expiryDate.
  TrackLot hoặc trackExpiry → lô mới, lotNumber được null; receipt/item/RECEIPT dương
  có receiptItemId/lotId/người/thời điểm. Một dòng lỗi rollback cả phiếu/lô/movement.
- **Kiểm kê `[TX]`:** template ACTIVE; POST actualQuantity ≥ 0/note ≤ 500;
  tính lại tồn lúc xác nhận (D7), Stocktake/Item có lotId NULL; difference khác 0
  mới có STOCKTAKE_ADJUSTMENT, = 0 vẫn item. Không nhận systemQuantity client.
- **Loại bỏ `[TX]`:** khóa Ingredient rồi SUM; quantity > 0 và ≤ tồn tổng, reason
  bắt buộc tối đa 500; lot nếu có thuộc NVL. DISPOSAL âm/audit đúng, không phiếu riêng.
  Lot chỉ ghi nguồn, không kiểm “tồn lô”. Hai disposal song song không cùng tiêu hết
  một phần tồn; không đổi D5 để chặn bếp khi âm.
- **Lô chú ý:** expiryDate ≤ today + days, today từ app.timezone, default days từ config.
  Dùng helper entity phân loại, kiểm hôm nay/today + days; lượng nhập ban đầu, không tồn lô.
- **Biến động:** đủ bốn loại/filter/page, dấu/NVL/đơn vị/lô/actor/time/reason.
  RECEIPT → mã phiếu, CONSUMPTION → bàn/món/phiên, ADJUSTMENT → mã kiểm kê,
  DISPOSAL → lý do/nguồn trực tiếp.
- Giữ precision/scale/constraint V1; không làm tròn âm thầm hoặc để overflow thành lỗi
  “trùng dữ liệu”. Nêu rõ nếu cần quyết định ngưỡng nghiệp vụ mới.

## 5. Frontend và real-time

- `/payment`: list → preview → phương thức → Popconfirm đã nhận tiền; loading/disable,
  hiện món chặn/0đ. 409 dữ liệu cũ/đã trả tiền → phản hồi/refetch. Thành công list bỏ phiên,
  floor-plan Trống, history có Invoice. CASHIER dùng màn riêng, không gửi amount.
  Query list/preview dùng prefix `['payment']`.
- `/invoices`: lọc từ/đến/phương thức/page, CASHIER/MANAGER/OWNER. Payment thành công
  invalidate invoices/key liên quan; lỗi qua useApiFeedback/fieldErrors.
- `/inventory`: tab Tồn kho / Lô cần chú ý / Biến động; OWNER nút danh mục,
  HEAD_CHEF nút Loại bỏ + Popconfirm; tag tồn thấp/đỏ tồn âm. `/inventory/receipts`
  form nhiều dòng; `/inventory/stocktake` tồn/thực tế/chênh lệch tạm, server vẫn tính lại.
  Lot optional không đòi thêm tồn lô/API ngoài spec.
- Giữ Ant Design/api/types/pages, MoneyText, labels/StatusTag, giờ Việt Nam, feedback,
  401/403/retry policy. Không thêm UI library/state framework.
- useRealtime gắn một lần; FLOOR_PLAN/ORDER đã invalidate payment, reconnect refetch.
  Payment dùng liveQueryOptions polling 30s/focus; kho không cần SSE/event mới.
- Popup mới kiểm click-only, chuột/keyboard, ngoài/Escape, lớp trên Modal/Drawer,
  normal/reduced motion/tablet; giữ transition:none.

## 6. Seed và QA an toàn

- Seeder riêng theo @Order sau PhaseOneSeeder, app.seed/gate giao dịch từng khối;
  không bị account đã có chặn. Nhập/kiểm kê qua ServiceImpl/audit hợp lệ;
  khối có một phần thì bỏ qua/báo, không tự xóa/điền đè hoặc làm mới ngày.
- Mục tiêu §20: kiểm kê khởi tạo, receipt có lô hết hạn/còn 2 ngày, 2 NVL tồn thấp.
  Main đã có CONSUMPTION → SUM thực/D7; system=0 chỉ khi chưa movement.
  Không UPDATE/DELETE ledger để khớp seed; báo khối đã thực hiện/bỏ qua và tác động.
- QA Neon main theo quyền cũ; kiểm đúng process/cổng 8080/5173, readiness chỉ đọc.
  Snapshot cũ 10 ACTIVE/2 trống không thay kiểm tra live.
- Dùng phiên `[QA]` phù hợp sau xác minh/id từ API; payment thật sẽ đóng phiên/ghi Invoice,
  không trả tiền hàng loạt phiên khác để dọn bàn. Script ghi có guard tương đương
  PHASE1_QA_ALLOW_WRITES=main; không tự reset/in secret/token.

## 7. Kiểm thử và điều kiện xong

| Checklist §21.2 | Bằng chứng phải có khi triển khai |
|---|---|
| 23 | Receipt/lô/items/movement atomic; thiếu expiry bị chặn; rollback đủ bộ |
| 24 | D7 dùng tồn mới tại POST, difference ± đúng; zero item/không movement |
| 25 | Disposal ≤ 0/vượt tồn/thiếu reason/sai lô bị chặn; hai request song song |
| 26 | API/UI bằng SUM ledger trên 1–2 NVL, kể cả 0/âm |
| 27 | Below min/âm/expired/today/today+days/ngoài biên, ngày Việt Nam |
| 28 | Đủ bốn loại/nguồn/audit/filter/page |
| 29 | Nhiều đợt, snapshot sau đổi giá, bỏ CANCELLED/UNAVAILABLE, READY tính, 0đ |
| 30 | PENDING/COOKING chặn; preview cũ không vượt qua POST |
| 31 | Hai payment đồng thời: một thành công/một 409/một Invoice; lần sau 409 |
| 32 | Invoice + CLOSED/closedAt + AVAILABLE atomic, reload còn đúng |
| 35–36 phần Phase 3 | CASHIER/WAITER thấy trả bàn không F5; reconnect/logout/polling 30s; reload/tablet/popup |

Giữ unit/MockMvc baseline không DB; thêm ma trận sáu role/401/annotation coverage, D12,
aggregate/số học kiểm kê/disposal, guard entity, payment/race/event/rollback.
Kiểm payment cạnh tranh order/cancel/complete/serve trên app/Neon thật khi khả thi:
không Invoice lệch items/movement sau CLOSED. Cancel PENDING trước → payment tính lại;
payment đọc PENDING trước → bị chặn, không Invoice tính cả món vừa hủy.
READY có thể được trả tiền trước serve theo D8.

Hai restart không nhân seed; hồi quy recipe inactive/lookup và complete song song.
Phân biệt mock với app/API/Neon thật, không cộng các đợt QA.

Backend `.\mvnw.cmd clean verify` tại `backend/restaurant-management`, nêu số test;
frontend `bun run test`, `bun run build`, `bun run lint`. Khi xong mới tạo
`docs/phase_results/phase-3.md`: file đổi/checklist/tác động DB/seed/reset/khác biệt spec/chưa kiểm.
Cập nhật TRACEABILITY/CLAUDE/AGENTS/README theo thực tế, FR-10/17 vẫn Phase 4.
Không commit/push hoặc tự sang Phase 4.

Prompt để giao khi chủ dự án yêu cầu: [phase-3-prompt.md](phase-3-prompt.md).
