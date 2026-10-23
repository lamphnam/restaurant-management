# Prompt triển khai Phase 3

Chỉ giao prompt này khi chủ dự án yêu cầu bắt đầu Phase 3. Việc chuẩn bị file ngày
23/10/2026 chưa cho phép chạy phần triển khai bên dưới.

```text
Bạn làm việc trong D:\capstone_project_ueh. Triển khai Phase 3 của KLTN theo
CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-3.md.
Chỉ làm Phase 3; không tự sang Phase 4. Chưa commit/push tới khi tôi yêu cầu.

1. ĐỌC TRƯỚC KHI CODE
- Đọc đầy đủ CLAUDE.md, master Spring/React, docs/PHASE_3_HANDOFF.md,
  docs/phase_instructions/phase-3.md, prompt này, docs/TRACEABILITY.md và ba báo cáo
  docs/phase_results/phase-2.md, phase-2-review.md, phase-2-popup-fix.md.
- Đọc code/test: InventoryController/IngredientService, entity/repository kho/Invoice,
  Session/KitchenServiceImpl và khóa Session → OrderItem, mapper/tổng snapshot, seeder,
  frontend router/role/api/feedback/query/SSE/time/labels và reduced-motion CSS.
- Kiểm git status/branch/HEAD thực tế; giữ mọi thay đổi chưa commit từ review/popup/tài liệu.
  Không reset/stash/ghi đè. Baseline: 150 backend test; 18 frontend/47 assertions;
  clean verify/build/lint pass; 36 API review Neon + 9 browser thật. Popup có 59 mock,
  9 thật chỉ đọc; chủ dự án test tay lại thấy ổn. Không cộng các đợt thành một lần chạy.
- Trước code báo ngắn requirement/UC, entity/table, business rule, file dự kiến,
  checklist/cách kiểm. Sau đó triển khai, không dừng ở kế hoạch.
- Nếu mâu thuẫn spec/schema hoặc cần ngưỡng nghiệp vụ mới: nêu và hỏi trước phần phụ thuộc,
  tiếp tục phần độc lập. Không tự thêm bảng/cột/migration/role/trạng thái.

2. GIỮ QUYẾT ĐỊNH ĐÃ CHỐT
- V1/18 bảng, Controller → Service interface → ServiceImpl → Repository, DTO record,
  mapper thủ công, @PreAuthorize mọi handler; CurrentUser/Clock/BigDecimal.
- Java import/kiểu tường minh; không wildcard/FQN inline/nhiều lệnh một dòng.
- D10: JWT cũ giữ role tối đa 12h sau khóa/đổi role; /me từ token, không revoke/nạp role DB mỗi request.
- Recipe PUT khóa MenuItem trước diff; dòng mới ACTIVE, giữ/sửa được inactive đã có.
  Complete đọc recipe hiện tại gồm inactive được giữ; lotId null, tồn âm cho phép.
- Order 99 phần/dòng, 50 dòng/đợt, snapshot giá. Mọi ghi món khóa Session → OrderItem,
  require ACTIVE trước cả no-op; READY/SERVED complete no-op chỉ trong phiên ACTIVE.
- SSE sau commit, executor riêng, bắt lỗi dispatch/send; rollback/no-op không event;
  không gửi đồng bộ/CallerRuns. Giữ key payment, polling/reconnect/logout.
- Giữ tableId/unexpired, walk-in độc lập query, labels/StatusTag/MoneyText/giờ Việt Nam,
  useApiFeedback/401/403/không retry 4xx. Reduced motion giữ transition:none.

3. BACKEND PHASE 3
- Thêm PaymentController/PaymentService/Impl; GET /api/payments/open-sessions,
  GET /api/payments/sessions/{id}, POST /api/payments chỉ CASHIER;
  GET /api/invoices chỉ CASHIER/MANAGER/OWNER. POST nhận {sessionId,paymentMethod}.
- Preview đủ mọi đợt, dùng unitPriceAtOrder, bỏ CANCELLED/UNAVAILABLE, liệt kê PENDING/COOKING.
- POST một TX: khóa ServiceSession trước load items/tính tiền; require ACTIVE/chưa Invoice,
  không PENDING/COOKING. READY chưa SERVED vẫn tính, 0đ vẫn được đóng. Không ép serve.
  Tính lại tổng server, Invoice đúng cashier/paidAt, close phiên, release bàn, publish FLOOR_PLAN.
  Lỗi rollback đủ Invoice/phiên/bàn/event; POST trùng/song song một thành công, còn lại
  409 “Phiên đã được thanh toán”, không áp dụng no-op PATCH cho POST.
- Payment cạnh tranh order/cancel/start/unavailable/complete/serve dùng chung khóa phiên;
  sau CLOSED mọi PATCH kể cả cùng đích phải 409, không movement/sửa tổng sau Invoice.
  Rà guard/time/no-op close/release, giữ luật mở phiên/đặt bàn.
- Mở rộng InventoryController hiện có theo toàn bộ bảng API/quyền ở phase-3.md và §13.8.
  Danh mục chỉ OWNER ghi; OWNER/HEAD_CHEF đọc tồn/lô/biến động; HEAD_CHEF nhập/kiểm kê/loại bỏ.
  Bổ sung InventoryService/Impl, giữ lookup id/name/unit/status và status ACTIVE cho recipe.
- D12 chặn đổi unit khi có movement. Tồn = COALESCE(SUM(quantityChange),0), aggregate theo nhóm,
  không N+1; tìm tên/trạng thái/tồn thấp, không hard delete hoặc bảng tồn riêng.
- Receipt TX: NVL ACTIVE/quantity>0; expiry bắt buộc theo trackExpiry; trackLot hoặc
  trackExpiry tạo lô; receipt/item/RECEIPT dương đúng nguồn/audit; lỗi rollback toàn bộ.
- Stocktake TX: template ACTIVE, actual>=0; tính lại systemQuantity backend lúc xác nhận,
  lotId null; lệch khác0 có adjustment, bằng0 vẫn item/không movement. Không tin tồn client.
- Disposal TX: khóa Ingredient rồi SUM; quantity>0, <=tồn tổng, reason bắt buộc;
  lot nếu có thuộc NVL; DISPOSAL âm, không phiếu riêng/tồn lô/FEFO.
- Lots attention dùng ngày Việt Nam/default expiry-days, kiểm biên quá hạn/hôm nay/ngưỡng;
  hiện lượng nhập ban đầu. Movements đủ bốn loại/nguồn/actor/time/reason/filter/page.
- Validation phù hợp precision/scale V1, không để overflow thành thông báo trùng dữ liệu.
  Nếu cần cap nghiệp vụ mới thì nêu để quyết định, không tự đổi 99/50/xóa QA lịch sử.

4. FRONTEND PHASE 3
- Thay placeholder /payment, /invoices, /inventory, /inventory/receipts, /inventory/stocktake;
  Ant Design theo mẫu lazy api/types/pages, đúng role/action.
- Payment list → preview → CASH/BANK_TRANSFER → Popconfirm đã nhận tiền; pending/disable,
  hiện món chặn/0đ, không gửi total; 409 stale thì phản hồi/refetch. CASHIER dùng màn riêng,
  không mở route session/quyền gọi/hủy/phục vụ cho thu ngân.
- Query payment list/preview prefix ['payment']; FLOOR_PLAN/ORDER/reconnect đã invalidate,
  polling 30_000/focus. Thành công invalidate invoices/key liên quan, trả bàn không F5.
- Invoices lọc khoảng/phương thức/page. Inventory ba tab tồn/lô/biến động, OWNER danh mục,
  HEAD_CHEF disposal có Popconfirm; đỏ tồn âm/tag thấp. Receipt nhiều dòng, stocktake
  chênh lệch tạm, backend vẫn tính lại. Kho không cần SSE/event mới.
- Popup chọn NVL/phương thức/ngày kiểm normal/reduced motion, click-only/keyboard/outside/
  Escape/tablet; giữ CSS fix, nhãn/trạng thái/UI library hiện có.
- Không làm đối soát, /api/payments/summary, báo cáo hoặc chức năng ngoài scope.

5. SEED, TEST VÀ QA
- Seeder kho riêng sau PhaseOneSeeder: app.seed/gate từng khối receipt/stocktake/lô,
  qua ServiceImpl/audit hợp lệ, không bị account đã có chặn; hai restart không nhân dữ liệu.
  Khối có một phần thì bỏ qua/báo, không tự xóa/điền đè/làm mới HSD/ngày lịch sử.
- Main đã có CONSUMPTION/tồn âm: không giả systemQuantity=0; D7 dùng SUM thực khi kiểm kê.
  Mẫu tồn đầu system=0 chỉ khi chưa movement. Seed lô hết hạn/còn2ngày/tồn thấp theo §20,
  báo khối thực hiện/bỏ qua/tác động, không sửa ledger.
- Trước QA kiểm process/cổng8080/5173, không dừng nhầm, chạy readiness chỉ đọc.
  Snapshot10 ACTIVE/2trống là bằng chứng cũ, không phải live.
- QA Neon main theo quyền đã duyệt, không cần branch. Dùng lại phiên QA phù hợp sau xác minh,
  lấy id API, không thanh toán hàng loạt phiên khác để dọn bàn. Script ghi có guard
  PHASE1_QA_ALLOW_WRITES=main hoặc tương đương, dữ liệu [QA], không in secret/token.
  Reset/init chỉ khi lỗi cần theo quyền cũ, không tự động; có dùng phải báo tác động.
- Giữ test baseline, thêm unit/MockMvc không DB về payment/stocktake/disposal/D12,
  guards/ma trận sáu role/401/annotation/TX/event/rollback. Checklist23–32 theo bảng hướng dẫn,
  phần35–36 về payment/SSE/reload/tablet, hồi quy Phase1–2 liên quan.
- Hai POST payment song song: một Invoice, một thành công/một409; payment cạnh tranh
  order/cancel/complete/serve không Invoice lệch items/movement sau CLOSED. Hai disposal
  song song không cùng vượt tồn. D7 recompute khi template cũ; receipt rollback đủ bộ.
- Hai context CASHIER/WAITER thấy trả bàn không F5, reconnect/logout/fallback polling.
  Tồn API/UI đối chiếu ledger, đủ bốn loại/nguồn; popup normal/reduced motion.
  Phân biệt QA mock và app/API/Neon thật, ghi số đo/giới hạn chưa kiểm.

6. NGHIỆM THU VÀ BÁO CÁO
- Backend cwd backend/restaurant-management: .\mvnw.cmd clean verify, nêu số test.
  Frontend cwd frontend: bun run test, bun run build, bun run lint.
- Khi xong tạo docs/phase_results/phase-3.md: file đổi/checklist từng mục/API/role/race,
  seed/restart/tác động DB/reset/khác biệt spec/phần chưa xác minh.
- Cập nhật TRACEABILITY/CLAUDE/AGENTS/README đúng thực tế, FR-04/09/11–16 theo phần đã xong;
  FR-10/17 và đối soát/báo cáo vẫn Phase4, không suy đạt từ entity/build.
- Không commit/push; không tự bắt đầu Phase4.
```
