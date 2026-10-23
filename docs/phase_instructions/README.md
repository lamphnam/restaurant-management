# Hướng dẫn theo phase

Nguồn chính: [master Spring/React](../../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md), §22.
Cập nhật 23/10/2026: Phase 0–3 đã triển khai và sửa review; Phase 4 mới chuẩn bị.
Ngày dự kiến dưới đây là lịch gốc, không phải ngày bắt buộc chờ mới được triển khai.

| Phase | Lịch gốc | Nội dung | Hiện trạng |
|---|---|---|---|
| [0](phase-0.md) | 22–23/10 | Schema, entity, JWT, login, layout | Đã làm; tài liệu lịch sử |
| [1](phase-1.md) | 23/10 | Tài khoản, thực đơn/định lượng, bàn/đặt bàn/mở phiên | Đã làm, giữ 7 sửa review |
| [2](phase-2.md) | 24/10 | Gọi món, bếp, tiêu hao, phục vụ, SSE | Đã làm, giữ sửa Critical/popup |
| [3](phase-3.md) | 25/10 | Thanh toán, hóa đơn, kho | Đã làm, PR #3 đã sửa 9 mục review |
| [4](phase-4.md) | 26/10 | Đối soát, báo cáo, hồi quy toàn hệ thống, tài liệu/demo | Đã chuẩn bị; chưa code |

## Bộ giao việc Phase 4

- [PHASE_4_HANDOFF](../PHASE_4_HANDOFF.md): baseline 187 backend / 26 frontend tests,
  current code, dữ liệu/snapshot, quy tắc và giới hạn nghiệm thu.
- [Hướng dẫn Phase 4](phase-4.md): requirement, file/entity, API/quyền, D9,
  báo cáo và checklist 33–36/hồi quy.
- [Prompt triển khai](phase-4-prompt.md): chỉ giao khi chủ dự án yêu cầu bắt đầu code.
- [Checklist 1–36](phase-4-checklist.md): mẫu ghi bằng chứng; mọi dòng Phase 4 đang “Chưa chạy”.
- [Review Phase 3](../phase_results/phase-3-review.md) và [TRACEABILITY](../TRACEABILITY.md).

Khi đã được giao triển khai, dùng `/phase 4` hoặc prompt trên. Lượt cập nhật tài liệu
không khởi động phase. Chưa tạo báo cáo `phase_results/phase-4.md` vì chưa có code/bằng chứng.

## Quy tắc chung

- Trước code: báo FR/UC, entity/table, business rule, file dự kiến, checklist (§0.2).
- Giữ đúng 18 bảng, scope/roles/status; không làm lại tính năng đã cắt (§1.3).
- Giữ tất cả thay đổi đang có; không tự reset/stash/ghi đè hoặc commit/push.
- Sau code: backend `clean verify`, frontend `bun run test/build/lint`; chạy app/checklist,
  nêu file đổi, kết quả, giới hạn, tác động QA và khác biệt với spec.
- Sáu mục §21.1 là nhóm test bắt buộc, không phải thay suite hiện tại bằng sáu tests.
- UI giữ Ant Design, shared labels/MoneyText, giờ Việt Nam, reduced-motion fix và role guard.
- Dùng Neon `main` theo duyệt; readiness trước ghi, guard cho từng lượt QA, không reset tự động.

Bàn giao/instruction/prompt Phase 2–3 được giữ làm lịch sử, không dùng như kế hoạch hiện tại.
