# Prompt triển khai Phase 4

> **Tài liệu lịch sử trước triển khai.** Phase 0–4 và cả 9 sửa PR #4 đã có trong code tại `67e1af2` (đối chiếu 23/10/2026). Xem [hiện trạng](../README.md) và [review PR #4](../phase_results/phase-4-pr-review.md). Nội dung bên dưới giữ mốc bàn giao/prompt gốc; không dùng các dòng “chưa triển khai” làm hiện trạng hoặc chạy lại như tác vụ mới.


**Chưa thực thi.** Chỉ giao đoạn dưới khi chủ dự án yêu cầu bắt đầu code Phase 4.
Chuẩn bị ngày 23/10/2026 không tự cấp quyền triển khai, commit hoặc push.

```text
Bạn làm việc trong D:\capstone_project_ueh. Triển khai Phase 4 của KLTN theo
CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-4.md.
Chỉ làm Phase 4; không mở rộng scope. Không commit/push tới khi tôi yêu cầu.

ĐỌC VÀ KIỂM TRƯỚC CODE
- Đọc AGENTS.md, CLAUDE.md, master đầy đủ, docs/PHASE_4_HANDOFF.md,
  docs/phase_instructions/phase-4.md, phase-4-checklist.md, docs/TRACEABILITY.md,
  docs/phase_results/phase-3-review.md; đọc review Phase 1/2 và popup để giữ hồi quy.
- Kiểm git status/branch/HEAD thực tế. Baseline bàn giao: feat/phase-3-implement,
  72d1bdc cộng các sửa review Phase 3/tài liệu chưa commit. Giữ tất cả thay đổi,
  không reset/stash/ghi đè hoặc triển khai lại Phase 3.
- Code hiện tại: PaymentService/Controller có payment/invoices; InventoryService
  có kho đầy đủ; IngredientService/Impl đã xóa. RevenueReconciliation entity và
  repository có sẵn nhưng chưa có workflow. /reports và /reconciliation còn placeholder.
- Trước sửa code báo FR/UC, entity/table, business rule, file dự kiến, checklist.

PHẠM VI VÀ KIẾN TRÚC
- FR-10/UC11.2 đối soát, FR-17/UC6.1 báo cáo, BR-05/08/09, TR-09/NFR liên quan;
  checklist 33–36 và hồi quy 1–36, demo hai chuỗi theo §25.
- Đúng 18 bảng/schema V1, không thêm status/confirmedAt/ca/work_shift/revenue.
  Không thêm tính năng §1.3, sửa/từ chối/xóa đối soát, PDF/gateway, FEFO/tồn theo lô.
- Controller → service interface → impl → repository, record DTO, mapping tay,
  @PreAuthorize/validation backend; actor JWT, Clock, BigDecimal, precision V1.
  Giữ mô hình service hiện có; thêm ReconciliationService/Impl, mở rộng PaymentService
  cho summary, dùng InventoryService cho khối kho; không thêm kiến trúc/framework.

ĐỐI SOÁT D9
- API đúng §13.9: GET /reconciliations/preview CASHIER; POST /reconciliations CASHIER;
  GET /reconciliations CASHIER/MANAGER; PATCH /reconciliations/{id}/confirm MANAGER.
- Ca là [startTime,endTime), Invoice.paidAt >= start và < end. Invoice.amount là
  nguồn doanh thu duy nhất, count có cả Invoice 0đ; breakdown CASH/BANK_TRANSFER.
- POST tính lại systemRevenue lúc lập, không tin preview/client; cashier JWT,
  manager null, reconciledAt Clock. actualAmount tổng thực nhận >=0, reason optional
  <=500; difference=actual-system. Snapshot đã lập không sửa.
- Khoảng chồng nhau hợp lệ; không tự lọc chỉ hóa đơn của cashier, không ghi doanh thu
  lần hai hoặc thêm điều kiện lý do bắt buộc khi lệch.
- Confirm khóa RevenueReconciliation trước kiểm manager, gọi confirm(actor), chỉ
  gán manager. Đã confirmed/lặp trả 409 theo §12.18, ngoại lệ cụ thể của PATCH no-op.
  Race hai confirm: một thành công, một 409, snapshot/reconciledAt không đổi.

BÁO CÁO
- GET /payments/summary chỉ OWNER: revenue/count/methods/top món theo Invoice.paidAt
  cùng khoảng [from,to). Không SUM Invoice sau join nhiều item làm nhân tiền.
- Top món SUM quantity của item không CANCELLED/UNAVAILABLE ở phiên có Invoice
  trong kỳ; READY giữ theo D8; nếu hiển thị tiền món dùng unitPriceAtOrder.
- /reports một trang Statistic + Table, mặc định hôm nay giờ Việt Nam, UTC Instant;
  thêm tồn thấp/lô chú ý/10 movements gần nhất từ API kho hiện có. Kho là hiện tại,
  không dựng tồn lịch sử theo kỳ revenue. Rỗng hiển thị rõ, không thêm chart library.
- /reconciliation phân UI đúng CASHIER/MANAGER; loading/disable/Popconfirm, actual=0,
  preview stale/409/refetch, list/chưa confirmed/confirmed/reload.
- Giữ lazy routes/role guards, Ant Design, labels/StatusTag/MoneyText/time,
  useApiFeedback, shared PageResponse và auth 401/403/retry hiện có.

HỒI QUY PHẢI GIỮ
- Session → OrderItem, ACTIVE trước no-op, 99 phần/dòng, 50 dòng/đợt.
- Payment D8/duplicate409/snapshot/atomic close+release, không ép serve.
- Recipe lock/diff và retained inactive; D10 role JWT không đổi đến hết hạn.
- Stocktake blank/count-only/clear≠0/explicit0, duplicate/inactive bị chặn,
  Ingredient IDs khóa tăng dần trước SUM, disposal cùng khóa, zero diff không movement.
- Seed nonnegative trước receipt qua helper service/Account nội bộ; không refresh lịch sử.
- Invoice/movement graph và receipt/stocktake page-details fetch; không N+1 hay
  collection fetch join cùng pageable. SSE executor riêng AFTER_COMMIT, FLOOR_PLAN
  invalidate awaiting-service, reconnect/polling30s; reduced-motion transition:none.

KIỂM THỬ, QA VÀ TÀI LIỆU
- Giữ baseline 187 backend tests và 26 frontend tests/77 assertions. Sáu mục §21.1
  là nhóm ca bắt buộc, không thay suite bằng sáu tests. Thêm test biên [start,end),
  empty/0đ/breakdown/top món/snapshot/preview cũ/confirm race/role và validation.
- Neon main theo duyệt, không tạo branch QA/reset tự động. Xác minh process8080/5173,
  chạy node scripts/phase1-demo-readiness.mjs trước ghi; guard
  PHASE1_QA_ALLOW_WRITES=main cho từng script run, prefix[QA], không in secret/token.
- Snapshot cuối review:18 ingredients/48 movements/4 invoices/12 sessions;
  fixture ingredient18 INACTIVE stock8kg. Đây không phải readiness live.
  Không trả tiền hàng loạt phiên, sửa paidAt/ledger hoặc restore main để dựng test.
- Backend cwd backend/restaurant-management: .\mvnw.cmd clean verify.
  Frontend cwd frontend: bun run test, bun run build, bun run lint.
- Chạy app, ghi checklist1–36 và các ca D9/report/race/security/TR-09 bổ sung,
  hai browser realtime/persistence/tablet/normal-reducedmotion. Phân biệt mock,
  real service, HTTP và browser; ghi giới hạn thay vì coi chưa kiểm là PASS.
- Khi có code/QA mới tạo docs/phase_results/phase-4.md, ghi từng checklist,
  số tests/checks/file đổi/tác động DB/reset/backup nếu có/khác biệt spec/chưa xác minh.
  Cập nhật TRACEABILITY/README/frontend README/AGENTS/CLAUDE/docs index đúng thực tế.
- Không tự chạy pg_restore --clean hoặc tạo demo branch từ hướng dẫn backup.
  Không commit/push đến khi tôi yêu cầu.
```
