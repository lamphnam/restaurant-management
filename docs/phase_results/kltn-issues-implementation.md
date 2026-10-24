# KLTN — Implementation 8 issues, 24/10/2026

## A. Implementation Summary

Baseline thực tế: `develop`, `fc7c59a`; working tree ban đầu sạch. So audit `829118b`,
chỉ deployment/docs thay đổi; source nghiệp vụ giống baseline audit. Không tìm thấy KLTN.pdf;
triển khai theo yêu cầu mới trong pasted task, spec và ảnh của lượt audit.
Không commit/push. Giai đoạn implementation/test dùng PostgreSQL cô lập, không ghi Neon.
Sau khi validation đạt, người dùng yêu cầu deploy bằng Java21 qua WSL SSH: đã triển khai
release `20261024-191117-a3343614` lên https://dnrestaurant.dpdns.org/ và áp dụng V2–V4.
Chi tiết kiểm tra production chỉ đọc và đối chiếu dữ liệu nằm ở mục G.

| Issue | Status | Implementation | Bằng chứng |
|---|---|---|---|
| 01 | DONE | area.code/table.code unique toàn cục; giữ tên/ID/FK, backfill V4; UI hiển thị mã riêng | Migration V1 → V4 giữ invoice/ledger/name, JPA validation; UI floor-plan/reservation/kitchen/session |
| 02 | DONE | MANAGER PUT CONFIRMED/unlinked; cùng fields như create; self-exclusion và source/target locks | Unit lock/metadata/status; real API update/overlap/capacity/403; concurrent update/update, update/open; browser form |
| 03 | DONE | Một card/orderId; kitchen-only batch detail đầy đủ; status/action riêng từng món | Real batch API/RBAC; Chrome/Edge mixed-status drawer/card/action |
| 04 | DONE | BackNavigation link styled button đến floor-plan ở loading/error/invalid/normal | Browser direct URL/invalid/CLOSED; frontend typecheck/build |
| 05 | DONE | Shared blocksPayment predicate: PENDING/COOKING/READY; giữ subtotal và zero amount | Unit payment, direct HTTP, full flow, duplicate pay, DB commit rollback; UI disabled READY |
| 06 | DONE | Hai badge/activeSession; count dòng; serve/ack WAITER; metadata bền vững/idempotent | Real API ack/full flow/RBAC; browser badge count/refresh/old session; polling30s |
| 07 | DONE — VERIFIED WORKING / NOT REPRODUCED | Không đổi MenuService/recipe permission; HEAD_CHEF vẫn không sửa tên/giá | Real HTTP GET/PUT recipe và403 menu edit; browser RecipeDrawer save/reopen |
| 08 | DONE | Start reserves snapshot; Complete consumes; UNAVAILABLE releases; shared Ingredient locks | PostgreSQL races, snapshot, rollback, warning/recheck, historical negative/empty recipe; browser dialogs |

DONE là trong phạm vi test mô tả dưới đây và smoke production chỉ đọc ở mục G;
chưa nghiệm thu tablet vật lý/load hoặc chạy lại toàn bộ nghiệp vụ ghi trên production.

## B. Key Technical Decisions

### Inventory: Option B — reserve Start, consume Complete

- Không thêm bảng/status/movement type. `order_item.ingredient_requirements` JSONB chứa
  immutable `{ingredientId, unit, quantity}` với quantity = định lượng × số phần.
- Chỉ snapshot của item COOKING tính vào `reservedStock`.
  `currentStock = SUM(stock_movement.quantity_change)`;
  `availableStock = currentStock - reservedStock`.
- Start: khóa Session → Item → MenuItem → mọi Ingredient theo ID tăng dần. Khóa Menu serialize
  với recipe replacement; refresh Ingredient sau khóa tránh entity đã được load trước đó bị stale.
- Kiểm mọi dòng trước khi thay đổi: projected âm →409 có ingredients/shortage; projected dưới min
  nhưng không âm →200 started=false/warning. Warning chưa có snapshot/state/movement/event.
- Confirm resubmit, kiểm lại dưới khóa. Thành công capture snapshot, COOKING và ORDER sau commit.
  Retry Start khi đã COOKING/có snapshot không giữ thêm. projected=0/min=0 được phép.
- Complete: Session → Item → Ingredient tăng dần; dùng snapshot và kiểm ledger trừ các reservation khác.
  Ghi consumption âm và READY trong một transaction; giữ unique `(order_item_id, ingredient_id)`.
  Retry READY/SERVED trong phiên ACTIVE không tiêu hao thêm. Closed vẫn409 trước no-op.
- UNAVAILABLE khóa ingredient đang giữ rồi đổi status, giải phóng reservation; không ghi hoàn kho giả.
- Nhập/kiểm kê/loại bỏ dùng cùng Ingredient locks. Receipt khóa toàn bộ IDs tăng dần trước insert.
  Disposal ≤ available. Stocktake actual ≥ held; số thực đếm bao gồm lượng đang giữ cho món đang nấu.
  D12 chặn đổi unit khi có ledger/held; không thêm tự quy đổi g/kg hoặc ml/lít.
- Inventory list dùng REPEATABLE_READ cho danh mục/ledger/reserved cùng snapshot. Trả current/reserved/available;
  ORDER invalidate inventory; inventory list polling30s. Giữ SSE AFTER_COMMIT executor isolation.
- Recipe rỗng: snapshot [] và không movement, bảo toàn hành vi cũ. Không thêm FEFO/tồn theo lô;
  lot/HSD tiếp tục chỉ ghi nguồn/cảnh báo theo scope hiện có, consumption lotId=NULL.

### Legacy data

V2 không suy diễn snapshot của món cũ và không ghi ledger. NULL khác []:
COOKING legacy thiếu snapshot sẽ khóa recipe hiện tại, kiểm đủ và capture ở lần xử lý đầu tiên.
Nếu thiếu thì chặn; cần nhập thật/kiểm kê thật hoặc UNAVAILABLE có xác nhận. Đây không phải bằng chứng
về recipe được dùng trước nâng cấp. READY/SERVED/invoice/movement lịch sử giữ nguyên, kể cả tồn âm.
Cần rà các món legacy COOKING khi tiếp tục vận hành; không chạy script sửa số dư.

### Payment, notifications, grouping and reservation

- `OrderItemStatus.blocksPayment()` dùng chung list/preview/POST. `NON_BILLABLE` không đổi:
  CANCELLED/UNAVAILABLE subtotal0; READY vẫn tạm tính. Response flag mới `hasBlockingItems`.
  Error code cũ `PAYMENT_BLOCKED_PENDING_ITEMS` được giữ để tương thích; message nay gồm READY.
- Ack: thời điểm/Account FK trên OrderItem; chỉ UNAVAILABLE/ACTIVE, lần sau giữ actor/time đầu tiên.
  Không đổi status/eligibility/stock. Bốn floor roles đọc; chỉ WAITER serve/ack.
- Floor-plan dùng hai query tổng (floor + awaiting), filter tableId và activeSessionId; không N+1.
  Key của notification component gồm activeSessionId để không giữ drawer của lượt khách cũ.
- Queue REST giữ dạng phẳng PENDING/COOKING; UI group orderId. Drawer GET kitchen batch trả đủ status
  nhưng chỉ session ACTIVE. Không mở quyền đọc session cho bếp, không thêm batch status.
- Update reservation đọc scalar nguồn, khóa nguồn/đích tăng dần rồi Reservation. Nếu nguồn vừa đổi,
  trả409 tải lại; không đi khóa bổ sung ngược thứ tự. Overlap loại chính ID; created metadata giữ nguyên.
  Không sửa bất kỳ reservation đã gắn session, SEATED/CANCELLED. Giữ create policy `start < end`,
  không tự cấm quá khứ hoặc mở thêm trạng thái mới.
- Code không thay tên: area T01/T02/SV (khác tên dùng KV+ID khi migrate);
  table prefix + B + thứ tự theo ID trong khu vực. Mã unique toàn cục; tên hóa đơn cũ giữ nguyên.
  Seed vẫn tìm legacy names T01/T05/T09 và tạo codes đúng cho DB mới.

### API contracts

| API | Quyền / contract |
|---|---|
| PATCH `/api/kitchen/items/{id}/start` | KITCHEN_STAFF/HEAD_CHEF; body optional `{confirmLowStock?: boolean}` |
| Start200 | `{started, item, ingredients}`; false=warning chưa mutation, true=đã reserve/COOKING |
| Start409 | `code=INSUFFICIENT_STOCK`, fieldErrors, ingredients có current/reserved/available/required/projected/minimum/shortage |
| GET `/api/kitchen/orders/{id}` | Hai role bếp; list OrderQueueItem đủ status của batch ACTIVE |
| GET `/api/sessions/items/awaiting-service` | WAITER/MANAGER/CASHIER/OWNER; READY + UNAVAILABLE chưa ack, ACTIVE |
| PATCH `/api/sessions/items/{id}/acknowledge-unavailable` | WAITER; idempotent, không body |
| PUT `/api/reservations/{id}` | MANAGER; cùng fields create; CONFIRMED/unlinked |
| GET `/api/reservations/available-tables` | MANAGER; thêm excludedId tùy chọn |
| Payment list/preview | `hasBlockingItems` thay `hasPendingOrCookingItems`; POST luôn kiểm lại |
| Inventory list | thêm reservedStock/availableStock; belowMinStock theo khả dụng |
| Codes | thêm code vào floor/available; tableCode vào reservation/session/kitchen/payment; legacy names giữ nguyên |

### Migrations

- V1 không đổi. V2 JSONB snapshot + array CHECK/index; V3 ack fields/FK/CHECK cặp actor/time/status;
  V4 code backfill NOT NULL/UNIQUE trên area/table. Vẫn18 domain tables.
- Đã kiểm trên database test loopback với schema cô lập. Sau đó, deploy được người dùng
  yêu cầu riêng đã áp dụng V2–V4 thành công trên Neon ngày24/10/2026; không đổi V1.
- Phải triển khai frontend/backend tương ứng vì Start response và payment flag có thay đổi contract.

## C. Files Changed

- Backend workflows: KitchenServiceImpl, CookingInventory, InventoryServiceImpl, PaymentServiceImpl,
  ReservationServiceImpl, ServiceSessionServiceImpl, TableServiceImpl.
- Domain/DTO/contracts: OrderItem/IngredientRequirement, DiningArea/DiningTable/Reservation,
  OrderItemStatus, request/response records, mappers, controllers và repositories liên quan.
- Flyway: V2__cooking_inventory_snapshot.sql, V3__unavailable_acknowledgment.sql, V4__area_table_codes.sql.
- Frontend: KitchenPage/InventoryCheckDialog, FloorPlanPage/TableNotifications, SessionPage/BackNavigation,
  PaymentPage, reservation form/list, inventory/stocktake UI, API/types, roles/router/realtime/time/CSS.
- Tests: IssuesPostgresTest; Kitchen/Payment/Reservation/Inventory unit tests; security matrix;
  frontend payment/realtime tests; scripts/issues-browser-check.mjs; scripts/test-issues-postgres.ps1.
- Spec/traceability/README/AGENTS đồng bộ yêu cầu mới; các phase reports cũ giữ nguyên như bằng chứng lịch sử.
- Không đổi pom/package/lockfile/application configuration, deployment files hoặc migration V1.

## D. Test Results

Kết quả chạy mới ngày24/10/2026, sau các thay đổi cuối cùng:

| Check | Kết quả |
|---|---|
| Backend Java21/Maven clean verify | **245 tests**, 0 failures/errors/skipped, JAR BUILD SUCCESS |
| Trong số245 | 230 tests không DB + **15 integration tests PostgreSQL17.6**; không cộng lặp các lượt chạy |
| Frontend bun run test | **36 tests / 111 assertions**, 0 fail |
| Frontend bun run lint / bun run build | PASS; build có TypeScript check |
| Chrome browser mocked API | **10 nhóm PASS**, 0 page errors/unexpected requests |
| Edge browser mocked API | **10 nhóm PASS**, 0 page errors/unexpected requests |
| Polling | Mỗi browser kiểm timer30s thật khi SSE unavailable |
| Realtime server thật | SSE ORDER sau Start commit, assertion reservation đã visible trong PostgreSQL |
| Migration | V1 → V4, validate/reapply0;18 tables; giữ tên, invoice, ledger âm lịch sử |
| Git diff --check | PASS |

15 integration cases gồm: Start hai session tranh cùng NVL, Start/Complete retry, warning/confirm recheck,
zero/min0, recipe đổi sau Start, UNAVAILABLE release/ack, Start vs disposal/stocktake/receipt,
multi-ingredient atomicity, empty recipe, historical negative, DB rollback Start/Complete/payment,
reservation update/update và update/open, real API roles/batch/recipe/payment/full flow và SSE.
Các exception do trigger trong test rollback được cố ý tạo, không phải lỗi còn tồn tại.
Đã xem screenshots warning/table badges/payment; dialog inventory dùng card metrics để đọc đủ số liệu trên tablet.

### Commands

PostgreSQL portable17.6 từ Maven Central (Zonky binary bundle, SHA256 đã đối chiếu), chỉ loopback55439;
data và logs trong `.cache/issues-postgres`. Không cài service hệ thống hoặc thêm project dependency.
Integration test có guard URL `jdbc:postgresql://(127.0.0.1|localhost):port/kltn_issues_test`,
role test kltn_test, seed=false, profile issues-test, schema UUID mới mỗi lượt. Không đọc local profile.
Không đặt KLTN_TEST_DB_URL thì integration class tự skip; unit suite không cần database.

```powershell
# Cần PostgreSQL test đã chạy và database kltn_issues_test/role kltn_test đã tồn tại.
.\scripts\test-issues-postgres.ps1
# Trong môi trường lượt này wrapper gặp lỗi Target[0]; dùng Maven3.10 đã cache với Java21:
# .cache/maven/wrapper/dists/.../bin/mvn.cmd -Dmaven.repo.local=... -o clean verify

cd frontend
bun run test
bun run lint
bun run build
# frontend dev phục vụ15173; toàn bộ /api được mock ở browser tests
bun run dev --host 127.0.0.1 --port 15173
# tại root, terminal khác:
node scripts/issues-browser-check.mjs
$env:BROWSER_CHANNEL='msedge'; node scripts/issues-browser-check.mjs
```

Evidence không commit: `.cache/issues-final-verify.log`, surefire-reports,
`.cache/issues-ui-chrome/results.json`, `.cache/issues-ui-msedge/results.json` và screenshots.
Browser API bị intercept toàn bộ (kể cả writes); tách khỏi bằng chứng API/DB thật.

## E. Remaining Risks / Limits

- Integration tests không chạy trên Neon; production chỉ chạy migration được phép và smoke chỉ đọc
  (mục G). Không chạy data-fixing script hoặc reset lịch sử âm. Snapshot production trước/sau
  vẫn có ingredient7 currentStock=-1.615; cần đối soát qua nhập/kiểm kê thật, không ép về0.
- Legacy COOKING không thể phục hồi recipe quá khứ; thiếu hàng sẽ cần workflow thật trước Complete.
- Recipe rỗng vẫn không tiêu hao. Không FEFO/tồn theo lô/tự quy đổi unit; người dùng nhập đúng unit gốc.
- Test hiện tại không thay nghiệm thu tablet vật lý, multi-user load hoặc backup/restore.
- Script QA Phase0–4/báo cáo cũ là lịch sử; không dùng chúng để ghi vào production hoặc coi kết quả cũ là acceptance mới.
- Contract Start/payment đổi có chủ đích; không triển khai frontend cũ với backend mới.

## F. Manual Verification Checklist

Chạy trên database test đã migrate, không dùng production cho checklist ghi:

1. Floor-plan: area T01 và table T01-B01; tên cũ vẫn hiện, mở phiên/đặt bàn dùng đúng ID.
2. MANAGER sửa CONFIRMED: thông tin, số khách, bàn, giờ, note; tự giữ bàn không bị trùng với chính nó;
   overlap/vượt sức chứa bị chặn; SEATED/CANCELLED không có action.
3. Gọi nhiều món một đợt; bếp thấy một card; mở drawer đủ dòng, xử lý từng dòng riêng.
4. Start đủ tồn → COOKING; tồn sổ chưa trừ, reserved tăng/available giảm.
5. Start làm dưới min → warning đủ số liệu. Hủy không đổi gì; xác nhận kiểm lại và reserve.
6. Thiếu tồn → chặn, vẫn PENDING; chọn Không thể chế biến, xác nhận reason Hết nguyên liệu.
7. Sửa recipe sau Start; Complete vẫn tiêu hao snapshot cũ đúng một lần. COOKING→UNAVAILABLE giải phóng held.
8. Bàn hiện badge READY/UNAVAILABLE riêng; quantity50 vẫn count1; drawer hiển thị ×50 và lý do.
9. WAITER serve/ack; badge giảm, reload không hiện lại; OWNER/MANAGER/CASHIER đọc được nhưng không có action.
10. Còn READY: Payment bị disable và direct POST bị chặn. Đã SERVED/UNAVAILABLE/CANCELLED: thanh toán đúng subtotal;
    session CLOSED, bàn AVAILABLE, thông báo cũ biến mất; thanh toán lần2 bị409.
11. Mở /sessions/id trực tiếp/refresh/ID sai: luôn có đường về sơ đồ; CLOSED không có action phục vụ.
12. HEAD_CHEF vào Định lượng, lưu rồi mở lại; không có quyền sửa giá/tên món.

## G. Deployment — 24/10/2026

Người dùng yêu cầu tiếp tục, dùng Java21 và chạy `scripts/deploy-oracle-wsl.ps1 -UseWslSsh`,
đồng thời xác nhận frontend https://dnrestaurant.dpdns.org/ và API dưới `/api/*`.
Đây là lần deploy được phép sau giai đoạn implementation; không mở lại quyền QA ghi trên production.

- Local build: JDK21.0.11; Oracle runtime: OpenJDK21.0.12.1. Không đổi Java configuration của project.
- Script deploy giữ nguyên; chạy bằng PowerShell với ExecutionPolicy Bypass chỉ cho process hiện tại,
  JAVA_HOME trỏ JDK21 và Maven cache trong workspace. Không đổi execution policy hệ thống.
- Release đang chạy: `20261024-191117-a3343614`; release trước: `20261024-014854-42c5532e`.
  Upload checksum PASS, current symlink chuyển thành công, systemd `dnrestaurant` ACTIVE.
- Journal xác nhận Flyway validated4 migrations, áp dụng3 migrations V2/V3/V4 và schema đạt v4;
  Spring Boot khởi động thành công. Không reset hoặc sửa ledger/invoice/history.
- Script chạy lại backend build: 230 tests PASS, 15 integration tests opt-in SKIPPED (tổng245).
  Đây không phải lượt245 PASS đầy đủ: lượt đầy đủ ở mục D đã chạy trước deploy trên PostgreSQL test.
  Frontend36 tests/111 assertions, lint và build đều PASS trong deploy.
- HTTPS root200; `/api/auth/me` chưa đăng nhập401 đúng kỳ vọng; SPA direct route trả200.
  Bundle JS public khớp chính xác frontend build mới.
- Chrome production có **6 nhóm PASS**: bundle; sơ đồ12 bàn có mã; SSE authenticated qua HTTPS;
  kitchen UI/API; inventory current/reserved/available; payment UI/hasBlockingItems.
  Không page errors, không business mutation requests; browser chặn non-GET/HEAD dưới `/api/`.
  Login POST chỉ tạo JWT stateless; các API nghiệp vụ dùng GET.
- Snapshot API trước/sau:12 bàn,4 phiên ACTIVE,14 hóa đơn,19 đặt bàn,23 món,19 nguyên liệu.
  IDs phiên đang mở, số lượng/tổng tiền từng invoice, số lượng reservations, menu price/status,
  currentStock từng nguyên liệu và trạng thái/phiên gắn từng bàn đều không đổi.
  Mã bàn mới có đủ và unique; schema/code backfill là thay đổi có chủ đích của migration.
- Chưa chạy nghiệp vụ ghi hoặc load test trên production. Không commit/push source.

Evidence local không commit: `.cache/deploy/deploy-issues-20261024.log`,
`.cache/deploy/issues-before-readonly.json`, `.cache/deploy/issues-after-readonly.json`,
`.cache/deploy/issues-data-comparison.json`, `.cache/deploy/live-validation.json`,
và screenshots `live-waiter.png`, `live-head_chef.png`, `live-cashier.png`.
Không lưu JWT/password trong các evidence JSON/log này.

## File manifest

```text
AGENTS.md
CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md
README.md
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/controller/KitchenController.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/controller/ServiceSessionController.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/controller/TableController.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/request/StartCookingRequest.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/AvailableTableResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/CookingStartResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/FloorPlanAreaResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/FloorPlanTableResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/IngredientAvailabilityResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/IngredientResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/OpenSessionPaymentResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/OrderQueueItemResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/PaymentPreviewResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/ReservationResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/dto/response/SessionDetailResponse.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/entity/DiningArea.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/entity/DiningTable.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/entity/IngredientRequirement.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/entity/OrderItem.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/entity/Reservation.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/enums/OrderItemStatus.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/exception/ErrorCode.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/exception/GlobalExceptionHandler.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/exception/InventoryAvailabilityException.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/mapper/FoodOrderMapper.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/mapper/InventoryMapper.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/mapper/PaymentMapper.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/mapper/ReservationMapper.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/mapper/TableMapper.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/repository/DiningTableRepository.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/repository/OrderItemRepository.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/repository/ReservationRepository.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/repository/ServiceSessionRepository.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/seed/DataSeeder.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/KitchenService.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/ReservationService.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/ServiceSessionService.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/CookingInventory.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/InventoryServiceImpl.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/KitchenServiceImpl.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/PaymentServiceImpl.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/ReservationServiceImpl.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/ServiceSessionServiceImpl.java
backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/service/impl/TableServiceImpl.java
backend/restaurant-management/src/main/resources/db/migration/V2__cooking_inventory_snapshot.sql
backend/restaurant-management/src/main/resources/db/migration/V3__unavailable_acknowledgment.sql
backend/restaurant-management/src/main/resources/db/migration/V4__area_table_codes.sql
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/IssuesPostgresTest.java
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/config/PhaseOneSecurityTest.java
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/config/PhaseTwoSecurityTest.java
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/service/impl/InventoryServiceImplTest.java
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/service/impl/KitchenServiceImplTest.java
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/service/impl/PaymentServiceImplTest.java
backend/restaurant-management/src/test/java/vn/ueh/kltn/restaurant/service/impl/ReservationServiceImplTest.java
docs/README.md
docs/TRACEABILITY.md
docs/phase_results/kltn-issues-implementation.md
frontend/README.md
frontend/src/api/kitchenApi.ts
frontend/src/api/reservationApi.ts
frontend/src/api/sessionApi.ts
frontend/src/auth/roles.ts
frontend/src/components/BackNavigation.tsx
frontend/src/components/OrderQueueCard.tsx
frontend/src/index.css
frontend/src/pages/floor-plan/FloorPlanPage.tsx
frontend/src/pages/floor-plan/TableNotifications.tsx
frontend/src/pages/inventory/InventoryPage.tsx
frontend/src/pages/inventory/StocktakePage.tsx
frontend/src/pages/kitchen/InventoryCheckDialog.tsx
frontend/src/pages/kitchen/KitchenPage.tsx
frontend/src/pages/payment/PaymentPage.tsx
frontend/src/pages/reservations/CreateReservationDrawer.tsx
frontend/src/pages/reservations/ReservationsPage.tsx
frontend/src/pages/sessions/SessionPage.tsx
frontend/src/realtime/invalidation.ts
frontend/src/router.tsx
frontend/src/types/inventory.ts
frontend/src/types/payment.ts
frontend/src/types/sessions.ts
frontend/src/types/tables.ts
frontend/src/utils/time.ts
frontend/tests/payment.test.ts
frontend/tests/realtime.test.ts
scripts/issues-browser-check.mjs
scripts/phase3-api-check.mjs
scripts/test-issues-postgres.ps1
```
