# Tài liệu dự án

Mốc bàn giao: Phase 0–2 đã triển khai; cả 7 mục review Phase 1 được bảo toàn.
Ngày cập nhật: 23/10/2026. Bản ghi nghiệm thu là bằng chứng tại ngày chạy, không phải dữ liệu live.

## Đọc theo thứ tự

1. [CLAUDE.md](../CLAUDE.md): trạng thái và quy tắc làm việc.
2. [Master spec Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md): nghiệp vụ,
   phạm vi, 18 bảng, quyền, API và checklist. Bản ASP.NET là tài liệu cũ.
3. [Kết quả Phase 2](phase_results/phase-2.md), [review](phase_results/phase-2-review.md),
   [popup](phase_results/phase-2-popup-fix.md): hiện trạng, bằng chứng và xác nhận test tay của chủ dự án.
4. [Bàn giao Phase 3](PHASE_3_HANDOFF.md), [hướng dẫn](phase_instructions/phase-3.md),
   [prompt](phase_instructions/phase-3-prompt.md): tài liệu chuẩn bị, chưa triển khai Phase 3.
5. [TRACEABILITY](TRACEABILITY.md): phần đã làm và phần còn chờ Phase 3–4.
6. [Bàn giao lịch sử trước Phase 2](PHASE_2_HANDOFF.md), [hướng dẫn](phase_instructions/phase-2.md)
   và [prompt](phase_instructions/phase-2-prompt.md): nguồn yêu cầu của đợt triển khai.

Tài liệu bàn giao/hướng dẫn không thay thế thứ tự ưu tiên của master §0.1.
Không tự thay nghiệp vụ nếu gặp mâu thuẫn; nêu đúng mục và hỏi chủ dự án.

## Trạng thái và bằng chứng

| Giai đoạn | Trạng thái | Báo cáo |
|---|---|---|
| Phase 0 | Nền tảng, auth/JWT, schema, layout và sửa review đã xong | [Kết quả](phase_results/phase-0.md), [review](phase_results/phase-0-review.md) |
| Phase 1 | Danh mục/định lượng, đặt bàn, mở phiên; đã sửa 7 mục review | [Nghiệm thu ban đầu](phase_results/phase-1.md), [sửa review](phase_results/phase-1-review.md) |
| Phase 2 | Đã triển khai, sửa ba Critical và popup; chủ dự án test tay popup thấy ổn | [Kết quả](phase_results/phase-2.md), [review](phase_results/phase-2-review.md), [popup](phase_results/phase-2-popup-fix.md) |
| Phase 3 | Mới chuẩn bị tài liệu, chưa code | [Bàn giao](PHASE_3_HANDOFF.md), [hướng dẫn](phase_instructions/phase-3.md), [prompt](phase_instructions/phase-3-prompt.md) |
| Phase 4 | Chưa triển khai | [Hướng dẫn](phase_instructions/phase-4.md) |

Tiến độ từng FR/BR/TR/NFR: [TRACEABILITY](TRACEABILITY.md).
Lịch trong [phase_instructions](phase_instructions/README.md) là lịch dự kiến;
không suy ra đã hoàn thành chỉ vì đã đến ngày của phase.

## Kiểm thử và chạy app

- Cài đặt, cấu hình local, tài khoản demo và chạy hai phía: [README gốc](../README.md).
- Frontend, query key, UI chung: [frontend README](../frontend/README.md).
- Lệnh kiểm tra sau review, phân biệt API thật/API mock và tác động QA:
  [phase-1-review.md](phase_results/phase-1-review.md).
- Kiểm Phase 2 trên app/Neon thật, race complete và SSE: [phase-2.md](phase_results/phase-2.md).
- Sửa và rà dropdown/Modal/Drawer với normal/reduced motion:
  [phase-2-popup-fix.md](phase_results/phase-2-popup-fix.md), phân biệt 59 kiểm tra mock và 9 kiểm tra thật chỉ đọc.
- Kiểm chỉ đọc trước QA/demo: `node scripts/phase1-demo-readiness.mjs` từ gốc repo.
- Script ghi QA yêu cầu `PHASE1_QA_ALLOW_WRITES=main`; không tự reset.
  Không chạy lại script mở phiên chỉ để kiểm tài liệu: chưa có luồng đóng phiên.

Các quyết định D10, seed độc lập, Neon main/reset và định lượng sau review đã ghi ở
CLAUDE.md, master spec và phần quyết định trong tài liệu bàn giao. Không lưu DB password,
JWT secret hay bearer token vào tài liệu. Log/ảnh/JSON trong `.cache` là output sinh lại;
test và script tái lập nằm trong Git.
