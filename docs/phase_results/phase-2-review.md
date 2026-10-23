# Sửa ba mục Critical của Phase 2

Ngày thực hiện: 23/10/2026, Asia/Ho_Chi_Minh. Branch `feat/phase-2-implement`.
Baseline đầu đợt: `cadcfab`, working tree sạch. Đợt sửa này **chưa commit/push**.
Không bắt đầu Phase 3, không đổi V1/schema, role, trạng thái hoặc D10.

Lượt sửa UI tiếp theo (dropdown khi bật giảm chuyển động) có số kiểm thử riêng tại
[phase-2-popup-fix.md](phase-2-popup-fix.md); không đổi số nghiệm thu của ba mục Critical dưới đây.

## 1. Yêu cầu và quyết định

Phạm vi: FR-05–08/FR-18 và TR-11/NFR-02/03. Bảng liên quan vẫn là service_session,
food_order, order_item, recipe_item, stock_movement; không có migration mới.

Chủ dự án đã chốt trong phiên: **99 phần mỗi dòng, 50 dòng mỗi đợt**.
Hai yêu cầu còn lại: mọi PATCH món kiểm phiên ACTIVE với thứ tự khóa Session → OrderItem;
SSE sau commit không được gửi trên thread HTTP hoặc làm giao dịch đã commit trả 500.

## 2. Các thay đổi

| Review | Sửa | Bằng chứng |
|---|---|---|
| 1. Quantity/items không giới hạn | OrderLimits dùng chung trong backend; @Max(99), @Size(min=1,max=50) và @NotNull trên DTO. Service tự kiểm giới hạn trước đọc menu/tạo order. Frontend max/rule 99, validator danh sách 50 và vô hiệu nút thêm ở 50 dòng. | Biên 99/100 và 50/51 qua unit; 100/2.147.483.647/51 dòng trả 400 trên API thật, không sinh FoodOrder; UI dừng đúng 50 và thêm lại được sau khi bỏ dòng. |
| 2. Chuyển món thiếu khóa/guard phiên | Query scalar findSessionIdById không load entity; khóa ServiceSession rồi OrderItem; kiểm ACTIVE trước cả nhánh no-op. Áp dụng start/unavailable/complete/cancel/serve. | 11 ca CLOSED gồm cùng trạng thái đích và 5 ca thứ tự khóa. Các ca cũ về guard/no-op/tiêu hao vẫn pass; complete song song kiểm trên Neon. |
| 3. SSE đồng bộ trên HTTP thread | RealtimeConfig tạo executor riêng `sse-send-`, 4 worker, queue 256, AbortPolicy; mỗi emitter một task cho broadcast và heartbeat. Không dùng CallerRuns. Catch Exception ở từng send, enqueue và listener dispatch. | Test chặn một emitter bằng latch: caller và emitter khỏe vẫn tiếp tục; RuntimeException/IOException/IllegalStateException bị cô lập; executor rejection và listener lỗi không làm request đã commit thất bại. |

Entity/relationship không thay đổi. Các item lịch sử có quantity lớn do QA trước vẫn được đọc như cũ;
giới hạn mới áp dụng khi tạo order, không sửa dữ liệu lịch sử.

### Khóa và trạng thái

Luồng ghi món hiện tại:

```text
scalar sessionId lookup
→ lock ServiceSession (PESSIMISTIC_WRITE)
→ lock OrderItem (PESSIMISTIC_WRITE)
→ require session ACTIVE
→ guard/no-op/chuyển trạng thái/tiêu hao
→ publish event trong transaction
```

FK order/session của item không có workflow chỉnh sửa. Scalar lookup tránh đưa item cũ vào
persistence context trước khi lấy khóa. CLOSED trả 409 có thông báo tiếng Việt, kể cả READY/SERVED
hay cùng trạng thái đích. Idempotency vẫn giữ trong phiên ACTIVE. PaymentService Phase 3 phải
khóa cùng ServiceSession trước khi đọc/tính hóa đơn; chưa có API đóng phiên/thanh toán trong đợt này.

### Gửi SSE

AFTER_COMMIT chỉ enqueue, không chờ socket. Worker gửi riêng cho từng emitter; lỗi send gỡ emitter,
không complete lại trên AsyncContext đã lỗi. Registry/callback, heartbeat 20 giây, timeout 30 phút,
payload type/sessionId và invalidation frontend giữ nguyên.

Queue hữu hạn để không tích lũy công việc vô hạn khi client chậm. Khi queue đầy hoặc executor dừng,
tín hiệu bị bỏ và được phục hồi bằng polling/reconnect; không chạy send trên caller. Nếu nhiều client
đều treo và chiếm hết worker, SSE có thể chậm đến lúc polling, nhưng HTTP nghiệp vụ vẫn không chờ gửi.

Bean dùng `defaultCandidate=false` và inject bằng qualifier để executor này không thay executor mặc định
của Boot/MVC. Cách đăng ký dựa trên [tài liệu Task Execution của Spring Boot](https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html).
Không thêm dependency, @EnableAsync, broker hay message queue ngoài ứng dụng.

## 3. Kiểm chứng

| Lệnh / phạm vi | Kết quả |
|---|---|
| Backend `mvnw.cmd clean verify` | **150 test PASS**, 0 failure/error/skipped, JAR thành công |
| Frontend `bun run test` | **18 test / 47 assertions PASS** |
| Frontend `bun run build` | PASS, TypeScript + production Vite |
| Frontend `bun run lint` | PASS |
| QA guards | **9 test PASS** |
| `phase2-review-api-check.mjs` | **36 kiểm tra PASS**, REST + Neon main thật |
| `phase2-review-browser-check.mjs` | **9 kiểm tra PASS**, Chrome headless với API/Neon thật, hai context WAITER/KITCHEN_STAFF |
| Schema chỉ đọc | PASS: 18 bảng domain, 106 cột, 31 FK RESTRICT, 5 partial unique index; V1 không đổi |
| Git diff whitespace | PASS |

150 backend giữ baseline 127 test, thêm 23 ca: kitchen 10, session/order 8, validation 1,
SseHub 3 và listener 1. MockMvc vẫn kiểm toàn ma trận sáu role/annotation.

Test CLOSED, thứ tự khóa và slow/half-open emitter dùng unit/mock/latch không cần DB;
không đóng tay phiên trên Neon để giả lập PaymentService chưa có. Test transaction listener dùng
transaction synchronization thật của Spring nhưng không có DB.

API thật kiểm: từ chối payload vượt cap có fieldErrors/không ghi order; quantity 99 được chấp nhận;
hai complete đồng thời đều 200 nhưng đúng một bộ hai movement (-0,099/-0,198), chỉ một ORDER;
repeat start/cancel/serve/complete giữ no-op; ngắt một SSE subscriber không làm hỏng client còn lại.
Request order sau ngắt subscriber đo được **324 ms** trong lượt này; không coi đó là load benchmark.

Browser kiểm form quantity max 99, thêm đúng 50 dòng rồi disable, bỏ dòng cho thêm lại, không tràn ngang
ở viewport 1024×768 và đóng form chưa gửi không ghi DB. Một order 99 phần thật được gọi/bắt đầu/
hoàn thành/phục vụ qua hai context; cập nhật sau response order **205 ms**, complete **236 ms**,
không F5. Có đúng hai movement và không lỗi JavaScript. Không mock REST hoặc SSE trong lượt này.
Một lượt browser trước dừng do selector nút Đóng trùng với nút X của Modal; chưa gửi order,
không thêm bản ghi nghiệp vụ, món QA được discontinue trong finally. Đã sửa selector và chạy lại đạt.

Không cộng số 139 API/25 browser/6 layout trong [báo cáo ban đầu](phase-2.md) vào đợt review.
Script API cũ được chỉnh ca rollback để quantity=99; dùng recipe QA cực lớn có chủ đích thay cho
quantity vượt cap, đồng thời chờ tín hiệu async trước khi lấy counter kiểm no-op.
Không chạy lại script API đầy đủ hoặc browser mở bàn cũ trong đợt review này.

## 4. Tái lập

Backend, cwd `backend/restaurant-management`:

```powershell
$env:MAVEN_USER_HOME = 'D:\capstone_project_ueh\.cache\maven'
.\mvnw.cmd -o '-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository' clean verify
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

Frontend, cwd `frontend`:

```powershell
bun run test
bun run build
bun run lint
```

Từ gốc repo, backend/frontend đã chạy:

```powershell
node scripts/phase1-demo-readiness.mjs
node --test scripts/tests/qa-write-guard.test.mjs
$env:PHASE1_QA_ALLOW_WRITES = 'main'
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase0/browser/node_modules/playwright/index.mjs).Path
try {
  node scripts/phase2-review-api-check.mjs
  node scripts/phase2-review-browser-check.mjs
} finally {
  Remove-Item Env:PHASE1_QA_ALLOW_WRITES
  Remove-Item Env:PLAYWRIGHT_MODULE
}
```

API script dùng lại một session ACTIVE gắn reservation `[QA]`, lấy id từ API. Browser đọc fixture
của API script rồi xác minh qua API trước khi dùng. Không hard-code session/menu id.
Kết quả sinh trong `.cache/phase2-review/`; log build/app ở `.cache/phase2-review-*.log`.
Các script mới dùng guard main trước HTTP/browser setup, không tự reset hoặc in token/secret.

## 5. Giới hạn và bàn giao

- Các giới hạn 99/50 là quyết định nghiệp vụ được duyệt, không phải chứng minh rằng mọi phép nhân
  với giá/recipe cực đại đều vừa NUMERIC. Không thay giới hạn giá/recipe hay thêm Invoice trong review.
  Ca numeric overflow với recipe cực lớn vẫn thuộc kiểm rollback/DB constraint; chưa chạy lại ca đó.
- Chưa kiểm payment/cancel chạy đua bằng PaymentService thật vì Phase 3 chưa triển khai;
  hợp đồng khóa chung đã đưa vào master §12.9/§16.3 để Phase 3 tuân theo.
- Slow socket được mô phỏng bằng latch ở send, không gây treo mạng của tablet vật lý.
  Chưa load test nhiều client treo đồng thời; giới hạn worker/queue và fallback được ghi rõ.
- Chưa kiểm Edge hoặc tablet vật lý; không chạy lại riêng toàn bộ reconnect/polling 30 giây
  đã có bằng chứng baseline, vì frontend transport/invalidation không thay đổi.
- Không sửa V1/schema, không reset Neon, không tự sang Phase 3 và không commit/push.

## 6. Tác động dữ liệu và file

Readiness đầu lượt review: **10 ACTIVE / 2 bàn trống**, không có booking CONFIRMED 27/10.
Dùng lại phiên QA đã xác minh qua API; không hard-code id và không mở/đóng phiên.

| Dữ liệu | Trước review | Sau review |
|---|---:|---:|
| MenuItem | 21 | 22 (+1 món `[QA] Phase2 review`, cuối cùng DISCONTINUED) |
| RecipeItem | 24 | 26 (+2 dòng của món QA) |
| FoodOrder | 14 | 17 (+2 API, +1 browser) |
| OrderItem | 19 | 23 (+3 API, +1 browser) |
| StockMovement | 6 | 10 (+4 CONSUMPTION: hai lượt complete, mỗi lượt hai NVL) |
| ServiceSession / Invoice | 10 / 0 | Không đổi |
| Account / khu vực / bàn / NVL / reservation | 8 / 3 / 12 / 10 / 15 | Không đổi |

Các item thử kết thúc SERVED/CANCELLED, không còn món review PENDING/COOKING. Các movement,
ngày lịch sử và các bản ghi QA cũ được giữ nguyên; không reset, không sửa kho hoặc seed.
Snapshot cuối vẫn **10 ACTIVE / 2 bàn trống**, cần đọc readiness lại trước demo.

File chính:

- `OrderLimits`, `CreateOrderRequest`, `OrderLineRequest`, `OrderItemRepository`.
- `KitchenServiceImpl`, `ServiceSessionServiceImpl` và test validation/service.
- `RealtimeConfig`, `SseHub`, `RealtimeEventListener` và test executor/transaction.
- `OrderModal.tsx`, `utils/orderLimits.ts`, `orderLimits.test.ts`.
- Hai script `phase2-review-*-check.mjs`, QA guard test và cập nhật script API cũ.
- Master §12.9/13.1/14.1/16.3, hướng dẫn/prompt Phase 2, TRACEABILITY, CLAUDE và README;
  báo cáo Phase 2 ban đầu giữ số liệu lịch sử, thêm link tới review này.

Danh sách đầy đủ: [phase-2-review-files.md](phase-2-review-files.md).
