# Frontend — Quản lý quán ăn

React + TypeScript + Vite, sử dụng Bun. Các thư viện đã cài: Ant Design,
TanStack Query, React Router, Axios, dayjs, `@microsoft/fetch-event-source`.

```powershell
bun install
bun run dev
```

Mở http://localhost:5173. Vite proxy `/api` tới http://localhost:8080.
Ant Design và dayjs dùng locale tiếng Việt.

```powershell
bun run build
bun run lint
bun run test
bun run preview
```

`build` gồm kiểm tra TypeScript. Commit `bun.lock` để dùng cùng phiên bản
dependencies. Không đưa thông tin kết nối database hoặc JWT secret vào frontend.

Đã có đăng nhập, route guard, menu theo role và bốn trang Phase 1:
`/accounts`, `/menu` (gồm định lượng), `/floor-plan`, `/reservations`.
`/sessions/:id`, `/awaiting-service`, `/kitchen` đã có giao diện Phase 2;
thanh toán, kho đầy đủ, đối soát và báo cáo chờ Phase 3–4.

Mốc sau review Phase 1: build/lint pass, 13 test Bun / 27 assertions.
Mốc Phase 2: build/lint pass, 16 test / 41 assertions; kiểm browser dùng API/Neon thật
và giới hạn tại [báo cáo Phase 2](../docs/phase_results/phase-2.md).
Sau review: 18 test / 47 assertions, build/lint pass; form gọi món dùng tối đa 99 phần/dòng,
50 dòng/đợt. Bằng chứng mới: [review Phase 2](../docs/phase_results/phase-2-review.md).
Đã sửa dropdown lệch khỏi màn hình khi bật giảm chuyển động; 59 kiểm tra popup API mock
và 9 kiểm tra app/API thật chỉ đọc pass. Xem [báo cáo popup](../docs/phase_results/phase-2-popup-fix.md).
Kiểm thử hồi quy modal mở phiên: 7 kiểm tra Chrome headless dùng API mock,
không ghi vào Neon. Xem lệnh chạy trong
[báo cáo review](../docs/phase_results/phase-1-review.md).

## Quy ước đã dùng, cần giữ

- `api/<name>Api.ts`, `types/<name>.ts`, page lazy-load trong `router.tsx`.
  Giữ Ant Design, TanStack Query và Axios hiện có.
- Nhãn/màu từ `utils/labels.ts` + `StatusTag`; tiền dùng `MoneyText`;
  thời gian qua `utils/time.ts` theo `Asia/Ho_Chi_Minh`.
- Dùng `useApiFeedback` cho message/fieldErrors; không ghi đè cơ chế 401/403,
  chống stale 401 và chính sách không retry 4xx trong `api/queryClient.ts`.
- Giảm chuyển động dùng `transition: none`; không đặt duration dương trên mọi thuộc tính
  của mọi phần tử, vì transition left/top làm sai phép đo căn vị trí popup.
- Query key hiện có: `['accounts']`, `['menu-items', filters]`,
  `['menu-items', id, 'recipe']`, `['ingredients']`, `['floor-plan']`,
  `['reservations', filters]`. Phase 2 đã nối `['session', id]`, `['kitchen']`,
  `['awaiting-service']`; số `id` phải cùng kiểu giữa route và event.
- Modal walk-in không tải hoặc chờ đặt bàn; chế độ đặt trước mới gọi query
  có `tableId`, `unexpired=true`, `status=CONFIRMED`. Không quay lại quét cả quán.
- `realtime/useRealtime.ts` gắn một lần trong AppLayout, dùng bearer header,
  cleanup theo token, invalidate toàn bộ live key khi reconnect. Sơ đồ bàn/bếp/
  chờ phục vụ/chi tiết phiên có polling 30 giây và refetch khi focus.
  Thiết kế SSE, quyền từng thao tác và checklist nằm ở
  [hướng dẫn Phase 2](../docs/phase_instructions/phase-2.md).

Bàn giao hiện tại: [PHASE_3_HANDOFF](../docs/PHASE_3_HANDOFF.md),
[hướng dẫn Phase 3](../docs/phase_instructions/phase-3.md),
[prompt](../docs/phase_instructions/phase-3-prompt.md). Chỉ chuẩn bị tài liệu, chưa thay các
placeholder thanh toán/hóa đơn/kho. Đối soát và báo cáo vẫn thuộc Phase 4.
