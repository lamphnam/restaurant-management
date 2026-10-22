# Phase instructions

Hướng dẫn làm từng phase cho `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` (§22). Mỗi file `phase-N.md` tự đủ để giao cho agent: đọc những mục spec nào, làm gì, kiểm gì, khi nào xong.

| File | Ngày | Nội dung |
|---|---|---|
| `phase-0.md` | 22/10 tối – 23/10 sáng | Nền tảng: schema, entity, security, login, layout |
| `phase-1.md` | 23/10 | Tài khoản, thực đơn, định lượng, sơ đồ bàn, đặt bàn, mở phiên |
| `phase-2.md` | 24/10 | Gọi món, bếp, tiêu hao, phục vụ, SSE real-time |
| `phase-3.md` | 25/10 | Thanh toán + toàn bộ kho |
| `phase-4.md` | 26/10 | Đối soát, báo cáo, unit test, tài liệu |

Cách dùng: gõ `/phase <N>` (skill `.claude/skills/phase`), hoặc dán nội dung `phase-N.md` cho agent.

Quy tắc chung mọi phase:
- Trước khi code: báo requirement/UC, entity, business rule, file dự kiến, checklist sẽ kiểm (spec §0.2).
- Sau khi code: `.\mvnw.cmd clean verify` và `bun run build` phải sạch; chạy app, kiểm checklist; báo file đã đổi và mọi khác biệt với spec.
- Không thêm bảng/chức năng ngoài spec, không làm lại tính năng đã cắt (§1.3).
- Không tự sang phase sau.
- Giao diện: dùng Ant Design làm nền (không thêm UI lib khác). Plugin `frontend-design` dùng để làm đẹp trong khuôn khổ đó: bố cục, khoảng cách, màu trạng thái nhất quán (§6, §15), tablet-friendly cho Bếp/Phục vụ/Sơ đồ bàn. Không đổi nhãn tiếng Việt hay trạng thái.
