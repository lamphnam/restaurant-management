# Tài liệu dự án

Cập nhật **23/10/2026**, Asia/Ho_Chi_Minh. **Phase 0–3 và sửa review đã có trong code;
Phase 4 đã chuẩn bị, chưa triển khai.** Tài liệu lịch sử giữ bằng chứng tại ngày chạy,
không phải dữ liệu live hoặc chỉ dẫn triển khai lại phase cũ.

## Thứ tự đọc cho việc tiếp theo

1. [AGENTS](../AGENTS.md) / [CLAUDE](../CLAUDE.md): trạng thái, quy tắc, baseline.
2. [Master Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md): nguồn chính;
   ASP.NET là bản đã bị thay thế, không cập nhật theo tiến độ hiện tại.
3. [Review Phase 3](phase_results/phase-3-review.md), [kết quả ban đầu](phase_results/phase-3.md),
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
| 4 | Đã chuẩn bị tài liệu, chưa code/QA | [Bàn giao](PHASE_4_HANDOFF.md), [hướng dẫn](phase_instructions/phase-4.md), [prompt](phase_instructions/phase-4-prompt.md), [checklist chưa chạy](phase_instructions/phase-4-checklist.md) |

Baseline gần nhất: **187 backend tests; 26 frontend tests / 77 assertions; hai build/lint PASS**.
Review PR #3 có 16 nhóm ca browser mock, 10 checks Neon chỉ đọc và 22 checks service/transaction thật.
111 live API checks là lượt triển khai Phase 3 trước review, không cộng vào lượt mới.
FR-10/FR-17, kiểm toàn bộ 1–36, Edge và thực diễn backup/restore còn cần bằng chứng Phase 4.

## Chạy app và QA

- [Triển khai Oracle Cloud + Cloudflare + HTTPS](deployment/oracle-cloud.md): guide Ubuntu 22.04/24.04,
  Caddy/systemd, DNS, SSL, script deploy từ Windows và rollback; bổ sung 24/10/2026.
- [README gốc](../README.md): cấu hình, lệnh chạy/test, tài khoản, seed, backup/restore.
- [Frontend README](../frontend/README.md): route/role, query key, shared UI và điểm nối Phase 4.
- `node scripts/phase1-demo-readiness.mjs`: kiểm chỉ đọc trước QA/demo; snapshot trong báo cáo không thay kiểm live.
- Script ghi cần `PHASE1_QA_ALLOW_WRITES=main`, prefix `[QA]`, ghi tác động vào báo cáo; không tự reset.
- Review fixture ID 18 hiện INACTIVE, tồn 8 kg; không dùng nó như NVL demo nghiệp vụ bình thường.
- `.cache/` chứa output tái tạo; không lưu token, secret, DB credentials trong docs/Git.

## Tài liệu lịch sử

[Bàn giao trước Phase 2](PHASE_2_HANDOFF.md), [trước Phase 3](PHASE_3_HANDOFF.md),
các instruction/prompt Phase 0–3 và báo cáo cũ mô tả đúng mốc của chúng.
Các dòng “chưa triển khai Phase 2/3” trong phần lịch sử không phải trạng thái hiện tại.
Lịch 24/25/26/10 trong master/instructions là kế hoạch gốc; nghiệm thu dựa trên code và bằng chứng.
Không tự code Phase 4 hoặc commit/push chỉ vì tài liệu đã chuẩn bị xong.
