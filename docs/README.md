# Tài liệu dự án

Cập nhật **23/10/2026**, Asia/Ho_Chi_Minh. **Phase0–4 và các sửa review đã triển khai.**
[Báo cáo Phase4](phase_results/phase-4.md) và [checklist1–36](phase_instructions/phase-4-checklist.md)
cùng [review giao diện Phase4](phase_results/phase-4-review.md) ghi trạng thái mới nhất.
Handoff/prompt/báo cáo cũ mô tả mốc lịch sử, không phải dữ liệu live.

## Thứ tự đọc cho việc tiếp theo

1. [AGENTS](../AGENTS.md) / [CLAUDE](../CLAUDE.md): trạng thái, quy tắc, baseline.
2. [Master Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md): nguồn chính;
   ASP.NET là bản đã bị thay thế, không cập nhật theo tiến độ hiện tại.
3. [Kết quả Phase 4](phase_results/phase-4.md), [review Phase 3](phase_results/phase-3-review.md),
   [TRACEABILITY](TRACEABILITY.md): code hiện có, bằng chứng và phần còn thiếu.
4. [Bàn giao Phase 4](PHASE_4_HANDOFF.md), [hướng dẫn](phase_instructions/phase-4.md),
   [prompt](phase_instructions/phase-4-prompt.md), [checklist](phase_instructions/phase-4-checklist.md).
5. [Review Phase 1](phase_results/phase-1-review.md), [review Phase 2](phase_results/phase-2-review.md),
   [popup](phase_results/phase-2-popup-fix.md): các sửa phải giữ khi hồi quy.

## Tiến độ và bằng chứng

| Phase | Hiện trạng | Tài liệu |
|---|---|---|
| 0 | Nền tảng/JWT/schema/layout, đã sửa review | [Kết quả](phase_results/phase-0.md), [review](phase_results/phase-0-review.md) |
| 1 | Danh mục/định lượng/đặt bàn/mở phiên, giữ cả 7 sửa review | [Kết quả](phase_results/phase-1.md), [review](phase_results/phase-1-review.md) |
| 2 | Gọi món/bếp/tiêu hao/phục vụ/SSE, đã sửa Critical và popup | [Kết quả](phase_results/phase-2.md), [review](phase_results/phase-2-review.md), [popup](phase_results/phase-2-popup-fix.md) |
| 3 | Payment/invoices và kho, đã sửa 3 critical + 6 optional PR #3 | [Kết quả ban đầu](phase_results/phase-3.md), [review mới nhất](phase_results/phase-3-review.md) |
| 4 | Đã code và QA, còn giới hạn nêu trong kết quả | [Kết quả](phase_results/phase-4.md), [Bàn giao](PHASE_4_HANDOFF.md), [hướng dẫn](phase_instructions/phase-4.md), [prompt](phase_instructions/phase-4-prompt.md), [checklist đã ghi bằng chứng](phase_instructions/phase-4-checklist.md) |

Baseline mới nhất: **211 backend tests; 33 frontend tests/97 assertions; hai build/lint PASS**.
Review: tìm tài khoản, báo cáo ngày/tháng/ngày cao nhất, nút khớp tồn; Neon chỉ đọc, không ghi nghiệp vụ.
API/Neon/browser thật và mock Phase4 báo riêng, không cộng số lịch sử Phase1–3.
Chrome/Edge, SSE hai browser, polling và reconnect sau restart đã kiểm; tablet vật lý,
benchmark nhiều user và thực diễn backup/restore chưa nghiệm thu.

## Chạy app và QA

- [README gốc](../README.md): cấu hình, lệnh chạy/test, tài khoản, seed, backup/restore.
- [Frontend README](../frontend/README.md): route/role, query key, UI và proxy SSE.
- `node scripts/phase1-demo-readiness.mjs`: kiểm chỉ đọc trước QA/demo; snapshot trong báo cáo không thay kiểm live.
- Script ghi cần `PHASE1_QA_ALLOW_WRITES=main`, prefix `[QA]`, ghi tác động vào báo cáo; không tự reset.
- Review fixture18 INACTIVE/tồn8kg; Phase4 fixture19 INACTIVE/tồn0kg, món23 DISCONTINUED. Ba phiên QA13–15 đã đóng qua payment; không dùng fixture như NVL demo bình thường.
- `.cache/` chứa output tái tạo; không lưu token, secret, DB credentials trong docs/Git.

## Tài liệu lịch sử

[Bàn giao trước Phase 2](PHASE_2_HANDOFF.md), [trước Phase 3](PHASE_3_HANDOFF.md),
các instruction/prompt Phase 0–3 và báo cáo cũ mô tả đúng mốc của chúng.
Các dòng “chưa triển khai Phase 2/3” trong phần lịch sử không phải trạng thái hiện tại.
Lịch 24/25/26/10 trong master/instructions là kế hoạch gốc; nghiệm thu dựa trên code và bằng chứng.
Không tự mở rộng phạm vi hoặc commit/push khi chưa được yêu cầu.
