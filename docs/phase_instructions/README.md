# Phase instructions

Hướng dẫn làm từng phase cho `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` (§22). Mỗi file `phase-N.md` tự đủ để giao cho agent: đọc những mục spec nào, làm gì, kiểm gì, khi nào xong.

| File | Ngày | Nội dung |
|---|---|---|
| `phase-0.md` | 22/10 tối – 23/10 sáng | Nền tảng: schema, entity, security, login, layout |
| `phase-1.md` | 23/10 | Tài khoản, thực đơn, định lượng, sơ đồ bàn, đặt bàn, mở phiên |
| `phase-2.md` | 24/10 | Gọi món, bếp, tiêu hao, phục vụ, SSE real-time |
| `phase-3.md` | 25/10 | Thanh toán + toàn bộ kho |
| `phase-4.md` | 26/10 | Đối soát, báo cáo, unit test, tài liệu |

Cách dùng khi đã quyết định triển khai: gõ `/phase <N>` (skill `.agents/skills/phase`),
hoặc giao prompt tương ứng cho agent.

Mốc hiện tại (23/10/2026): Phase 0–2 đã triển khai; cả 7 mục review Phase 1 được giữ.
Đọc [kết quả Phase 2](../phase_results/phase-2.md) và [TRACEABILITY](../TRACEABILITY.md)
trước việc tiếp theo. Đã có [bàn giao Phase 3](../PHASE_3_HANDOFF.md),
[hướng dẫn](phase-3.md) và [prompt](phase-3-prompt.md); **Phase 3 chưa bắt đầu**,
cần yêu cầu triển khai riêng từ chủ dự án. Các sửa Critical và popup/test tay được ghi ở
[review](../phase_results/phase-2-review.md) và [popup](../phase_results/phase-2-popup-fix.md).
Ngày trong bảng là kế hoạch, không phải bằng chứng nghiệm thu.
Nguồn yêu cầu Phase 2 được giữ trong [bàn giao](../PHASE_2_HANDOFF.md),
[review Phase 1](../phase_results/phase-1-review.md) và [prompt](phase-2-prompt.md).

Quy tắc chung mọi phase:
- Trước khi code: báo requirement/UC, entity, business rule, file dự kiến, checklist sẽ kiểm (spec §0.2).
- Sau khi code: `.\mvnw.cmd clean verify` và `bun run build` phải sạch; chạy app, kiểm checklist; báo file đã đổi và mọi khác biệt với spec.
- Không thêm bảng/chức năng ngoài spec, không làm lại tính năng đã cắt (§1.3).
- Không tự sang phase sau.
- Không commit/push nếu chủ dự án chưa yêu cầu. Chuẩn bị tài liệu không đồng nghĩa đã được yêu cầu bắt đầu code phase tiếp theo.
- Giao diện: dùng Ant Design làm nền (không thêm UI lib khác). Plugin `frontend-design` dùng để làm đẹp trong khuôn khổ đó: bố cục, khoảng cách, màu trạng thái nhất quán (§6, §15), tablet-friendly cho Bếp/Phục vụ/Sơ đồ bàn. Không đổi nhãn tiếng Việt hay trạng thái.
