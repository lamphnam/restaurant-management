# Phase 4 — Đối soát, báo cáo và hoàn thiện

> **Tài liệu lịch sử trước triển khai.** Phase 0–4 và cả 9 sửa PR #4 đã có trong code tại `67e1af2` (đối chiếu 23/10/2026). Xem [hiện trạng](../README.md) và [review PR #4](../phase_results/phase-4-pr-review.md). Nội dung bên dưới giữ mốc bàn giao/prompt gốc; không dùng các dòng “chưa triển khai” làm hiện trạng hoặc chạy lại như tác vụ mới.


**Trạng thái 23/10/2026: đã chuẩn bị tài liệu, chưa triển khai.** Ngày 26/10 là lịch
dự kiến gốc; chỉ code khi chủ dự án giao riêng. Không commit/push khi chưa được yêu cầu.

## 1. Đọc trước và phạm vi

[AGENTS](../../AGENTS.md), [CLAUDE](../../CLAUDE.md), [bàn giao Phase 4](../PHASE_4_HANDOFF.md),
[review Phase 3](../phase_results/phase-3-review.md), [TRACEABILITY](../TRACEABILITY.md),
[checklist](phase-4-checklist.md), master đầy đủ. Các mục trọng tâm:
§0–1, §4–9, §10.1 ý 1/§10.2 D8–D10, §12.18–12.19, §13.1/13.9,
§14–19, §21–25 và Phụ lục A.

**FR/UC:** FR-10/UC11.2, FR-17/UC6.1; giữ FR-16; BR-05/08/09,
TR-09, NFR-01/03/04/06/07/08/09/10/11/12. Checklist 33–36 và hồi quy 1–36.
Baseline: **187 backend tests, 26 frontend tests / 77 assertions**, hai build/lint PASS.
Phase 3 đã làm, không viết lại payment/inventory hoặc khôi phục IngredientService.

Trước code báo requirement/UC, file, entity/table, rule và checklist (§0.2).
Đúng 18 bảng; không thêm ca/status đối soát, chỉnh schema, đổi role/scope,
hoặc khôi phục chức năng §1.3. Không thêm ReportsService/generic service khi đã có
PaymentService/InventoryService; giữ phân lớp controller → interface → impl → repository.

## 2. File và dữ liệu liên quan

- Mở rộng `PaymentController`, `PaymentService`/`PaymentServiceImpl`, Invoice/OrderItem repositories.
- Thêm `ReconciliationService`/`ReconciliationServiceImpl`, DTO records và mapper tay.
- `RevenueReconciliation`/repository đã tồn tại: thêm query/list/fetch/lock,
  giữ `calculateDifference()`/`confirm(Account)`, không thêm status/confirmedAt.
- Entities đọc: Invoice, Account, ServiceSession, FoodOrder, OrderItem, MenuItem;
  Ingredient/IngredientLot/StockMovement qua InventoryService hiện có.
- Frontend: api/types cho summary/reconciliation, pages `/reconciliation` và `/reports`,
  lazy-load trong `router.tsx`. Navigation/role guard đã có; `/reports` là OWNER landing.
- Tests mới + script QA có guard; cập nhật docs sau khi có bằng chứng.
  Tên DTO/helper/query key cụ thể là lựa chọn hiện thực, không phải nghiệp vụ mới.

## 3. API và quyền (§13.9)

| Method | API | Vai trò | Input / output cần có |
|---|---|---|---|
| GET | `/api/reconciliations/preview` | CASHIER | `from&to` → số Invoice, systemRevenue, CASH/BANK_TRANSFER |
| POST | `/api/reconciliations` | CASHIER | `{startTime,endTime,actualAmount,differenceReason?}` → DTO đối soát |
| GET | `/api/reconciliations` | CASHIER, MANAGER | Danh sách/phân trang + cờ đã xác nhận; phục vụ danh sách chưa xác nhận của MANAGER |
| PATCH | `/api/reconciliations/{id}/confirm` | MANAGER | Actor từ JWT; đã xác nhận →409 |
| GET | `/api/payments/summary` | OWNER | `from&to` → doanh thu/số Invoice/phương thức/top món |

Không thêm endpoint khác hoặc tự mở quyền OWNER cho đối soát, MANAGER/CASHIER cho summary.
Giữ 401/403 và API payment/inventory đang có. Bộ lọc list (khoảng/confirmed), DTO field
và paging có thể chọn theo nhu cầu màn hình; ghi contract thực tế trong báo cáo,
không thêm quy tắc “chỉ thấy phiếu của mình” khi spec không yêu cầu.

Controller chỉ validate DTO/query và `@PreAuthorize`; actor/time từ JWT/Clock.
Response DTO/page `{items,page,size,total}`, lỗi tiếng Việt, không entity/Spring Page.
Các mốc khoảng dùng Instant UTC; `from < to`/`startTime < endTime` bắt buộc có nghĩa.
`actualAmount ≥0`, reason optional tối đa 500, precision NUMERIC(14,0) theo V1;
không âm thầm làm tròn hoặc đổi schema/ngưỡng nghiệp vụ để né overflow.

## 4. Backend đối soát — D9

1. Preview dùng một nguồn aggregate Invoice trong khoảng **`[from,to)`**:
   `paidAt >= from AND paidAt < to`. Trả 0 khi rỗng, count bao gồm Invoice 0đ;
   total bằng CASH + BANK_TRANSFER. Không tính từ tổng order, ca riêng, openedAt,
   hoặc chỉ hóa đơn của cashier đang đăng nhập.
   API lịch sử listInvoices hiện lọc `<=to`; aggregate D9/report phải dùng `<to`,
   không cộng qua list phân trang hoặc tự thay semantics lịch sử.
2. POST `[TX]`: kiểm input, tính lại systemRevenue trên server lúc lưu,
   tạo RevenueReconciliation với cashier từ JWT, manager null,
   start/end theo input, actualAmount thực nhận tổng, reason optional,
   reconciledAt = Clock.instant(). Không nhận systemRevenue/difference/cashier/manager từ client.
   Preview cũ không thay số tính lại. Snapshot lưu rồi không sửa theo Invoice phát sinh sau.
3. difference = actualAmount − systemRevenue; âm/dương/0 hợp lệ.
   Khoảng chồng nhau được phép; không áp đặt một ca/một ngày hoặc một phiếu/cashier.
   Không thêm từ chối/sửa/xóa hoặc lý do bắt buộc khi lệch.
4. GET trả cashier/manager/thời gian/khoảng/số tiền/difference/reason, cờ confirmed
   suy từ manager != null. Fetch đủ actor, tránh N+1 và giữ thứ tự trang.
5. Confirm `[TX]`: pessimistic lock RevenueReconciliation **trước** kiểm manager,
   require chưa xác nhận, gọi entity.confirm(actor), chỉ gán manager.
   Không sửa reconciledAt hoặc snapshot. Không ghi doanh thu/Invoice/movement.
6. Hai confirm song song: một thành công, một 409; lần gọi sau cũng 409.
   Đây là quy định cụ thể §12.18, **ngoại lệ PATCH no-op** §13.1.

Không khóa tất cả Invoice hoặc sửa payment workflow để tạo khái niệm ca mới.
Có thể dùng aggregate/projection chung cho preview/POST/summary để thống nhất biên thời gian;
tránh đọc total và từng phương thức qua nhiều truy vấn không cần thiết.

## 5. Backend báo cáo

- Revenue/count/methods lấy từ Invoice theo paidAt `[from,to)`, không thay đổi dữ liệu.
- Top món: SUM OrderItem.quantity, bỏ CANCELLED/UNAVAILABLE, chỉ phiên có Invoice
  trong cùng khoảng; READY được tính theo D8. Không dùng ngày tạo order làm kỳ báo cáo.
- Không SUM Invoice.amount sau join nhiều item làm nhân đôi tiền.
  Nếu hiển thị tiền theo món, dùng unitPriceAtOrder, không menu price hiện tại.
- Projection/aggregate thay vì tải toàn bộ entity rồi cộng vòng lặp; tránh N+1.
  Định dạng DTO/order hiển thị là lựa chọn kỹ thuật, không thêm nghiệp vụ ngoài spec.
- Dữ liệu kho dùng API đã có: ingredients belowMinStockOnly, lots attention default days,
  movements trang 0 size 10 (mới nhất). Tồn = SUM ledger, thấp là `< minStock`, tồn âm tô đỏ.
  Đây là thông tin kho **hiện tại**, không tồn lịch sử tính theo khoảng doanh thu.

## 6. Frontend

- `/reconciliation`: CASHIER chọn khoảng → preview → actual tổng/reason → Popconfirm lưu.
  Cho phép actual=0; không mặc định số thực nhận theo systemRevenue hoặc preview cũ.
  MANAGER xem list/chưa xác nhận, mở chi tiết cần thiết trong màn và confirm.
  Không sửa phiếu đã lập. Loading/disable chống gửi lặp; 409 khi confirm cũ → feedback/refetch.
- `/reports`: OWNER, mặc định hôm nay theo Asia/Ho_Chi_Minh, gửi UTC `[startOfDay,nextDay)`.
  Statistic + Table: revenue/count/methods/top món, tồn thấp/lô chú ý/10 movements mới nhất.
  Tổng tiền 0 và “Không có dữ liệu” phải rõ khi rỗng; không crash khi chỉ một số khối có dữ liệu.
- Giữ Ant Design/labels/StatusTag/MoneyText/time/useApiFeedback và shared PageResponse.
  Không thêm UI library/chart framework, Redux/Next.js hoặc nhánh business rule frontend.
- Query key riêng cho reconciliation/preview/summary; có from/to trong key, scope inventory
  dùng các prefix đã có. Sau create/confirm invalidate list/preview liên quan, không reload cả app.
  Không thêm SSE event mới cho kho/đối soát/báo cáo. Nếu bổ sung refetch phải giữ hook hiện có.
- Popup click/keyboard/Escape/outside, desktop/tablet và reduced motion. Không đổi
  `transition: none` thành duration dương global làm hỏng đo left/top.

## 7. Kiểm thử và QA

Unit/MockMvc không DB; giữ baseline 187 backend và 26 frontend tests. Thêm ca thực sự
kiểm hành vi, không viết lại sáu nhóm §21.1 thành suite sáu tests.

| Nhóm | Ca bắt buộc |
|---|---|
| Khoảng thời gian | Tại start được tính, tại end bị loại, trước/sau bị loại; ngày Việt Nam/UTC; from≥to bị chặn |
| Revenue | Rỗng/0đ/CASH/BANK_TRANSFER, total=breakdown, top món không nhân tiền, chưa trả tiền bị loại |
| POST đối soát | Preview khác tồn dữ liệu lúc lưu, server tính lại; snapshot/audit đúng, reason optional, actual 0/âm/precision, không tạo doanh thu |
| Confirm | Đúng actor, không sửa snapshot/reconciledAt; 404/sai role/đã confirm 409; hai request song song |
| Top món | Nhiều đợt/phiên, CANCELLED/UNAVAILABLE loại, READY giữ, giá menu đổi không làm sai snapshot |
| Security/UI | Ma trận đủ 6 role +401, guard 2 route, OWNER landing, rỗng/loading/lỗi/reload/popup |
| Hồi quy | Kiểm kê chỉ dòng đã đếm/clear/zero, duplicate/inactive/locks; payment→awaiting-service; recipe; Session→OrderItem; SSE/polling |

Chạy Neon main theo duyệt; readiness chỉ đọc trước ghi, guard cho từng lượt script.
Prefix `[QA]`, không hard-code session/Invoice chưa xác minh, không sửa paidAt hoặc ledger
để dựng test. Không reset tự động; ghi snapshot before/after và tác động giao dịch.
Mock/real service/HTTP/browser phải báo riêng, không coi mock là checklist live đã đạt.

Checklist: dùng [file 1–36](phase-4-checklist.md), mục 33/34 đối soát; 35 realtime
qua hai browser, 36 persistence/tablet và hồi quy toàn bộ các nhóm. Bổ sung bảng riêng
cho reports/D9/race/security/TR-09 vì 36 mục gốc không mô tả hết Phase 4.

## 8. Hoàn thiện và điều kiện xong

- Backend cwd `backend/restaurant-management`: `.\mvnw.cmd clean verify`.
- Frontend cwd `frontend`: `bun run test`, `bun run build`, `bun run lint`.
- Chạy app, checklist 1–36 và demo hai chuỗi §25; giữ bằng chứng, nêu phần chưa kiểm.
- TR-09: README đủ hướng dẫn; xác minh/ghi tình trạng backup/restore.
  Không tự `pg_restore --clean` lên main để kiểm tài liệu hoặc tự tạo branch trái lựa chọn chủ dự án.
- Khi có code/QA mới tạo `docs/phase_results/phase-4.md`: số tests/checks, file đổi,
  từng checklist, khác biệt spec, giới hạn, dữ liệu/reset/backup nếu có.
- Chốt TRACEABILITY đúng trạng thái thực tế, README/frontend/AGENTS/CLAUDE/docs index.
  Không đánh FR-10/17 đã làm hoặc “36/36 PASS” trước bằng chứng.
- Không commit/push hoặc tự mở rộng scope. Prompt dùng khi được giao:
  [phase-4-prompt.md](phase-4-prompt.md).
