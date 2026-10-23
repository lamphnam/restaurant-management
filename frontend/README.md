# Frontend — Quản lý quán ăn

React + TypeScript + Vite, dùng **Bun**; Ant Design, TanStack Query, React Router,
Axios, dayjs và @microsoft/fetch-event-source. Không thêm UI/state framework mới.

```powershell
bun install
bun run dev
bun run test
bun run build
bun run lint
bun run preview
```

Vite http://localhost:5173 proxy `/api` → backend8080. Ant Design/dayjs dùng tiếng Việt.
Build gồm type-check. Giữ bun.lock trong Git; không đưa credentials/secret vào frontend.

## Trạng thái 23/10/2026

Phase 0–4 và review đã triển khai. **36 tests / 111 assertions**, build/lint PASS.
Xem [Phase4](../docs/phase_results/phase-4.md) cho mock và app/API/Neon thật tách riêng.
[Review giao diện](../docs/phase_results/phase-4-review.md): tìm tài khoản, báo cáo ngày/tháng và nút khớp tồn.
[Review PR #4](../docs/phase_results/phase-4-pr-review.md): chặn ca tương lai, bình quân đến hôm nay và polling đối soát.
Chrome/Edge và tablet viewport đã kiểm; chưa kiểm tablet vật lý.

| Route | Quyền UI | Hiện trạng |
|---|---|---|
| `/accounts` | OWNER | Tìm tên/SĐT không dấu; lọc vai trò/trạng thái; quản lý tài khoản |
| `/menu` | OWNER, HEAD_CHEF | Thực đơn/định lượng, thao tác theo role |
| `/floor-plan` | WAITER, MANAGER, CASHIER, OWNER | Sơ đồ bàn/mở phiên đúng quyền |
| `/reservations` | MANAGER, WAITER, OWNER | Đặt bàn/tra cứu, thao tác theo role |
| `/sessions/:id` | WAITER, MANAGER | Chi tiết/gọi món; CASHIER dùng payment riêng |
| `/kitchen` | KITCHEN_STAFF, HEAD_CHEF | Queue/trạng thái món |
| `/awaiting-service` | WAITER | Món chờ phục vụ |
| `/payment` | CASHIER | Danh sách/preview/payment |
| `/invoices` | CASHIER, MANAGER, OWNER | Lịch sử hóa đơn |
| `/inventory` | OWNER, HEAD_CHEF | Tồn/danh mục/lô/biến động, thao tác theo role |
| `/inventory/receipts`, `/inventory/stocktake` | HEAD_CHEF | Nhập/kiểm kê |
| `/reconciliation` | CASHIER, MANAGER | Lập/preview/list/confirm theo role |
| `/reports` | OWNER | Doanh thu + kho hiện tại, OWNER landing |

UI role guard không thay backend authorization. Không mở lại `/sessions/:id` cho CASHIER.

## Quy ước cần giữ

- api/types theo domain, page lazy trong router.tsx, navigation/landing ở auth/roles.ts.
- labels.ts + StatusTag, tiền qua MoneyText, time.ts theo Asia/Ho_Chi_Minh.
- useApiFeedback cho message/fieldErrors; giữ cơ chế stale401/403 và không retry4xx.
- PageResponse chỉ có một định nghĩa trong types/tables.ts; inventoryApi không import type từ paymentApi.
- Giảm chuyển động dùng `transition: none`; không duration dương global trên left/top popup.
- Recipe giữ dòng inactive đã có; lookup có status filter. Walk-in độc lập query reservation;
  picker đặt trước dùng tableId/unexpired=true/status=CONFIRMED phía server.
- Stocktake actual ban đầu trống, chỉ gửi dòng đã đếm. Xóa ô bỏ dòng, 0 chỉ gửi khi nhập0.
  Ghi chú đơn thuần không đánh dấu đã đếm; server tính lại systemQuantity, UI chỉ tính tạm.
  Nút Khớp tồn hệ thống từng dòng điền số đang hiển thị sau thao tác người dùng; không sao chép tồn âm.
- Payment không gửi amount; pending/cooking chặn, READY/0đ hợp lệ. Invoice/stock nghiệp vụ ở backend.

## Query keys và realtime

| Nhóm | Prefix hiện có |
|---|---|
| Danh mục | `['accounts']`, `['menu-items']`, `['ingredients']` (recipe lookup) |
| Bán hàng live | `['floor-plan']`, `['reservations']`, `['session', numericId]`, `['kitchen']`, `['awaiting-service']` |
| Thanh toán/lịch sử | `['payment','open-sessions']`, `['payment','preview',id]`, `['invoices',filters]` |
| Kho | `['inventory','ingredients',filters]`, `ingredients-active`, `ingredients-lookup`, `lots-attention`, `movements`, `receipts-list`, `stocktakes-list`, `stocktake-template` dưới prefix inventory |

FLOOR_PLAN invalidate floor-plan/payment/session/awaiting-service. ORDER invalidate
kitchen/session/awaiting-service/payment; RESERVATION invalidate reservations/floor-plan.
useRealtime gắn một lần trong AppLayout, bearer header, cleanup theo token,
invalidate toàn bộ live prefixes khi reconnect. Live screens polling30s/focus;
kho không có SSE. Mutation kho invalidate prefix inventory; payment invalidate các key liên quan.

## Đối soát và báo cáo Phase 4

- `reconciliationApi` dùng PageResponse chung; `paymentApi.summary` cho OWNER.
- CASHIER actual ban đầu trống, nhập0 được; đổi khoảng xóa actual/reason đang nhập.
  Preview/submit dùng giờ Việt Nam→UTC; server tính lại khi POST, không nhận tổng/audit.
  Khoảng mặc định từ đầu ngày đến phút hiện tại; picker khóa ngày/giờ tương lai, backend kiểm Clock.
- MANAGER mặc định lọc chưa xác nhận; Popconfirm, loading/disable; 409 báo lỗi/refetch.
  Chi tiết mở rộng gồm người lập/quản lý/reason/thời điểm. Không sửa/từ chối/xóa.
  Danh sách polling30s, không cần SSE event mới.
- `['reconciliations',{filter,page,size}]`, `['reconciliation-preview',{from,to}]`,
  `['payment-summary',{from,to}]`. Create/confirm invalidate list và preview.
- OWNER report dùng Statistic/Table; ngày mặc định hôm nay tại Việt Nam, UTC `[start,nextDay)`.
  Có chọn tháng/7 ngày, bảng ngày gồm ngày 0đ, ngày cao nhất (kể cả đồng hạng), bình quân do backend tính.
  Tháng hiện tại chỉ đến hôm nay; calendarDays từ backend loại ngày chưa tới, khoảng hoàn toàn tương lai có0 ngày.
  Top món tối đa10 dòng, giới hạn bởi query backend.
  Pickers giữ ngày lịch thông thường để tránh `endOf` của đối tượng timezone bị ảnh hưởng DST trình duyệt.
  `dailyRevenue` thưa; `reportDays` chỉ tạo dòng cho trang lịch đang xem, không cấp phát toàn kỳ dài.
  Khối kho dùng prefix inventory và API cũ, không phụ thuộc kỳ doanh thu; 10 movements mới nhất.
- `dev/sseProxy.ts` trong Vite config đóng downstream khi `/api/events` upstream bị ngắt,
  giúp fetch-event-source retry. Không thay hook/executor/polling30s hoặc CSS reduced motion.
  Kiểm HTTP cục bộ: `node scripts/phase4-proxy-check.mjs` từ repo root theo báo cáo.

[Báo cáo Phase4](../docs/phase_results/phase-4.md),
[checklist](../docs/phase_instructions/phase-4-checklist.md) ghi phạm vi kiểm và cách chạy lại.
Giữ các nguồn hồi quy [Phase1](../docs/phase_results/phase-1-review.md),
[Phase2](../docs/phase_results/phase-2-review.md), [popup](../docs/phase_results/phase-2-popup-fix.md).
