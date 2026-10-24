---
name: phase
description: Triển khai một phase của KLTN theo spec. Dùng khi người dùng gõ /phase <N> (N = 0–4) hoặc yêu cầu làm phase tiếp theo.
---

Triển khai Phase $ARGUMENTS của dự án.

1. Đọc `docs/phase_instructions/phase-$ARGUMENTS.md` và các mục của `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` mà file đó chỉ định (đọc cả Phụ lục A khi cần tên code).
2. Trước khi code, báo ngắn gọn: requirement/UC, entity/table, business rule, file dự kiến, mục checklist sẽ kiểm (spec §0.2).
3. Code đúng ERD (§7) và API contract (§13); Controller → Service → ServiceImpl → Repository; DTO là `record`; phân quyền ở backend; transaction + khóa dòng theo §16.3; phát event real-time sau commit. Không thêm bảng/chức năng ngoài spec, không làm lại tính năng đã cắt (§1.3).
4. Sau khi code: chạy `.\mvnw.cmd clean verify` (trong `backend/`) và `bun run build` (trong `frontend/`); chạy app và kiểm các mục checklist của phase; báo file đã đổi, UC đã xong, mọi khác biệt với spec.
5. Không tự bắt đầu phase tiếp theo.

Nếu `$ARGUMENTS` trống hoặc không phải 0–4, hỏi người dùng muốn làm phase nào.
