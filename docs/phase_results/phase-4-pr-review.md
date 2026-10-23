# Sửa review PR #4 — đối soát và báo cáo

Thực hiện **23/10/2026**, Asia/Ho_Chi_Minh, theo 3 critical và 6 optional trong review của chủ dự án.
Baseline thực tế: branch `feat/phase-4-implement`, HEAD `1b3699f`, working tree sạch trước sửa.
Không reset/stash/discard, không commit/push. Tiếp tục áp dụng skill `phase`, master Spring/React và AGENTS/CLAUDE.

Phạm vi: FR-10/UC11.2, FR-17/UC6.1 và quy tắc tính tiền dùng chung với UC11.1.
Giữ D9 `[startTime,endTime)`, Invoice-only revenue, actor JWT, Clock, khóa confirm/409,
đúng18 bảng, V1, role/status và toàn bộ sửa review Phase1–3.

## Kết quả từng mục

| # | Sửa | Bằng chứng mới |
|---|---|---|
| 1 critical | `ReconciliationServiceImpl.preview/create` kiểm endTime bằng Clock; tương lai trả400 INVALID_INPUT với thông báo đúng review, không kẹp khoảng. Create dùng cùng một Instant cho guard và reconciledAt | Unit: tương lai1ns/1µs/1h bị chặn trước query/save; end==now vẫn hợp lệ; HTTP thật preview/create400 |
| 2 critical | Mặc định đầu ngày đến phút hiện tại theo giờ Việt Nam; picker khóa ngày/giờ/phút tương lai. Khoảng rỗng không gọi preview/lập, có thông báo | Unit helpers; Chrome/Edge mock với browser America/New_York kiểm giá trị gửi và DOM disabled; CASHIER preview thật200 |
| 3 critical | CalendarDays dừng ở min(ngày cuối exclusive, hôm nay theo Clock/timezone). Khoảng hoàn toàn tương lai, kể cả giờ chưa tới trong hôm nay:0 ngày/0 bình quân. Tháng hiện tại chỉ đến hôm nay; không sinh dòng lịch tương lai | Unit tháng đang chạy/quá khứ/nhuận/múi giờ; SQL/API thật; mock ngày23/10 dừng ở23 ngày, không có24–31 |
| 4 optional | Tổng do server tính vượt NUMERIC(14,0) báo “Doanh thu hệ thống vượt giới hạn lưu trữ, vui lòng chia nhỏ khoảng thời gian” | Unit kiểm đúng message/INVALID_INPUT và không save; không tạo hóa đơn khổng lồ trên Neon |
| 5 optional | Bỏ kiểm actual/reason lặp ở service. Giữ validation request tại DTO/controller; service chỉ giữ guard nghiệp vụ/tổng hệ thống | Unit Validator; HTTP thật JSON100.0 và reason501 bị400, đúng fieldErrors |
| 6 optional | Daily query nhận cash/bankTransfer qua parameter từ `PaymentMethod.*.name()` | Native record projection thật trên Neon khớp JDBC nhóm lại bằng Java |
| 7 optional | `OrderItemStatus.NON_BILLABLE` immutable dùng chung cho subtotal và query top | Unit cả6 trạng thái, giữ READY/SERVED/PENDING/COOKING; SQL so snapshot độc lập |
| 8 optional | Top query nhận Pageable, summary lấy top10 tại SQL; thay EXISTS bằng join Invoice qua session (unique invoice/session), giữ sort quantity DESC/id ASC | Probe thật kiểm limit1, offset1/thứ tự và top10 so SQL độc lập; summary vẫn3 SQL |
| 9 optional | Danh sách đối soát polling30s cho CASHIER/MANAGER, không thêm SSE event | Chrome29961ms, Edge29963ms: dòng pending mới tự xuất hiện, không click, SSE bị chặn; API dùng mock |

Controller contract không thêm tham số public; N được truyền bằng Pageable ở repository, summary mặc định10.
`listInvoices` vẫn dùng `<=to`; các aggregate vẫn dùng `<to`. D7, stocktake blank/clear/zero và nút khớp tồn giữ nguyên.
Frontend pickers giữ ngày/giờ wall-clock thông thường để tránh hồi quy DST của đối tượng timezone.

## Kiểm chứng thực hiện

| Phạm vi | Kết quả | Bằng chứng gitignored |
|---|---|---|
| Backend Java21 `clean verify` | **224 tests**, 0 failures/errors/skipped, JAR PASS | `.cache/phase4-pr-review-clean-verify.log`, `target/surefire-reports/` |
| Frontend `bun run test` | **36 tests / 111 assertions**, 0 fail | output Bun |
| Frontend build/lint | **PASS / PASS**, gồm type-check | output Vite/oxlint |
| Neon query probe chỉ đọc | **75 checks**, before/after counts giống nhau | `.cache/phase4-pr-review-query-probe.log` |
| API thật cho review | **9 nhóm checks**, gồm request POST/PREVIEW bị từ chối; tạo0 bản ghi | `.cache/phase4-pr-review-api/results.json`, `.cache/phase4-pr-review-api.log` |
| Browser/API/Neon thật chỉ đọc | **13 nhóm checks**, Chrome + Edge, có thêm CASHIER default preview; counts/ledger giữ nguyên | `.cache/phase4-review-live-readonly/results.json`, PNG; `.cache/phase4-pr-review-live-readonly.log` |
| Picker/polling mock chuyên biệt | **3 nhóm checks mỗi Chrome/Edge**, có30s chờ thật, không page error/unexpected endpoint | `.cache/phase4-pr-review-browser-{chrome,msedge}/results.json`, PNG |
| Hồi quy UI review mock | **30 nhóm checks mỗi Chrome/Edge**, 1440/768/375px, normal/reduced motion, 0 page errors | `.cache/phase4-review-browser-{chrome,msedge}/results.json`, `.cache/phase4-pr-review-ui-*.log` |
| Hồi quy đối soát/report mock | **36 nhóm checks mỗi Chrome/Edge**, bổ sung assert default payload kết thúc ở hiện tại | `.cache/phase4-browser-{chrome,msedge}/results.json`, `.cache/phase4-pr-review-regression-*.log` |
| Script QA ghi toàn bộ Phase4 | Chỉ cập nhật cửa sổ ca đã kết thúc và top10; **syntax check**, không chạy lại chuỗi ghi | `node --check scripts/phase4-api-check.mjs` |

Không cộng số checks giữa các lượt/probe hoặc coi nhóm checks là số request độc lập.
Backend tăng từ211 lên224; bỏ4 ca kiểm actual/reason ở service vì chuyển trách nhiệm về DTO,
thêm6 ca tương lai ở preview/create, 4 ca calendar/Clock, 6 ca subtotal và1 giá trị DTO decimal100.0.
Frontend thêm3 tests (14 assertions) cho mặc định/disabled time và tháng hiện tại.

Query probe so native daily projection với từng Invoice JDBC rồi nhóm bằng Java tại
Asia/Ho_Chi_Minh và America/Los_Angeles; biên paidAt thật vẫn inclusive start/exclusive end.
Preview revenue1 SQL, summary3; invoices/reconciliations/movements tối đa2 SQL/trang,
receipts/stocktakes tối đa3 ở fixture hiện tại. Query count không phải benchmark tải.

Mock polling chặn toàn bộ `/api/`, kể cả writes. Dòng mới được thêm vào fixture rồi chờ
timer thực30s; không coi đó là việc CASHIER đã ghi một đối soát thật lên Neon.
Mock/report dùng ngày cố định23/10/2026, browser timezone America/New_York.
Live read-only dùng đăng nhập/API thật, chặn mutation UI ngoài login; không lưu phiếu hoặc khóa tài khoản.

## Tác động Neon và app

- Readiness chạy trước API kiểm request bị từ chối; log `.cache/phase4-pr-review-readiness.log`.
  Script này có POST nên vẫn bắt buộc `PHASE1_QA_ALLOW_WRITES=main`, dù kết quả mong đợi là400.
  GET future preview được kiểm trước POST; test data có prefix `[QA]`. Không reset hoặc cleanup tự động.
- Các POST tương lai/decimal/reason quá dài đều400. Danh sách và snapshot đối soát trước/sau
  giống nhau; row counts/ledger giống nhau. **Không tạo/sửa bản ghi nghiệp vụ trong lượt này.**
- Counts của probe: account9, reservation18, service_session15, food_order22, order_item30,
  invoice8, revenue_reconciliation3, ingredient19, ingredient_lot8, stock_receipt10,
  stock_receipt_item23, stocktake24, stocktake_item33, stock_movement66. Đúng18 bảng domain.
- Snapshot đối soát QA cũ có khung tương lai vẫn là lịch sử của lượt QA trước; **không sửa lại
  khoảng hoặc snapshot đã lập/xác nhận**. Guard mới áp dụng preview/lập mới; confirm vẫn giữ409 khi lặp.
- Backend do phiên làm việc mở được build/restart, PID cuối8144/cổng8080, seed=false.
  Frontend PID7784/cổng5173 có sẵn giữ nguyên. Không thay config secrets hoặc schema.
- Doanh thu demo tháng10 tại thời điểm kiểm:531.058đ/8 hóa đơn,23 ngày lịch đến hôm nay,
  bình quân23.089đ/ngày. Đây là dữ liệu QA/demo, không phải số kinh doanh thực.

## Chạy lại và giới hạn

Sau khi backend/frontend đã chạy, từ repo root:

```powershell
node scripts/phase4-pr-review-browser-check.mjs
$env:BROWSER_CHANNEL='msedge'
node scripts/phase4-pr-review-browser-check.mjs
Remove-Item Env:BROWSER_CHANNEL
node scripts/phase4-review-live-readonly.mjs
node scripts/phase1-demo-readiness.mjs
$env:PHASE1_QA_ALLOW_WRITES='main'
node scripts/phase4-pr-review-api-check.mjs
Remove-Item Env:PHASE1_QA_ALLOW_WRITES
```

Query probe: `PhaseFourQueryProbe.java`, seed=false, **không `--writes`**, cùng classpath như Phase4.
Giữ chính sách/guard/readiness cho các script ghi cũ. Script Phase4 API đã đổi để đóng cửa sổ
trước mỗi đối soát; preview trước và sau payment thuộc hai khoảng đã kết thúc khác nhau,
không gọi đó là kiểm stale preview cùng một khoảng. Unit vẫn kiểm POST tự aggregate lại.

Chưa chạy lại toàn bộ nghiệp vụ ghi checklist1–36, live confirmation race/held-lock hoặc seed
trong lượt này; xem [Phase4 ban đầu](phase-4.md) cho bằng chứng lịch sử. Chưa kiểm thiết bị tablet
vật lý, tải nhiều người dùng hoặc thực diễn backup/restore. Không tạo Invoice giả/đổi paidAt
hoặc dữ liệu rất lớn trên Neon để thử overflow; ca đó được kiểm bằng unit.

File chính: hai ServiceImpl đối soát/payment, InvoiceRepository/OrderItemRepository,
OrderItem/OrderItemStatus, ReconciliationPage/ReportsPage/DailyRevenueSection,
reconciliationTime/reportDays, tests và các script QA; master/README/AGENTS/CLAUDE/TRACEABILITY đã cập nhật.
