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

Phase 0–3 và review đã triển khai. Baseline mới nhất **26 tests / 77 assertions**,
build/lint PASS; xem [review Phase 3](../docs/phase_results/phase-3-review.md).
Review browser có 16 nhóm ca stocktake dùng API mock, normal/reduced motion,
desktop/mobile viewport; không phải QA browser ghi Neon.

| Route | Quyền UI | Hiện trạng |
|---|---|---|
| `/accounts` | OWNER | Quản lý tài khoản |
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
| `/reconciliation` | CASHIER, MANAGER | **Placeholder Phase 4** |
| `/reports` | OWNER | **Placeholder Phase 4**, OWNER landing |

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

## Điểm nối Phase 4

Đọc [bàn giao](../docs/PHASE_4_HANDOFF.md), [hướng dẫn](../docs/phase_instructions/phase-4.md),
[prompt](../docs/phase_instructions/phase-4-prompt.md), [checklist](../docs/phase_instructions/phase-4-checklist.md).
Chỉ triển khai khi được giao riêng; lượt cập nhật tài liệu chưa thay placeholder.

- Thêm api/types và hai lazy pages. Query key riêng có from/to cho reconciliation/preview/summary;
  khối kho dùng API/key hiện có. Giữ shared PageResponse và feedback.
- CASHIER lập đối soát, MANAGER list/chưa xác nhận/confirm; lặp confirm409 refetch.
  Không có sửa/từ chối/xóa hoặc actual được tự coi là tiền hệ thống.
- OWNER report: Statistic + Table, hôm nay giờ Việt Nam → UTC `[startOfDay,nextDay)`;
  revenue/count/methods/top món theo khoảng, kho/cảnh báo hiện tại và10 movements gần nhất.
- Rỗng/loading/lỗi/reload, routeguard, tablet/desktop, keyboard/click-only popup và reduced motion.
  Không thêm chart library/event SSE hoặc business rule frontend.

Lịch sử [review Phase1](../docs/phase_results/phase-1-review.md),
[Phase2](../docs/phase_results/phase-2-review.md), [popup](../docs/phase_results/phase-2-popup-fix.md)
giữ làm nguồn hồi quy. Không cộng các số test cũ thành một lượt kiểm mới.
