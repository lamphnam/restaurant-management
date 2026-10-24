# Tài liệu dự án

> **Cập nhật 24/10/2026:** triển khai 8 KLTN issues; D5/D8 đã thay thế, có sửa reservation,
> giữ chỗ nguyên liệu lúc Start, hai badge trên bàn và migration V2–V4. Xem [báo cáo implementation](phase_results/kltn-issues-implementation.md).
> Phần Phase 0–4 bên dưới giữ bằng chứng lịch sử ngày23/10. Không chạy QA ghi lên Neon production.


Cập nhật **23/10/2026**, Asia/Ho_Chi_Minh. **Phase 0–4, review giao diện và cả 9 sửa PR #4 đã triển khai.**
Mốc code đã đối chiếu: branch `feat/phase-4-implement`, commit `67e1af2` (đã gồm sửa PR #4);
`1b3699f` là mốc trước sửa. Đây là trạng thái commit local, không xác nhận PR đã merge hoặc push.

Nguồn hiện trạng: [review PR #4](phase_results/phase-4-pr-review.md), [TRACEABILITY](TRACEABILITY.md)
và [master Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md).
[Phase4 ban đầu](phase_results/phase-4.md), [review giao diện](phase_results/phase-4-review.md)
và phần checklist gốc giữ số liệu của từng lượt; không cộng các lượt thành một tổng nghiệm thu.

## Trạng thái mới nhất sau review PR #4

- Đối soát chỉ lập/preview ca đã kết thúc: backend kiểm Clock, trả400 nếu endTime ở tương lai;
  UI mặc định đầu ngày đến phút hiện tại, khóa ngày/giờ tương lai. Confirm khóa dòng, lặp trả409;
  danh sách polling30s, actor JWT và snapshot giữ đúng D9.
- Báo cáo chỉ tính bình quân/ngày và sinh dòng lịch đến hôm nay theo timezone cấu hình;
  tháng hiện tại kết thúc hôm nay, khoảng hoàn toàn tương lai trả 0 ngày/0 bình quân.
  Top10 giới hạn ở SQL; daily methods lấy từ enum, quy tắc không tính tiền dùng chung với subtotal.
- Tìm tài khoản theo tên/SĐT không dấu, lọc vai trò/trạng thái; kiểm kê có nút Khớp tồn hệ thống
  từng dòng, vẫn giữ actual trống/clear/explicit0 và backend tính lại tồn theo D7.
- Schema vẫn 18 bảng, V1/role/status/phạm vi không đổi. Snapshot QA cũ giữ lịch sử;
  lượt kiểm PR #4 không tạo/sửa bản ghi nghiệp vụ.

| Bằng chứng gần nhất (đợt review PR #4) | Kết quả |
|---|---|
| Backend clean verify | 224 tests, 0 failures/errors/skipped; JAR PASS |
| Frontend test/build/lint | 36 tests/111 assertions; build/lint PASS |
| Query probe Neon chỉ đọc | 75 checks; preview1/summary3 SQL; counts giữ nguyên |
| API thật kiểm request bị từ chối | 9 nhóm checks, có guard cho POST; tạo 0 bản ghi |
| App/API/Neon thật chỉ đọc | 13 nhóm checks trên Chrome/Edge; counts/ledger giữ nguyên |
| Browser mock | Mỗi Chrome/Edge: 3 nhóm picker/polling, 30 nhóm UI review, 36 nhóm hồi quy Phase4; báo riêng |

Chi tiết và đường dẫn bằng chứng: [review PR #4](phase_results/phase-4-pr-review.md).
Lượt đồng bộ tài liệu này không chạy lại build/test/QA hoặc ghi Neon; các kết quả trên thuộc đợt kiểm đã ghi.
Chưa nghiệm thu tablet vật lý, benchmark nhiều người dùng hoặc thực diễn backup/restore.

## Thứ tự đọc cho việc tiếp theo

1. [AGENTS](../AGENTS.md) / [CLAUDE](../CLAUDE.md): trạng thái, quy tắc, baseline.
2. [Master Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md): nguồn chính;
   ASP.NET là bản đã bị thay thế, không cập nhật theo tiến độ hiện tại.
3. [Review PR #4](phase_results/phase-4-pr-review.md), [review giao diện](phase_results/phase-4-review.md),
   [Phase4 ban đầu](phase_results/phase-4.md), [TRACEABILITY](TRACEABILITY.md): hiện trạng và bằng chứng theo từng lượt.
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
| 4 | Đã code/QA, sửa 3 critical + 6 optional PR #4; code tại67e1af2 | [Review PR #4](phase_results/phase-4-pr-review.md), [review giao diện](phase_results/phase-4-review.md), [kết quả ban đầu](phase_results/phase-4.md), [checklist](phase_instructions/phase-4-checklist.md) |

Baseline mới nhất: **224 backend tests; 36 frontend tests/111 assertions; hai build/lint PASS**.
Review giao diện và PR #4 đã hoàn tất theo bảng trên; HTTP rejection có guard, không phát sinh bản ghi nghiệp vụ.
API/Neon/browser thật và mock Phase4 báo riêng, không cộng số lịch sử Phase1–3.
Chrome/Edge, SSE hai browser, polling và reconnect sau restart đã kiểm; tablet vật lý,
benchmark nhiều user và thực diễn backup/restore chưa nghiệm thu.

## Chạy app và QA

- [Triển khai Oracle Cloud + Cloudflare + HTTPS](deployment/oracle-cloud.md): guide Ubuntu 22.04/24.04,
  Caddy/systemd, DNS, SSL, script deploy từ Windows và rollback; bổ sung 24/10/2026.
- [README gốc](../README.md): cấu hình, lệnh chạy/test, tài khoản, seed, backup/restore.
- [Frontend README](../frontend/README.md): route/role, query key, UI và proxy SSE.
- `node scripts/phase1-demo-readiness.mjs`: kiểm chỉ đọc trước QA/demo; snapshot trong báo cáo không thay kiểm live.
- Script ghi cần `PHASE1_QA_ALLOW_WRITES=main`, prefix `[QA]`, ghi tác động vào báo cáo; không tự reset.
- Review fixture18 INACTIVE/tồn8kg; Phase4 fixture19 INACTIVE/tồn0kg, món23 DISCONTINUED. Ba phiên QA13–15 đã đóng qua payment; không dùng fixture như NVL demo bình thường.
- Review mới: `phase4-pr-review-browser-check.mjs` mock; `phase4-review-live-readonly.mjs` chỉ đọc thật;
  `phase4-pr-review-api-check.mjs` cần guard dù POST mong đợi bị400. Lệnh chạy lại nằm trong báo cáo PR #4.
- `.cache/` chứa output tái tạo theo môi trường, không được commit; không lưu token, secret, DB credentials trong docs/Git.

## Tài liệu lịch sử

[Bàn giao trước Phase 2](PHASE_2_HANDOFF.md), [trước Phase 3](PHASE_3_HANDOFF.md),
các instruction/prompt Phase 0–3 và báo cáo cũ mô tả đúng mốc của chúng.
Các dòng “chưa triển khai Phase 2/3” trong phần lịch sử không phải trạng thái hiện tại.
Lịch 24/25/26/10 trong master/instructions là kế hoạch gốc; nghiệm thu dựa trên code và bằng chứng.
Không tự mở rộng phạm vi hoặc commit/push khi chưa được yêu cầu.
