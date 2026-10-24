# Bàn giao từ Phase 3 sang Phase 4

> **Tài liệu lịch sử trước triển khai.** Phase 0–4 và cả 9 sửa PR #4 đã có trong code tại `67e1af2` (đối chiếu 23/10/2026). Xem [hiện trạng](README.md) và [review PR #4](phase_results/phase-4-pr-review.md). Nội dung bên dưới giữ mốc bàn giao/prompt gốc; không dùng các dòng “chưa triển khai” làm hiện trạng hoặc chạy lại như tác vụ mới.


Ngày chốt tài liệu: **23/10/2026**, Asia/Ho_Chi_Minh. Phase 0–3 đã triển khai,
các sửa review PR #1/#2/#3 và popup đã có trong code. **Phase 4 chưa triển khai**;
chủ dự án hiện yêu cầu chuẩn bị tài liệu. Không bắt đầu code hoặc commit/push từ tài liệu này.

## 1. Điểm xuất phát

- Workspace: `D:\capstone_project_ueh`; branch `feat/phase-3-implement`, HEAD
  `72d1bdcb0f2f7b9e13a1270bb5ebc676974a6d11` của PR #3.
- Các sửa review Phase 3 và bộ tài liệu mới chưa commit/push. Đọc `git status`,
  branch/HEAD thực tế trước việc tiếp theo; giữ toàn bộ thay đổi, không reset/stash/ghi đè.
- Java root: `backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/`.
  Java 21, Spring Boot 4.1.1, Maven wrapper; frontend React/TypeScript/Vite/**Bun**.
- Flyway V1: 18 bảng domain, JPA validate. Không có lý do thêm bảng/cột/status cho Phase 4.

Đọc theo thứ tự: [AGENTS](../AGENTS.md) / [CLAUDE](../CLAUDE.md),
[master](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md),
[review Phase 3](phase_results/phase-3-review.md), [TRACEABILITY](TRACEABILITY.md),
[hướng dẫn](phase_instructions/phase-4.md), [prompt](phase_instructions/phase-4-prompt.md),
[checklist](phase_instructions/phase-4-checklist.md). Kết quả Phase 3 ban đầu là mốc riêng.

## 2. Baseline đã kiểm chứng

| Đợt | Bằng chứng |
|---|---|
| Phase 3 ban đầu | 176 backend tests; 25 frontend tests / 76 assertions; 111 API checks trên Neon main |
| PR #3 review — baseline hiện tại | **187 backend tests; 26 frontend tests / 77 assertions; clean verify, build frontend và lint PASS** |
| Review browser | 16 nhóm ca API mock ở 1024/375px, normal/reduced motion; không page error |
| Review Neon | 10 checks chỉ đọc; 22 checks service/transaction thật, gồm kiểm kê–kiểm kê và disposal–kiểm kê |
| SQL lists | Invoices/movements tối đa 2 statements/trang; receipts/stocktakes tối đa 3, không tăng theo số dòng |

Không cộng các lượt test hoặc coi build là nghiệm thu cả hệ thống. Chưa chạy checklist
1–36 trong một lượt Phase 4. Edge, tablet thật, payment→SSE qua hai browser thật và
thực diễn restore chưa có bằng chứng mới trong review Phase 3; lập kế hoạch kiểm rõ.
Sáu mục §21.1 là sáu nhóm ca bắt buộc đã được suite bao phủ, không phải chỉ giữ sáu tests.

## 3. Code hiện có và điểm nối

Các đường dẫn Java dưới đây tương đối với Java root.

| Code hiện có | Cách dùng trong Phase 4 |
|---|---|
| `controller/PaymentController.java` | Hiện có open-sessions/preview/pay/invoices; base `/api`, thuận tiện thêm summary và `/reconciliations/**` theo §13.9. Không đổi quyền payment cũ. |
| `service/PaymentService.java`, `service/impl/PaymentServiceImpl.java` | Tái dùng để thêm summary; revenue lấy từ Invoice, không gọi lại tính tạm tính các phiên. |
| `entity/RevenueReconciliation.java` | Đủ cashier/manager/time/systemRevenue/actualAmount/reason/reconciledAt; `calculateDifference()`, `confirm(Account)` đã có. manager null nghĩa chưa xác nhận; confirm lần hai đã ném BusinessException. Chưa có service/controller workflow. |
| `repository/RevenueReconciliationRepository.java` | Hiện chỉ JpaRepository; bổ sung list/fetch/lock khi triển khai, không suy rằng đối soát đã làm. |
| `repository/InvoiceRepository.java`, `entity/Invoice.java` | amount/paymentMethod/paidAt/session/cashier; thêm aggregate theo paidAt `[from,to)` và nhóm phương thức. Giữ entity graph cho lịch sử hóa đơn. |
| `repository/OrderItemRepository.java`, `FoodOrderRepository.java` | Thêm aggregate top món từ phiên có Invoice trong kỳ, dùng quantity thực và trạng thái; tránh nhân bản tổng Invoice do join nhiều chi tiết. |
| `service/InventoryService.java`, `service/impl/InventoryServiceImpl.java` | Dùng lại listIngredients(belowMinStockOnly), listAttentionLots(default days), listMovements(page=0,size=10). Không thêm nguồn tính tồn hoặc Inventory/ReportService trùng. |
| `security/CurrentUser.java`, Clock/AppProperties | Actor từ JWT, thời điểm từ Clock; hôm nay theo app.timezone. D10 giữ role token. |
| DTO/mapper/PageResponse/ErrorResponse | Java record, mapping tay, page DTO; không trả entity/Page Spring. Precision theo V1. |

Lưu ý biên thời gian: `PaymentServiceImpl.listInvoices` hiện dùng `paidAt <= to` cho
bộ lọc lịch sử Phase 3. Không lấy nguyên semantics đó làm aggregate D9/report:
đối soát và summary cần **`paidAt < to`**. Dùng query aggregate phù hợp; không tự đổi
contract lịch sử hiện có chỉ để dùng chung query.

Frontend hiện có 12 route nghiệp vụ: accounts/menu/floor-plan/reservations/session,
kitchen/awaiting-service/payment/invoices/inventory/receipts/stocktake.
`auth/roles.ts` đã khai báo `/reconciliation` cho CASHIER/MANAGER và `/reports` cho OWNER.
`router.tsx` còn dùng WorkspacePage cho đúng hai route này; OWNER landing `/reports` còn placeholder.
Thêm lazy pages, API/types; giữ cơ chế navigation/RequireRole hiện có.

## 4. Phạm vi Phase 4

- **FR-10 / UC11.2, BR-05/09:** preview, lập, tra cứu và MANAGER xác nhận đối soát.
- **FR-17 / UC6.1, BR-08:** một trang báo cáo, doanh thu/số hóa đơn/phương thức/top món
  theo khoảng; tồn thấp/lô chú ý/10 movements gần nhất từ các API kho đã có.
- **FR-16:** giữ lịch sử hiện có, không thêm màn lịch sử tổng hợp.
- **TR-09, NFR liên quan:** tài liệu backup/restore, regression quyền/realtime/persistence/UI,
  checklist 33–36 và hồi quy 1–36, demo hai chuỗi theo §25.
- Ngoài phạm vi: CRUD ca, bảng work_shift/revenue/status đối soát, sửa/từ chối/xóa đối soát,
  payment gateway, PDF hóa đơn, biểu đồ/dashboard riêng, FEFO/tồn theo lô và các chức năng §1.3.

## 5. Quy tắc D9 và báo cáo

- Ca là khoảng **`[startTime,endTime)`**; Invoice có paidAt ≥ start và < end mới được tính.
  Không dùng openedAt/closedAt, ngày đơn gọi món hoặc chỉ hóa đơn của cashier đang login.
- Doanh thu duy nhất từ `Invoice.amount`, bao gồm Invoice 0đ trong số hóa đơn.
  `actualAmount` là tổng thực nhận tiền mặt + chuyển khoản; không bắt nhập hai tổng riêng.
- POST đối soát tính lại systemRevenue backend khi lập, không tin preview/client;
  snapshot systemRevenue/actualAmount/reason được giữ sau lập, reconciledAt từ Clock,
  cashier từ JWT, manager null. difference = actual − system, reason optional ≤500.
- Cho phép khoảng chồng nhau và chênh lệch âm/dương/0. Không có đối soát từ chối/sửa/xóa,
  không ghi Invoice hoặc movement khi tạo/xác nhận.
- Confirm khóa dòng RevenueReconciliation trước kiểm manager; gán manager từ JWT,
  không sửa reconciledAt/systemRevenue/actualAmount. Hai confirm đồng thời: một thành công,
  một 409. **§12.18 ghi rõ đã xác nhận →409**, là ngoại lệ cụ thể của PATCH no-op §13.1.
- Summary: tổng Invoice và breakdown cùng khoảng; top món SUM quantity, chỉ phiên có
  Invoice trong kỳ, bỏ CANCELLED/UNAVAILABLE, vẫn tính READY theo D8.
  Dùng snapshot unitPriceAtOrder nếu hiển thị số tiền món; không dùng giá menu hiện tại.
- Mặc định UI hôm nay theo giờ Việt Nam; gửi UTC Instant. Kho là tồn/cảnh báo hiện tại,
  không dựng tồn lịch sử theo kỳ doanh thu. 10 movements gần nhất có thể dùng API hiện có.

API/quyền và ma trận ca kiểm chi tiết nằm trong [hướng dẫn](phase_instructions/phase-4.md).
Không mở API đối soát cho OWNER hoặc summary cho MANAGER/CASHIER trái §13.9.

## 6. Các sửa cũ bắt buộc giữ

- Session → OrderItem, ACTIVE trước no-op, cap 99 phần/50 dòng, snapshot giá.
- Payment chỉ CASHIER, khóa phiên trước đọc món; READY/0đ; duplicate POST 409;
  Invoice/close/release atomic, không ép serve trước payment.
- Recipe full replacement khóa MenuItem; giữ/sửa lượng dòng inactive đã có, dòng mới ACTIVE.
- Tồn = SUM movement; không sửa/xóa ledger; CONSUMPTION vẫn có thể làm tồn âm (D5).
- Kiểm kê chỉ gửi số đã đếm; xóa ≠0; backend chặn duplicate/inactive và khóa Ingredient
  tăng dần trước SUM; disposal dùng cùng khóa. Zero difference không thêm movement.
- Seed nonnegative, service helper với Account nội bộ; gate độc lập, không refresh lịch sử/ngày.
- SSE chỉ invalidation, executor riêng sau commit; FLOOR_PLAN invalidate awaiting-service;
  reconnect/polling 30s. Kho/đối soát/báo cáo không cần loại event mới.
- UI Ant Design, labels/StatusTag/MoneyText/giờ Việt Nam, shared PageResponse;
  giữ 401/403/retry policy và `transition: none` cho reduced motion.
- Giữ graph/query phân trang đã đo trên Neon; không fetch join collection cùng pageable.

## 7. Neon và QA

Giữ **Neon main** theo duyệt 22/10. Không tạo branch QA/reset tự động.
Snapshot sau review 23/10: 18 NVL, 4 lots, 9 receipts/19 items, 12 stocktakes/21 items,
48 movements, 4 invoices, 12 sessions. Review fixture NVL **ID 18 INACTIVE**, tồn 8 kg.
Readiness lúc đó: 4 bàn trống, 8 ACTIVE, chưa có đặt bàn demo 27/10; không dùng số này như live.

Trước ghi: xác minh process/cổng 8080/5173 và `node scripts/phase1-demo-readiness.mjs`.
Script QA mới cũng phải dùng guard `PHASE1_QA_ALLOW_WRITES=main`, prefix `[QA]`,
không in secret/token. Reconciliation/report tests có thể dùng Invoice QA đã có sau
khi xác minh; không trả tiền phiên hàng loạt hoặc sửa paidAt để dựng biên.
Ghi rõ phiếu/Invoice/session/reconciliation được tạo và before/after trong báo cáo.
Các ca biên thời gian tổng hợp có thể dùng unit test với Clock cố định.

Quyền reset/init khi lỗi cần vẫn giữ; không phải lệnh reset. Backup/restore chưa thực diễn;
không chạy `pg_restore --clean` lên main chỉ để đạt checklist hoặc kiểm tài liệu.

## 8. Khi được giao triển khai

1. Đọc master đầy đủ và thông báo requirement/UC, file, entity, rule, checklist trước code.
2. Làm reconciliation/backend summary → frontend → unit/security/validation/race → QA/regression.
3. Giữ 187 backend và 26 frontend tests; thêm test hành vi mới, chạy hai build và lint.
4. Dùng [checklist 1–36](phase_instructions/phase-4-checklist.md); chỉ đánh PASS khi có bằng chứng.
5. Khi có code/QA mới tạo `docs/phase_results/phase-4.md`; chốt TRACEABILITY/README,
   ghi khác biệt spec, phần chưa kiểm, tác động DB và giới hạn backup/restore.
6. Không commit/push hoặc triển khai ngoài phạm vi nếu chưa được yêu cầu.

Lượt chuẩn bị tài liệu này không chạy lại app/QA và không thay đổi database.
