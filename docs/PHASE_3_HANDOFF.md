# Bàn giao từ Phase 2 sang Phase 3

Ngày chốt: 23/10/2026, Asia/Ho_Chi_Minh. Chủ dự án đã test tay lại popup, xác nhận
thấy ổn và yêu cầu chuẩn bị tài liệu. **Phase 3 chưa triển khai.** Tài liệu không
phải lệnh bắt đầu code. Không commit/push cho tới khi chủ dự án yêu cầu.

Branch lúc bàn giao: `feat/phase-2-implement`, HEAD `cadcfab`; các sửa review Critical,
popup và tài liệu còn chưa commit. Đọc `git status` lại, giữ mọi thay đổi hiện có;
không reset/stash/ghi đè. Không tự sang Phase 4 sau khi triển khai Phase 3.

## 1. Nguồn và thứ tự đọc

1. [CLAUDE.md](../CLAUDE.md), [master Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md).
2. [Kết quả Phase 2](phase_results/phase-2.md), [ba sửa Critical](phase_results/phase-2-review.md),
   [sửa popup](phase_results/phase-2-popup-fix.md), [TRACEABILITY](TRACEABILITY.md).
3. [Hướng dẫn Phase 3](phase_instructions/phase-3.md), [prompt triển khai](phase_instructions/phase-3-prompt.md).
4. Code/test hiện tại. Master liên quan: §1, §4–9, §10.1/10.2 (D5–D8, D10–D12),
   §11, §12.3/12.12–12.17, §13.1/13.8/13.9 phần thanh toán, §14–18, §20–22, Phụ lục A.

Xử lý mâu thuẫn theo §0.1. Không thêm bảng/cột/migration, role, trạng thái hoặc chức năng
đã cắt; nếu thật sự cần thay đổi thì nêu và hỏi trước phần phụ thuộc, tiếp tục phần độc lập.

## 2. Hiện trạng và phần sắp làm

| Nhóm | Đã có trong code | Phase 3 |
|---|---|---|
| Bán hàng | Mở/chi tiết phiên, gọi/gọi thêm, hủy, start/unavailable/complete/serve | Thanh toán, đóng phiên/trả bàn, lịch sử hóa đơn |
| Khóa món | Scalar sessionId → khóa Session → OrderItem → require ACTIVE trước cả no-op | Payment khóa cùng ServiceSession trước load items/tính tổng |
| Giá | Snapshot OrderItem.unitPriceAtOrder; FoodOrder.calculateTotal loại CANCELLED/UNAVAILABLE | Tính lại server khi thanh toán; Invoice.amount là doanh thu |
| Kho | Lookup Ingredient cho recipe; CONSUMPTION thật khi complete, có thể tồn âm | Danh mục, nhập, tồn/cảnh báo, kiểm kê, loại bỏ, biến động |
| Dữ liệu | V1/18 bảng; entity/repository kho và Invoice có sẵn | Bổ sung workflow/query/DTO, không suy hoàn thành từ entity |
| SSE | AFTER_COMMIT → executor riêng; heartbeat/reconnect/polling; prefix payment đã giữ | Publish FLOOR_PLAN khi thanh toán, nối query payment vào invalidation |
| UI | 7 màn Phase 1–2 đã triển khai | Thay placeholder /payment, /invoices, /inventory, /inventory/receipts, /inventory/stocktake |
| Phase 4 | /reconciliation, /reports còn placeholder | Vẫn để ngoài Phase 3; không làm đối soát/summary/báo cáo |

## 3. Điểm bắt đầu trong code

Đường dẫn Java dưới đây tương đối với
`backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/`.

| File/nhóm | Điều cần giữ hoặc bổ sung |
|---|---|
| `controller/InventoryController.java`, `service/IngredientService.java`, `service/impl/IngredientServiceImpl.java`, `mapper/IngredientMapper.java`, `dto/response/IngredientOptionResponse.java` | Lookup Phase 1; mở rộng controller hiện có, bổ sung InventoryService/Impl cho workflow; giữ field id/name/unit/status và status=ACTIVE cho RecipeDrawer |
| `repository/ServiceSessionRepository.java`, `repository/FoodOrderRepository.java` | Đã có findLockedById và findDetailsBySessionId fetch orders/items/menu; ServiceSession không có collection orders |
| `service/impl/ServiceSessionServiceImpl.java`, `service/impl/KitchenServiceImpl.java` | Session → OrderItem và ACTIVE bắt buộc cho ghi món; Payment không load item cũ vào persistence context trước khóa |
| `entity/ServiceSession.java`, `entity/DiningTable.java` | Đã có close(Instant), release(); rà guard/no-op/timestamp trước nối payment; no-op entity không biến POST payment trùng thành 200 |
| `entity/Invoice.java`, `repository/InvoiceRepository.java` | Entity có amount/paymentMethod/cashier/paidAt; repository chỉ JpaRepository, chưa có PaymentService/Controller |
| `entity/Ingredient.java`, `repository/IngredientRepository.java` | updateInfo chưa kiểm D12; service kiểm movement trước đổi unit; đã có findLockedById |
| `entity/StockReceipt*.java`, `entity/Stocktake*.java`, `entity/IngredientLot.java`, `entity/StockMovement.java` và repositories | Có addItem/attachTo, calculateDifference, isExpired/isExpiringSoon; cần TX, query aggregate/nguồn, DTO; không trả entity |
| `repository/StockMovementRepository.java` | Hiện chỉ JpaRepository, chưa có SUM/currentStock hoặc lịch sử kho |
| `seed/DataSeeder.java`, `seed/PhaseOneSeeder.java` | @Order(0)/(1), gate độc lập; chưa có seeder kho |
| `config/AppProperties.java`, `config/JwtConfig.java` | Dùng Clock bean hiện có, app.timezone và app.alert.expiry-days |
| `realtime/RealtimeEventListener.java`, `realtime/SseHub.java`, `config/RealtimeConfig.java` | Async send 4 worker/queue 256, không CallerRuns; giữ cô lập lỗi sau commit |

Frontend: đọc `router.tsx` (map businessPages/lazy-load), `auth/roles.ts`, `api/client.ts`,
`api/queryClient.ts`, `hooks/useApiFeedback.ts`, `utils/time.ts`, `utils/labels.ts`,
`components/MoneyText.tsx`, `realtime/invalidation.ts`, `realtime/useRealtime.ts`.
Không làm lại auth/SSE hoặc mở route `/sessions/:id` cho CASHIER: thu ngân có màn riêng.

## 4. Quyết định cần bảo toàn

- **Thanh toán:** chỉ CASHIER; nhận sessionId/paymentMethod, không nhận total/actor/time.
  Khóa ServiceSession trước đọc items; require ACTIVE/chưa Invoice, không PENDING/COOKING.
  Dùng unitPriceAtOrder, bỏ CANCELLED/UNAVAILABLE. READY chưa SERVED vẫn tính; không ép serve.
  Tổng 0đ vẫn tạo Invoice/đóng phiên. Invoice + close + release trong một TX.
  POST lặp/song song: một Invoice, request thua 409 “Phiên đã được thanh toán”.
- **Race với món:** sau payment commit mọi PATCH món, kể cả cùng đích, trả 409;
  không sửa item/CONSUMPTION của phiên CLOSED. Order cũng khóa cùng phiên.
- **Ledger:** tồn = COALESCE(SUM(quantity_change),0), đủ bốn loại đúng dấu/nguồn/audit;
  không sửa/xóa movement, không thêm stock_balance/OPENING_BALANCE. Complete vẫn cho tồn âm.
- **D7:** kiểm kê tính lại systemQuantity backend khi xác nhận, lotId NULL;
  lệch 0 vẫn lưu item nhưng không movement. Không tin systemQuantity client.
- **D6:** disposal khóa Ingredient, quantity > 0 và ≤ tồn tổng, reason bắt buộc;
  lotId nếu có phải thuộc NVL, chỉ ghi nguồn. Không phiếu loại bỏ hoặc tồn lô/FEFO.
- **Lô/HSD:** receipt tạo lô nếu trackLot hoặc trackExpiry; trackExpiry bắt buộc expiryDate.
  HSD LocalDate theo ngày Việt Nam; hiển thị lượng nhập ban đầu, không tồn lô. Helper hiện tại:
  trước hôm nay là hết hạn, từ hôm nay đến hôm nay + days là sắp hết hạn.
- **D12/danh mục:** chặn đổi unit khi đã có movement; form nhập/kiểm kê/recipe mới chỉ ACTIVE.
  Recipe inactive đã có vẫn giữ/sửa lượng và complete vẫn tiêu hao các dòng đó.
- **Auth/UI:** D10 giữ role token tối đa 12h; giữ key/labels/MoneyText/giờ Việt Nam/401/403,
  không retry 4xx. Java import/kiểu tường minh, một lệnh mỗi dòng, không wildcard/FQN inline.
- **Popup:** reduced motion dùng `transition: none`; không trở lại duration dương toàn cục
  trên mọi thuộc tính. Kiểm click-only/vị trí popup, không chỉ gõ tìm rồi coi là đạt.

Giữ cap gọi món 99 phần/dòng, 50 dòng/đợt. Cap này không chứng minh mọi tổng tiền/recipe
cực đại đều vừa NUMERIC. Validation/BigDecimal phải phù hợp precision/scale V1; báo ca biên
và đề xuất riêng nếu cần ngưỡng nghiệp vụ mới. Không sửa/xóa QA lịch sử để tránh overflow.

## 5. Event và query key

Payment publish `FLOOR_PLAN {type, sessionId}` trong TX, listener dispatch sau commit.
Rollback/POST trùng không event, không send đồng bộ HTTP. FLOOR_PLAN hiện invalidate
`['floor-plan']`, `['payment']`, `['session', id]`; ORDER cũng invalidate payment.
Dùng prefix `['payment', ...]` cho list/preview, id dạng số; mutation thành công invalidate
`['invoices']` và dữ liệu liên quan. Payment dùng polling 30s/focus, reconnect qua hook có sẵn.
Kho không cần event mới hoặc SSE.

## 6. Bằng chứng baseline

| Đợt kiểm | Kết quả đã ghi nhận |
|---|---|
| Phase 2 ban đầu | 127 backend; 16 frontend/41 assertions; 139 API Neon; 25 browser thật + 6 layout; 7 guard tests |
| Ba sửa Critical | 150 backend; 18 frontend/47 assertions; clean verify/build/lint pass; 36 API Neon, 9 browser thật, 9 guard tests |
| Popup | 18 frontend/47 assertions/build/lint pass; 59 browser API mock, 9 browser thật chỉ đọc; chủ dự án test tay lại thấy ổn |
| Schema sau review | 18 domain tables, 106 cột, 31 FK RESTRICT, 5 partial unique index; V1 không đổi |

Không cộng số giữa các đợt, không gọi QA mock là end-to-end Neon. Backend không chạy lại
trong lượt popup. PaymentService/race thanh toán thật chưa có để nghiệm thu.
Chưa kiểm Edge/tablet vật lý hoặc benchmark nhiều SSE client treo.
Lượt chuẩn bị tài liệu này không chạy build/QA, không truy cập Neon/reset dữ liệu.

## 7. Dữ liệu và QA Phase 3

Snapshot sau review Critical: 8 account, 3 khu vực, 12 bàn, 22 món, 10 NVL,
26 dòng recipe, 15 reservation, 10 session, 17 FoodOrder, 23 OrderItem,
10 CONSUMPTION, 0 Invoice. Món QA review cuối DISCONTINUED, item review SERVED/CANCELLED.
Item QA cũ có quantity rất lớn đã UNAVAILABLE, không tính tiền, vẫn giữ để truy vết.
Readiness gần nhất **10 ACTIVE / 2 bàn trống**, lúc 11:00 ngày 23/10;
chưa có CONFIRMED cho 27/10. Đây là bằng chứng cũ, không phải trạng thái live.

Trước QA: xác minh cổng 8080/5173/command line tiến trình, không dừng nhầm app; Windows có
thể khóa JAR khi clean. Chạy `node scripts/phase1-demo-readiness.mjs` chỉ đọc.
QA trên Neon main theo duyệt cũ; script ghi cần `PHASE1_QA_ALLOW_WRITES=main` hoặc guard tương đương,
dữ liệu `[QA]`, id lấy qua API/xác minh nguồn. Ưu tiên phiên QA phù hợp; không thanh toán
hàng loạt 10 phiên chỉ để dọn bàn. Ghi chính xác phiên đã đóng, Invoice/tồn/phiếu đã tạo.
Không in token/secret. Quyền reset/init khi lỗi cần vẫn giữ; không reset tự động, có dùng phải báo tác động.

Seed kho có runner/gate riêng, qua ServiceImpl. Tồn đầu với systemQuantity=0 chỉ đúng
ở dữ liệu chưa có movement. Main đã có CONSUMPTION/tồn âm: không giả tồn bằng 0 hoặc
sửa ledger để khớp mẫu seed. Áp dụng D7 với SUM thực khi kiểm kê qua workflow; khối có
một phần thì bỏ qua/báo theo §20. HSD tương đối tính lần đầu; hai restart không nhân
phiếu/lô/movement, không làm mới ngày. Chi tiết trong hướng dẫn Phase 3.
Đọc mẫu `ReservationService.createForSeed` hiện có để truyền actor nội bộ hợp lệ;
không nhận creator từ HTTP hoặc dựng JWT giả cho seeder.

## 8. Nghiệm thu khi thực sự triển khai

[phase-3.md](phase_instructions/phase-3.md) có ma trận API, checklist 23–32 và ca race/rollback.
Kiểm phần Phase 3 của 35–36: CASHIER/WAITER thấy trả bàn không F5, reconnect/logout/polling,
reload/tablet/popup normal/reduced motion. Rà lại D12/recipe lookup/complete song song.

Backend cwd `backend/restaurant-management`: `.\mvnw.cmd clean verify`, nêu số test.
Frontend cwd `frontend`: `bun run test`, `bun run build`, `bun run lint`.
Chỉ khi có code/bằng chứng mới tạo `docs/phase_results/phase-3.md`; cập nhật TRACEABILITY
đúng phần hoàn thành. FR-10/17, đối soát/báo cáo vẫn chờ Phase 4.
Không commit/push hoặc tự sang Phase 4. Prompt sẵn ở
[phase-3-prompt.md](phase_instructions/phase-3-prompt.md).
