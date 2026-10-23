# Phase 4 — Đối soát, báo cáo và hoàn thiện

**Bổ sung sau review người dùng:** xem [phase-4-review.md](phase-4-review.md) cho tìm tài khoản,
báo cáo ngày/tháng và nút khớp tồn. Contract/số tests/SQL bên dưới là mốc nghiệm thu ban đầu;
review mới nâng summary từ 2 lên 3 SQL, backend211 và frontend33/97, không ghi Neon.
Các sửa review PR #4 tiếp theo được ghi tại [phase-4-pr-review.md](phase-4-pr-review.md).

Thực hiện **23/10/2026**, Asia/Ho_Chi_Minh. Yêu cầu của chủ dự án cho phép bắt đầu
code, QA trên Neon main và cập nhật tài liệu; không commit/push.
Git thực tế lúc bắt đầu: `feat/phase-4-implement`, HEAD
`28bd527f955734cf9c835e96c21cceb19d57cc8b`, working tree sạch. Mốc
`feat/phase-3-implement/72d1bdc` trong bàn giao là lịch sử, không phải HEAD lúc chạy.
Không reset/stash/discard hoặc đổi branch.

## 1. Phạm vi và kết quả hiện thực

**FR-10/UC11.2, FR-17/UC6.1, BR-05/08/09**, giữ FR-16; hồi quy checklist 1–36,
TR-09 và các NFR về quyền, dữ liệu, realtime, giao diện.

- `PaymentController` dùng `ReconciliationService` interface/impl cho preview,
  lập, danh sách và xác nhận; DTO record, mapper tay. Giữ đúng quyền §13.9.
- Doanh thu chỉ từ `Invoice.amount`, lọc `paidAt >= from AND paidAt < to`.
  Một query GROUP BY phương thức cho count/tiền; phương thức vắng trả 0, hóa đơn
  0đ vẫn tăng count. Không đổi bộ lọc lịch sử hóa đơn `<=to` của Phase 3.
- POST đối soát gọi lại aggregate lúc lưu; không dùng kết quả preview, không nhận
  tổng/actor của client. `cashier` từ CurrentUser/JWT; `reconciledAt` từ Clock;
  manager null. Actual 0 hợp lệ, không âm, số nguyên tối đa 14 chữ số; reason
  optional ≤500. Aggregate vượt NUMERIC(14,0) bị từ chối, không làm tròn.
- Confirm lấy pessimistic lock trên RevenueReconciliation trước khi gọi
  `confirm(actor)`. Chỉ gán manager; giữ nguyên thời điểm lập và snapshot.
  Lặp hoặc request thua race trả **409 INVALID_STATE** theo ngoại lệ §12.18.
  Không thêm status, thời điểm xác nhận, sửa/từ chối/xóa hoặc chặn ca chồng nhau.
- Summary mở rộng PaymentService; top món dùng SUM quantity và giá snapshot,
  loại CANCELLED/UNAVAILABLE, giữ READY, chỉ các phiên có Invoice trong kỳ.
  Query top độc lập với tổng Invoice; không nhân tổng tiền bởi số chi tiết.
  Summary dùng một transaction read-only REPEATABLE_READ cho hai aggregate.
- Hai lazy pages thay placeholder. CASHIER để actual trống, chọn giờ Việt Nam,
  preview, nhập actual/reason và Popconfirm; sau lưu hiển thị snapshot server.
  MANAGER mặc định xem chưa xác nhận, có chi tiết và confirm; 409 báo lỗi/refetch.
  OWNER landing `/reports`, ngày mặc định hôm nay Việt Nam, gửi UTC
  `[startOfDay,nextDay)`. Statistic/Table gồm doanh thu/count/phương thức/top món;
  khối kho gọi API cũ, ghi rõ dữ liệu kho hiện tại và 10 movements mới nhất.
- Giữ các sửa review Phase 1–3, IngredientService không được khôi phục, không đổi
  V1/schema/role/status. Không thêm dependency, bảng hoặc SSE event.

## 2. Contract thực tế

Base `/api`; Instant ISO UTC, tiền VND, page `{items,page,size,total}`.

| API | Quyền | Kết quả |
|---|---|---|
| GET `/reconciliations/preview?from&to` | CASHIER | `{from,to,invoiceCount,systemRevenue,methods:[{paymentMethod,invoiceCount,revenue}]}`; methods luôn có CASH/BANK_TRANSFER |
| POST `/reconciliations` | CASHIER | `{startTime,endTime,actualAmount,differenceReason?}` → ReconciliationResponse |
| GET `/reconciliations?confirmed&page&size` | CASHIER, MANAGER | confirmed optional; không lọc riêng cashier; mới nhất theo reconciledAt/id DESC; page mặc định 0/20, size 1–100 |
| PATCH `/reconciliations/{id}/confirm` | MANAGER | ReconciliationResponse; thiếu 404, đã xác nhận 409 |
| GET `/payments/summary?from&to` | OWNER | `{revenue:RevenueSummaryResponse,topItems:[{menuItemId,menuItemName,quantity,revenue}]}` |

ReconciliationResponse gồm id, cashierId/Name, managerId/Name nullable, start/end,
systemRevenue, actualAmount, difference, differenceReason, reconciledAt, confirmed.
`confirmed` suy từ manager khác null. Top sắp quantity DESC, menuItemId ASC khi bằng
nhau; UI phân trang 10 dòng. `from < to` bắt buộc. Các field server giả mạo trong
request không được dùng. Không mở quyền OWNER vào đối soát hoặc CASHIER/MANAGER
vào summary.

## 3. Kiểm chứng trong lượt này

Không cộng lượt chỉ đọc, lượt transaction và các báo cáo cũ thành một tổng nghiệm thu.

| Phạm vi | Kết quả mới | Bằng chứng tái tạo, gitignored |
|---|---|---|
| Backend Java 21 `clean verify` | **206 tests**, 0 failures/errors/skipped; JAR build PASS; giữ baseline 187, thêm 19 ca | `backend/restaurant-management/target/surefire-reports/` |
| Frontend `bun run test` | **27 tests / 79 assertions**, 0 fail | output Bun; thêm ca biên ngày Việt Nam |
| Frontend build/lint | **PASS / PASS**, gồm type-check sau sửa proxy | Vite production output, oxlint |
| Neon query probe chỉ đọc trước QA | **39 checks**, trước/sau row counts giống nhau | `.cache/phase4-query-probe.log` |
| REST/API + Neon thật | **152 assertions/request checks** qua một chuỗi được tiếp tục sau hai lỗi assertion của script; không phải 152 request nghiệp vụ ghi | `.cache/phase4-api/results.json` và các `interrupted-*.json` |
| Neon query/transaction probe sau API/browser | **60 checks** của riêng lượt này, gồm query checks chạy lại và 9 ca khóa/fixture | `.cache/phase4-transaction-probe.log` |
| UI Phase 4 mock, Chrome | **36 checks**, 1024/375px × normal/reduced motion, 0 page errors | `.cache/phase4-browser-chrome/results.json`, PNG |
| UI Phase 4 mock, Edge | **36 checks**, cùng cấu hình; 0 page errors | `.cache/phase4-browser-msedge/results.json`, PNG |
| UI/app/API/Neon thật, Chrome + Edge riêng biệt | **32 ghi nhận checks** trong chuỗi tiếp tục cùng fixture; 12 kiểm login/guard được chạy lại sau gián đoạn, không phải 32 kịch bản độc lập | `.cache/phase4-live-browser/results.json`, PNG, interrupted log |
| SSE reconnect sau restart thật | PASS: 2 stream responses, REST tự refetch; trước/sau ledger và counts giống nhau, không reload browser | `.cache/phase4-reconnect/results.json` |
| Proxy HTTP cục bộ thật | **5 assertions**: REST, SSE ban đầu, đóng stream bị ngắt, kết nối lại, REST sau đó | `node scripts/phase4-proxy-check.mjs` |
| Hồi quy form kiểm kê mock | **16 scenarios**, blank/count-only/clear/explicit0, không page error | `.cache/phase3-review/browser-results.json` |
| Form kiểm kê app/API/Neon thật | **3 checks**, blank/clear/count-only/explicit0, reset; không movement khi diff0 | `.cache/phase4-stocktake-ui/results.json`, stocktake #24 |
| Hồi quy picker/walk-in mock | **7 checks**, pending/error/paging >100, không page error | `.cache/phase1-review/browser-results.json` |
| Hồi quy popup mock | **59 checks**, 1440/768px normal/reduced motion | `.cache/popup-qa/results.json` |

Các unit mới kiểm tổng/count/empty/methods, khoảng sai/null, top không thay tổng
Invoice, giữ READY trong nhóm được tính, actual/reason/precision, aggregate overflow,
preview cũ và POST tính lại, actor/Clock/snapshot, thứ tự lock, 404/409, list/page,
validation và JWT thật trong MockMvc đủ 6 role × 5 endpoint +401. SQL biên thời gian
được kiểm trên Neon thật: với mỗi paidAt sẵn có, cửa sổ 1 microsecond bắt đầu đúng
paidAt có hóa đơn, cửa sổ kết thúc đúng paidAt loại hóa đơn. Không sửa paidAt hoặc
tạo Invoice bằng SQL để giả lập biên.

Browser mock chặn toàn bộ `/api/`, kể cả POST/PATCH: không chứng minh transaction
Neon. Ca stale preview/409 UI dùng fixture; recompute/confirm race có REST/DB thật
riêng. Login/guard thật dùng cả 6 tài khoản demo. Tablet là **viewport mô phỏng**,
không phải thiết bị vật lý. Không benchmark tải nhiều người dùng.

### Số query thực tế, sau khi có dữ liệu đối soát

| Workflow | Số statements |
|---|---:|
| Revenue preview | 1 |
| Summary (revenue + top) | 2 |
| Reconciliations size 1 / 50 | 2 / 1 |
| Invoices size 1 / 50 | 2 / 1 |
| Movements size 1 / 50 | 2 / 2 |
| Receipts size 1 / 50 | 3 / 2 |
| Stocktakes size 1 / 50 | 3 / 2 |

Page không đầy có thể không chạy count. Không phát hiện N+1; list đối soát fetch
to-one cashier/manager, không phân trang collection fetch join. Counts của các list
được đo ở dữ liệu lúc probe, không là cam kết benchmark.

### Khóa và realtime thật

- HTTP confirm song song trên đối soát #1: một 200, một 409. Probe giữ transaction
  xác nhận #2 mở: request thứ hai chưa xong sau 500ms; chỉ sau commit mới đọc manager
  và trả INVALID_STATE. Snapshot và reconciledAt giữ nguyên.
- Kiểm kê cùng NVL #19: A đếm 8 từ tồn 10 giữ khóa; B chờ, sau commit đọc 8,
  difference 0. Disposal 3 từ tồn 8 giữ khóa; stocktake chờ rồi đọc 5, đếm 8 → +3.
  Probe dùng authentication nội bộ cho service, không thay thế kiểm quyền HTTP;
  không dùng JWT giả cho seeder.
- Browser Chrome phục vụ và Edge bếp, không F5: mở bàn → sơ đồ tab khác **513ms**;
  gọi → bếp **233ms**; complete → phục vụ **317ms**; payment → trả bàn và xóa
  awaiting-service **206ms**, đo sau HTTP response. Không coi đây là load benchmark.
- Chặn riêng SSE của bếp, giữ REST: món gọi thêm xuất hiện qua polling sau **18.266s**
  (nằm trong chu kỳ 30s). Mô phỏng offline nhanh không đủ chứng minh stream cũ đóng,
  không đánh PASS reconnect từ phép thử đó. Kiểm restart thật sau bản sửa bên dưới
  đã chứng minh reconnect và invalidation; file trước sửa giữ riêng.

## 4. Lỗi phát hiện và sửa trong QA

**Proxy Vite giữ luồng SSE downstream khi upstream chết giữa chừng.** Backend restart
xong, REST/polling hoạt động nhưng browser chỉ có một stream response sau 120s.
Mã proxy mặc định pipe response, chưa đóng downstream của luồng đã gửi headers
khi upstream đóng không hoàn chỉnh. Thêm `frontend/dev/sseProxy.ts`, gắn qua
`server.proxy.configure`: chỉ `/api/events`, nếu upstream close mà `complete=false`
thì destroy downstream. fetch-event-source nhận lỗi và retry theo hook hiện có.
Không đổi SseHub/executor/AFTER_COMMIT, khoảng polling hay CSS reduced motion.

HTTP local tái kiểm stream ngắt và kết nối lại; browser thật sau restart mới có
2 stream responses và REST invalidation tự động. Restart bật seed bình thường,
row counts/ledger không đổi. Tham chiếu API:
[Vite server.proxy.configure](https://vite.dev/config/server-options#server-proxy),
[Node IncomingMessage.complete](https://nodejs.org/api/http.html#messagecomplete).

Các lỗi **test harness**, không phải lỗi nghiệp vụ app:

- Mock pattern `/api/**` cũng bắt `/src/api/...`: đã cho module Vite đi qua.
- Ant Select option ARIA ảo nằm ẩn: kiểm option hiển thị bằng DOM dropdown.
- GET recipe trả list trực tiếp; movement DTO không có orderItemId. Sửa assertion
  recipe và dùng snapshot JDBC chỉ đọc cho nguồn consumption. Hai lần dừng đều dùng
  lại NVL #19/món #23/phiên #13, không tạo bản sao hay reset để chạy lại.
- Script Phase 1 cũ chưa biết SSE/detail Phase 2: bổ sung mock đúng endpoint.
- Popup test đọc aria-expanded ngay sau Escape có race React; chờ đúng giá trị false
  tối đa 3s rồi vẫn assert cùng điều kiện. Lượt hoàn tất đủ 59 checks, không nới
  kiểm viewport/CSS hoặc đánh PASS lượt dừng trước đó.
- Ca form kiểm kê thật có một lần dừng trước submit do locator dùng sai nhãn,
  rồi một assertion nhầm note rỗng phải bị bỏ khỏi JSON. API cho phép note rỗng;
  lần đó đã tạo phiếu #23 hợp lệ. Sửa harness kiểm nội dung dòng đã đếm và note
  không được nhập; lượt hoàn tất tạo #24. Cả #23/#24 diff0, không movement.

## 5. Tác động Neon main

Readiness chỉ đọc trước ghi; cờ `PHASE1_QA_ALLOW_WRITES=main` đặt cho từng lượt.
Process backend do lượt này mở ban đầu PID 19372, restart kiểm SSE; backend cuối
PID 6380 trên 8080. Vite có sẵn PID 7784/cổng 5173 được dùng tiếp; không kill process
frontend của người dùng. Startup kiểm schema/Flyway V1 qua, không migration mới.

| Bảng | Trước Phase 4 thực tế | Sau API, browser, probe | Tăng |
|---|---:|---:|---:|
| account | 8 | 9 | 1 |
| reservation | 15 | 18 | 3 |
| service_session | 12 | 15 | 3 |
| food_order | 18 | 22 | 4 |
| order_item | 24 | 30 | 6 |
| invoice | 5 | 8 | 3 |
| revenue_reconciliation | 0 | 3 | 3 |
| ingredient | 18 | 19 | 1 |
| ingredient_lot | 4 | 8 | 4 |
| stock_receipt | 9 | 10 | 1 |
| stock_receipt_item | 19 | 23 | 4 |
| stocktake | 12 | 24 | 12 |
| stocktake_item | 21 | 33 | 12 |
| stock_movement | 48 | 66 | 18 |

- Tạo account QA #9, thử D10/lock; kết thúc LOCKED, role WAITER. Món QA #23 kết thúc
  DISCONTINUED; giữ recipe với NVL QA #19 INACTIVE, tồn cuối **0 kg**. NVL review cũ
  #18 vẫn INACTIVE, tồn **8 kg**. Không tác động danh mục thông thường.
- Receipt #11 gồm 4 lô HSD theo ngày Việt Nam -1/0/+3/+4; ngày +4 không xuất hiện
  ở attention mặc định. ID có gap do sequence không rollback khi validation TX fail;
  count receipt chỉ tăng một, không có phiếu dở dang.
- Reservations #16/#17 CANCELLED và #18 SEATED; giữ lịch sử. Sessions **#13/#14/#15
  đều CLOSED** qua payment, không đóng/sửa tay. Không thanh toán phiên cũ hàng loạt.
- Invoices **#6 = 48.146đ**, **#7 = 0đ**, **#8 = 46.912đ**; tổng doanh thu QA tăng
  **95.058đ**. #6 là request thắng race thanh toán; không áp đặt phương thức của
  request nào phải thắng. Top món QA quantity=5, tiền snapshot=95.058đ.
- Reconciliations **#1/#2/#3** được lập/xác nhận; không ghi thêm Invoice/movement.
  #1 actual0/system484.146; #2 cùng khoảng actual484.156, reason null; #3 actual0,
  system531.058 theo ngày UI. Tất cả snapshot được giữ nguyên khi confirm và khi có Invoice sau.
- Các stocktake tăng thêm gồm ca zero difference, explicit zero, dọn fixture qua
  workflow và kiểm khóa. Không sửa/xóa ledger hoặc đặt actual âm.

Không reset database, sửa paidAt, refresh ngày seed, restore main, tạo branch Neon
hoặc hard delete. Restart với seed=true giữ nguyên counts và ledger. Snapshot
ban đầu thật có **5 Invoice/7 ACTIVE**, khác tài liệu review cũ 4 Invoice/8 ACTIVE;
không dùng số cũ làm readiness. Sau QA vẫn **5 bàn trống/7 ACTIVE**.

## 6. Checklist và giới hạn

Kết quả từng dòng tại [checklist 1–36](../phase_instructions/phase-4-checklist.md).
Các luồng chính đã kiểm bằng app/API thật; phần form/popup, biên cap, thứ tự khóa
và các nhánh lỗi còn có unit/mock bổ sung, ghi rõ ở từng dòng. Không tuyên bố
“36/36 PASS trên thiết bị thật” hoặc dùng unit thay cho nghiệm thu browser.

- **Chưa kiểm:** tablet vật lý, stress/many-user benchmark; HSD chỉ kiểm theo ngày
  hiện tại, không đổi đồng hồ server sang đúng nửa đêm.
- **TR-09:** README có lệnh backup/restore; `pg_dump`/`pg_restore` chưa thấy trên
  PATH ở lượt này. Chưa dump hoặc thực diễn restore; không chạy `--clean` lên main
  để điền checklist. Không thêm script backup riêng.
- **Dữ liệu demo 27/10:** readiness chưa có booking CONFIRMED ngày 27/10. Trước demo
  cần tạo booking mới qua workflow và kiểm HSD/stock hiện tại; không sửa seed lịch sử.
- Chuỗi bán hàng đã chạy API và UI qua gọi/gọi thêm/bếp/tiêu hao/phục vụ/payment/
  đối soát/báo cáo; chuỗi nhận reservation có API thật. Chuỗi kho receipt→lots→tồn/
  cảnh báo→stocktake→disposal→movement có API và transaction thật; không tuyên bố
  toàn bộ chuỗi kho được nhập bằng tay qua UI.

Không có thay đổi nghiệp vụ/role/schema/phạm vi so với spec. `confirmed` filter,
DTO hình dạng, thứ tự top và isolation của report là lựa chọn hiện thực được tài liệu
Phase 4 cho phép. Sửa proxy là hồi quy NFR/checklist35, không mở rộng chức năng.

## 7. File và cách chạy lại

Backend root `backend/restaurant-management/src/`:

- main: `PaymentController`, `PaymentService/Impl`, Invoice/OrderItem/
  RevenueReconciliation repositories; mới `ReconciliationService/Impl`,
  `ReconciliationMapper`, `CreateReconciliationRequest`, 5 response records.
- test: mới `PhaseFourSecurityTest`, `PhaseFourValidationTest`,
  `ReconciliationServiceImplTest`, `RevenueSummaryTest`; hai test payment/Phase3
  được nối dependency mới và format AOSP. Suite cũ giữ nguyên hành vi.

Frontend: router, paymentApi; mới reconciliationApi/types, RevenueStats,
ReconciliationPage, ReportsPage; time test; Vite config và dev/sseProxy.
QA: 7 script Phase4 (API/mock/live/reconnect/proxy/stocktake UI/query Java), hai harness cũ
Phase1/popup. Docs: báo cáo này, checklist, TRACEABILITY, READMEs, AGENTS/CLAUDE,
status note master/handoff/instructions. Không có secrets trong file mới.

Backend cwd `backend/restaurant-management`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
$env:MAVEN_USER_HOME = 'D:\capstone_project_ueh\.cache\maven'
.\mvnw.cmd '-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository' -o clean verify
$phaseFourClasspath = 'target/classes;' + (Get-Content -Raw ../../.cache/phase3-review-classpath.txt).Trim()
& "$env:JAVA_HOME/bin/java.exe" -cp $phaseFourClasspath ../../scripts/PhaseFourQueryProbe.java
```

Classpath cache có thể tái tạo bằng Maven `dependency:build-classpath`, như báo cáo
review Phase3. Probe mặc định chỉ đọc, chạy port ngẫu nhiên, seed=false.

Frontend cwd `frontend`: `bun run test`, `bun run build`, `bun run lint`.
Từ repo root, Vite đang chạy:

```powershell
node scripts/phase1-demo-readiness.mjs
node scripts/phase4-browser-check.mjs               # mock, không ghi Neon
$env:BROWSER_CHANNEL = 'msedge'
node scripts/phase4-browser-check.mjs
node scripts/phase4-proxy-check.mjs                 # HTTP local, không DB
```

Các script ghi `phase4-api-check.mjs` và `phase4-live-browser-check.mjs` cần guard;
chạy lại sẽ tạo lịch sử thật. Live browser cần manifest API đã hoàn tất. Hai cờ
resume chỉ hỗ trợ đúng điểm gián đoạn đã mô tả, xác minh fixture trước dùng lại.
Transaction probe `--writes --ingredient-id=<id> --reconciliation-id=<id>` chỉ dùng
QA IDs đã xác minh trong manifest, phiếu chưa confirm; không chạy lại trên các ID
đã confirmed chỉ để lấy thêm PASS. Reconnect probe ghi ready.json rồi chờ restart
backend do người kiểm soát; bản thân script không kill process hoặc reset DB.

Sau khi các kiểm tra cần thiết qua, chỉ cập nhật docs/check diff, không commit/push.
