# Kết quả Phase 2 — Gọi món, Bếp, Tiêu hao, Phục vụ và SSE

Ngày thực hiện: **23/10/2026**, Asia/Ho_Chi_Minh. Branch: `feat/phase-1-implement`.
Phase 2 đã triển khai và kiểm theo phạm vi dưới đây. **Chưa commit/push; chưa bắt đầu Phase 3.**

## 1. Phạm vi và quyết định bảo toàn

- FR-05/UC8.2: chi tiết phiên, các đợt gọi món/gọi thêm và giá snapshot.
- FR-06/UC8.2/UC9: hủy PENDING; bếp báo UNAVAILABLE có lý do.
- FR-07/UC9: hàng chờ, bắt đầu và hoàn thành món.
- FR-08/UC8.3: món chờ phục vụ và xác nhận SERVED, chỉ WAITER.
- FR-18/BR-11: complete ghi CONSUMPTION từ recipe hiện tại, gồm NVL inactive được giữ;
  không thêm recipe snapshot, cho tồn âm theo D5.
- BR-03/04, TR-11/NFR-02: SSE sau commit, REST refetch, reconnect và polling dự phòng.

Đã đọc đầy đủ CLAUDE, master Spring/React, bàn giao, hướng dẫn/prompt Phase 2, review Phase 1,
TRACEABILITY và code nền. Trước code đã báo UC, bảng, luật, file và checklist trong phiên làm việc.
Git đầu phiên chỉ có `.agents/` và `AGENTS.md` chưa tracked; giữ nguyên, không reset/stash.

Không sửa V1 hoặc schema, thêm role/trạng thái hay khởi tạo lại dữ liệu. Giữ D10, seed gate,
khóa MenuItem trước PUT recipe/diff, chính sách retained inactive, tableId/unexpired và walk-in độc lập.
Không có thanh toán, đóng phiên/trả bàn, nhập/kiểm kê/loại bỏ, kho đầy đủ, đối soát hoặc báo cáo.

## 2. Hiện thực

### Backend

| Phần | Code và hành vi |
|---|---|
| Phiên/gọi món | Mở rộng ServiceSessionController → ServiceSessionService → ServiceSessionServiceImpl; detail và các FoodOrder/items/tạm tính. Mỗi POST orders là FoodOrder mới; ACTIVE, ON_SALE, quantity > 0; note tối đa 500. |
| Giá/tạm tính | OrderItem snapshot giá khi tạo; tổng dùng unitPriceAtOrder, bỏ CANCELLED/UNAVAILABLE. Không nhận tổng, giá hoặc người thao tác từ client. |
| Bếp | KitchenController → KitchenService → KitchenServiceImpl; queue chỉ PENDING/COOKING của phiên ACTIVE, sắp createdAt/orderId/itemId. |
| Khóa/idempotency | Mọi chuyển trạng thái dùng findLockedById(OrderItem). Cùng đích không đổi dữ liệu/phát event; complete READY/SERVED no-op trước đọc recipe. |
| Complete | Cùng transaction: khóa → kiểm COOKING → đọc recipe hiện tại → CONSUMPTION âm, lot/nguồn khác null, actor từ CurrentUser và thời gian Clock → READY. Không kiểm/chặn tồn âm; recipe rỗng vẫn hoàn thành. |
| Phục vụ | awaiting-service trả READY + UNAVAILABLE có lý do của phiên ACTIVE; serve chỉ READY → SERVED. |
| DTO/query | DTO record, mapper tay, không trả entity. Session detail 2 query fetch, queue/awaiting mỗi loại 1 query; mapping trong transaction, OSIV=false. |
| SSE | EventController, SseHub timeout 30 phút/heartbeat 20 giây, RealtimeEventListener AFTER_COMMIT. Nối RESERVATION vào tạo/hủy; FLOOR_PLAN và RESERVATION khi mở phiên có đặt trước; ORDER khi món thay đổi. |

Mười endpoint mới đúng master §13.5/13.6/13.10. GET session cho WAITER/MANAGER/CASHIER;
gọi/hủy WAITER/MANAGER; serve/awaiting chỉ WAITER; bếp KITCHEN_STAFF/HEAD_CHEF;
SSE yêu cầu đăng nhập. Quyền cũ không đổi.

Giữ import/kiểu Java tường minh; var chỉ khởi tạo new rõ kiểu, không wildcard/FQN inline,
mỗi lệnh một dòng. Định dạng google-java-format 1.28.0, AOSP, không thêm dependency.
FoodOrder/OrderItem/StockMovement hiện có chỉ được định dạng lại, không đổi mô hình/guard.

### Frontend

- Thay ba placeholder bằng SessionPage, KitchenPage, AwaitingServicePage; lazy-load và role guard cũ.
- Session route vẫn WAITER/MANAGER; MANAGER không có nút serve. Chọn menu ON_SALE,
  form nhiều dòng, validation/fieldErrors, loading/disable và Popconfirm trước hủy.
- Bếp hai cột; card thể hiện bàn/món/SL/ghi chú/giờ gọi. READY và UNAVAILABLE tách riêng,
  có lý do cần báo khách. Tiền qua MoneyText; trạng thái qua StatusTag/labels; giờ Việt Nam.
- useRealtime gắn một lần trong AppLayout, bearer header, openWhenHidden, cleanup theo token.
  Event chỉ type/sessionId, chuẩn hóa id số, invalidate prefix theo §14.2, giữ payment key.
  Reconnect refetch toàn bộ live key; floor-plan/kitchen/awaiting-service và detail polling 30 giây,
  refetch khi focus. Giữ stale-401/multi-tab/cache clearing và không retry 4xx.

### Lỗi tìm được trong QA và đã sửa

SseHub ban đầu gọi complete() sau khi send thất bại trên client cũ. Tomcat có thể đã kết thúc
AsyncContext nên complete ném IllegalStateException lần nữa, cắt vòng broadcast trước các client
còn sống. Đã bỏ complete trong nhánh lỗi gửi, chỉ gỡ emitter và debug; container xử lý kết thúc.
Hai test hồi quy IOException/IllegalStateException xác nhận client tốt vẫn nhận event và heartbeat.
Thiết kế theo [tài liệu Spring về emitter bị IOException](https://www.springframework.org/spring/reference/7.1/web/webmvc/mvc-ann-async.html).
Lượt API và browser nghiệm thu cuối chạy trên JAR đã sửa. Log app cuối không có dòng mức ERROR
do disconnect/broadcast/heartbeat; WARN numeric overflow là ca rollback có chủ đích.

## 3. Build, test và bằng chứng

| Kiểm tra | Kết quả cuối | Phạm vi |
|---|---|---|
| Backend `mvnw.cmd clean verify` | **PASS 127**, 0 failure/error/skipped; JAR thành công | Giữ 83 test baseline; thêm 44 ca Phase 2, không cần DB |
| Frontend `bun run test` | **PASS 16 test / 41 assertions** | Giữ auth/time; thêm invalidation prefix/id/reconnect |
| Frontend `bun run build` | PASS | TypeScript + production Vite |
| Frontend `bun run lint` | PASS | oxlint |
| QA write guards | **PASS 7 test** | Script ghi từ chối trước HTTP/browser nếu không có flag main |
| `phase2-api-check.mjs` | **PASS 139 kiểm tra** | App + Neon main thật, gồm sáu role, validation, trạng thái, snapshot, ledger, SSE/no-op/rollback và complete song song |
| `phase2-browser-check.mjs` | **PASS 25 kiểm tra** | Chrome headless, context WAITER/KITCHEN_STAFF riêng; MANAGER; REST/Neon thật |
| `phase2-layout-check.mjs` | **PASS 6 kiểm tra** | Hai cột có dữ liệu PENDING/COOKING và READY/UNAVAILABLE, 1024×768, 768×1024, 375×812 |
| `PhaseTwoQueryProbe` | PASS: detail 2 SQL, kitchen 1 SQL, awaiting 1 SQL | App đọc Neon thật, seed=false, không ghi |
| Schema chỉ đọc | PASS | 18 domain tables, 106 cột, 31 FK RESTRICT, 5 partial unique index; V1 không đổi |
| Git whitespace | PASS | Không commit/push |

44 ca backend mới: OrderItem 23; KitchenService 7; session/order 8; validation 2;
ma trận quyền Phase 2 1; transaction listener 1; lỗi gửi SSE 2.
Ma trận quyền unit dùng controller thật và service mock; mỗi endpoint kiểm sáu role và 401.
API thật kiểm ma trận riêng, mutation ma trận dùng id không tồn tại để tránh ghi thừa.

**Phân biệt mock:** unit/MockMvc dùng repository/service/SseHub mock đúng phạm vi test.
Hai script browser Phase 2 dùng REST/DB thật, không mock dữ liệu hoặc response nghiệp vụ.
Chỉ chặn transport `/api/events` có chủ đích khi thử mất kết nối/reconnect/polling.
Không cộng số API/browser của Phase 1 hoặc các lượt chạy thử vào số nghiệm thu cuối.

## 4. Checklist §21.2

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| 14 | Đạt | API và UI gọi thêm có FoodOrder id khác, cùng session; detail giữ cả hai đợt. |
| 15 (Phase 2) | Đạt | Đổi giá QA 12.000 → 19.000 sau gọi; unitPriceAtOrder vẫn 12.000, tạm tính dùng giá cũ. Unit test kiểm thêm nhiều đợt. |
| 16 (Phase 2) | Đạt | Discontinue món QA, GET ON_SALE không trả món; POST order stale bị 409; modal dùng đúng bộ lọc ON_SALE. |
| 17 | Đạt | Hủy PENDING thành công, lặp no-op; COOKING bị 409; UI có Popconfirm và bỏ nút hủy sau start. |
| 18 | Đạt | UI bếp start → COOKING, màn phiên đổi không F5; repeated start không thêm event. |
| 19 | Đạt | Blank reason trả 400/fieldErrors và form chặn; lý do thật tới waiter; không có movement cho UNAVAILABLE. |
| 20 | Đạt | Hai dòng recipe, quantity=2; sửa recipe sau gọi thành 0,15 và 0,2 → ledger -0,3/-0,4, đúng source/actor/time/null lot. Recipe rỗng hoàn thành không movement; D5 tồn âm xác nhận chỉ đọc. |
| 21 | Đạt | Hai complete đồng thời KITCHEN_STAFF/HEAD_CHEF cùng 200, đúng một bộ 2 movement và một ORDER; retry READY/SERVED giữ số movement. |
| 22 | Đạt | Serve PENDING bị 409; READY → SERVED; lặp no-op. UI awaiting bỏ card sau phục vụ; UNAVAILABLE không có nút serve. |
| 35 | Đạt cập nhật sau commit; xem giới hạn thời gian dưới | Hai context thật: món mới, complete, unavailable; sơ đồ bàn mở phiên tự đổi; reconnect/logout và polling thật đã kiểm. |
| 36 (Phase 2) | Đạt trong phạm vi kiểm | Reload waiter giữ món/giá/trạng thái; logout/login lại bếp; không tràn ngang ở ba viewport, có kiểm cột với dữ liệu thật. Chưa kiểm toàn hệ thống/Edge/tablet vật lý. |

### Thời gian real-time đo ở lượt cuối

| Luồng | Toàn thao tác từ lúc bắt đầu bấm/gửi | Từ response thành công tới UI bên nhận |
|---|---:|---:|
| Gọi món → bếp | 2.617 ms | 215 ms |
| Complete → phục vụ | 651 ms | 227 ms |
| Mở phiên → sơ đồ bàn | 698 ms | 354 ms |
| Kết nối lại → nhận món bị lỡ | 1.340 ms | — |
| SSE bị chặn → polling bếp | 30.073 ms | — |

Như vậy cập nhật sau commit dưới 1 giây trong lượt này. Toàn thao tác gọi món có ghi Neon
và chờ click/response mất **2,617 giây**, cao hơn mốc khoảng 1–2 giây nếu tính từ lúc bấm.
Không khẳng định toàn thao tác luôn dưới 2 giây hoặc đây là benchmark tải nhiều user.
Một lượt thử trước đã dừng vì tổng thời gian 2,633 giây; giữ số đo đó, không đổi thành kết quả pass.

## 5. Tác động dữ liệu Neon main

Đã dùng main theo quyền chủ dự án; **không reset, không branch QA, không UPDATE ngày lịch sử,
không sửa/xóa movement**. Readiness trước QA: 9 ACTIVE / 3 bàn trống, 7 CONFIRMED
(4 hết giờ/3 chưa hết giờ), chưa có CONFIRMED ngày 27/10.
Lấy session id từ floor-plan/detail API, xác minh ACTIVE gắn reservation `[QA]`, dùng lại **phiên 2**.

| Dữ liệu | Đầu đợt Phase 2 | Cuối đợt, kể cả các lượt thử |
|---|---:|---:|
| Account / khu vực / bàn / NVL | 8 / 3 / 12 / 10 | Không đổi |
| MenuItem | 13 | 21 (+8 món QA, cuối cùng đều DISCONTINUED) |
| RecipeItem | 16 | 24 (+8 dòng của các món QA; retained để truy vết thao tác) |
| Reservation | 13 | 15 (+2 QA, đều CANCELLED qua API) |
| ServiceSession | 9 | 10 (+1 phiên kiểm FLOOR_PLAN, id 10) |
| FoodOrder / OrderItem | 0 / 0 | 14 / 19 |
| StockMovement | 0 | 6, đều CONSUMPTION |
| Invoice | 0 | 0 |

- API chạy hai lượt: mỗi lượt 3 FoodOrder, 5 OrderItem, 2 movement; cuối cùng dùng 139 kiểm tra
  của lượt trên JAR đã sửa. Mỗi lượt tạo 2 món QA và 1 reservation rồi cancel/discontinue qua API.
- Ba lượt browser thử bị dừng: một lượt lỗi selector trước gửi món, một lượt ngưỡng tổng độ trễ,
  một lượt lộ lỗi disconnect SSE. Tạo tổng 3 món QA và 2 FoodOrder/2 items. Hai món PENDING
  của các lượt dừng đã hủy qua API bình thường; không xóa lịch sử.
- Lượt browser đạt: 1 món QA, 5 FoodOrder/5 items, 1 movement; mở phiên 10 từ bàn trống.
  Phiên không có cột note nên provenance QA của phiên mới được giữ bằng id trong báo cáo/output,
  không đổi tên bàn hoặc schema để thêm `[QA]`.
- Kiểm layout bổ sung dùng lại món QA cuối (reactivate rồi discontinue), thêm 1 FoodOrder/2 items,
  1 movement; kết thúc một item SERVED và một UNAVAILABLE.
- Ca rollback dùng quantity lớn có chủ đích để vi phạm NUMERIC(12,3). Sau lỗi món vẫn COOKING,
  không movement một phần và không event; sau kiểm chuyển UNAVAILABLE có lý do `[QA]`.
  Các item số lượng rất lớn này không tính vào tạm tính, vẫn còn để truy vết test.
- Tồn ingredient 3/4 âm đúng D5; không nhập/kiểm kê bù chỉ để làm đẹp dữ liệu.
- Cuối đợt **10 ACTIVE / 2 bàn trống**. Phiên QA chưa đóng vì Phase 3 chưa làm.
  Đây là snapshot ngày 23/10, phải đọc readiness lại trước demo; vẫn chưa có CONFIRMED 27/10.

## 6. File đổi và lệnh tái lập

Danh sách đầy đủ: [phase-2-files.md](phase-2-files.md). Các nhóm chính:

- Backend: module session và kitchen, DTO/mapper/query, realtime, cấu hình scheduling và test.
- Frontend: session/kitchen/awaiting pages, shared OrderQueueCard, api/types, realtime hook,
  router/AppLayout/CSS/floor-plan và test invalidation.
- QA: ba script Phase 2 có guard, support/DB snapshot/query probe và test guard.
- Tài liệu: báo cáo, TRACEABILITY, CLAUDE, README gốc/frontend/docs và chỉ dẫn mốc Phase 2.

Backend, cwd `backend/restaurant-management`:

```powershell
$env:MAVEN_USER_HOME = 'D:\capstone_project_ueh\.cache\maven'
.\mvnw.cmd -o '-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository' clean verify
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

`-o` chỉ dùng khi cache đã đủ dependency. Trên máy khác có thể dùng `mvnw.cmd clean verify`
với Maven user home/repository mặc định. Trước clean/restart kiểm đúng listener/tiến trình của dự án;
không dừng tiến trình khác. Lượt này chỉ dừng backend do chính phiên làm việc khởi chạy để thay JAR.

Frontend, cwd `frontend`:

```powershell
bun run test
bun run build
bun run lint
bun run dev -- --host 127.0.0.1
```

Từ gốc repo, app đã chạy:

```powershell
node --test scripts/tests/qa-write-guard.test.mjs
node scripts/phase1-demo-readiness.mjs # chỉ đọc nghiệp vụ

$env:PHASE1_QA_ALLOW_WRITES = 'main'
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase0/browser/node_modules/playwright/index.mjs).Path
try {
  node scripts/phase2-api-check.mjs
  node scripts/phase2-browser-check.mjs # chiếm thêm MỘT bàn; cân nhắc readiness trước chạy
  node scripts/phase2-layout-check.mjs  # dùng fixture do browser check tạo, không mở bàn
} finally {
  Remove-Item Env:PHASE1_QA_ALLOW_WRITES
  Remove-Item Env:PLAYWRIGHT_MODULE
}
```

Playwright dùng bản có sẵn trong cache. Có thể trỏ PLAYWRIGHT_MODULE tới bản đã cài ở nơi khác;
cấu hình thêm API_URL/FRONTEND_URL/DEMO_PASSWORD/BROWSER_CHANNEL. Không đưa token/secret vào output.
DB snapshot hỗ trợ dùng pgjdbc trong `.cache/maven/repository`; đọc file local gitignore, chỉ mở kết nối read-only.

Probe query chỉ đọc (classpath dependency hiện có ở máy này), cwd backend:

```powershell
$probeClasspath = 'D:\capstone_project_ueh\backend\restaurant-management\target\classes;' +
  (Get-Content -Raw D:\capstone_project_ueh\.cache\review-classpath.txt).Trim()
# session id lấy từ API/output QA, không tự đoán:
$sessionId = (Get-Content -Raw D:\capstone_project_ueh\.cache\phase2\api-results.json | ConvertFrom-Json).sessionId
java -cp $probeClasspath D:/capstone_project_ueh/scripts/PhaseTwoQueryProbe.java $sessionId
```

Output sinh lại trong `.cache/phase2/`: api-results, browser-results, layout-results,
final-schema-counts và screenshots. Log build/app/query ở `.cache/phase2-*.log`.
Output không được commit; scripts/tests để tái lập nằm trong source.

## 7. Khác biệt, giới hạn và bàn giao

- Không có thay đổi nghiệp vụ/schema so với spec. Thêm polling cả detail ngoài ba live screen
  bắt buộc và khóa session khi tạo order để thuận đường serialize thanh toán tương lai;
  không thêm luồng Phase 3.
- Retained inactive, phiên CLOSED, và loại trừ phiên không ACTIVE trong queue được kiểm bằng
  unit/query; không sửa tay ingredient hay đóng phiên Neon để tạo ca đó.
- Chưa chờ đủ timeout emitter 30 phút hoặc JWT 12 giờ bằng đồng hồ thật; reconnect qua lỗi
  transport, logout/login và heartbeat trong lượt app thật đã được kiểm.
- Polling ngắt SSE được đo thực tế trên bếp; floor-plan/awaiting/detail dùng cùng cấu hình
  đã có test, chưa chờ riêng đủ 30 giây trên từng màn.
- Chrome headless với viewport tablet/phone; chưa Edge, tablet vật lý, load test nhiều user.
  Cảnh báo deprecation Ant Design ở các component Phase 1 cũ có thể còn trong dev console;
  không có uncaught JavaScript error trong các lượt browser đạt.
- Checklist thanh toán/kho 23–34 và phần toàn hệ thống của 36 chưa nghiệm thu.
  FR-04 vẫn chờ đóng phiên Phase 3; FR-11–17 phần kho/thanh toán/báo cáo chưa làm.
- Trước demo tạo booking 27/10 qua workflow khi cần; không sửa ngày seed/lịch sử.
  Không commit/push hoặc bắt đầu Phase 3 cho tới khi chủ dự án yêu cầu.
