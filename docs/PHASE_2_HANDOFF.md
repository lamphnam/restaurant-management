# Bàn giao từ Phase 1 sang Phase 2

Ngày chốt tài liệu: 22/10/2026, Asia/Ho_Chi_Minh.
Phase 1 và 7 mục review PR #1 đã được sửa; chủ dự án yêu cầu chuẩn bị tài liệu.
**Phase 2 chưa triển khai.** Tài liệu này mô tả nền hiện có và phần sắp làm, không phải báo cáo nghiệm thu Phase 2.
Chưa commit/push các sửa review và tài liệu; kiểm `git status` trước khi tiếp tục và giữ các thay đổi đang có.

## 1. Nguồn và thứ tự đọc

Đọc [CLAUDE.md](../CLAUDE.md), [master Spring/React](../CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md),
[kết quả Phase 1](phase_results/phase-1.md), [sửa review](phase_results/phase-1-review.md),
[hướng dẫn Phase 2](phase_instructions/phase-2.md). Prompt triển khai sẵn ở
[phase-2-prompt.md](phase_instructions/phase-2-prompt.md).

Các mục master liên quan: §1, §4–§9, §10.2 (D4, D5, D10, D11), §11,
§12.9–§12.11, §13.1/§13.5/§13.6/§13.10, §14–§18, §20–§21 và Phụ lục A.
Mọi mâu thuẫn xử lý theo §0.1; không tự thêm bảng/cột, role, trạng thái hoặc luật mới.

## 2. Nền tảng đã có

| Phần | Hiện có | Phần tiếp theo |
|---|---|---|
| Backend | Java 21, Spring Boot 4.1.1, Maven wrapper, JPA, Flyway, 18 entity/repository | Giữ controller → service interface → impl → repository; DTO record, mapper thủ công |
| Auth | JWT HS256, 6 role, CurrentUser, JSON 401/403, validation/exception handler | Mọi handler mới có @PreAuthorize; không làm lại auth |
| Account | Danh sách/tạo/khóa/mở/đổi role, chặn sửa chính mình | Không mở rộng ở Phase 2 |
| Menu/recipe | Tra cứu/đổi giá/ngừng/kích hoạt, PUT recipe bằng diff có khóa MenuItem | Chọn món ON_SALE; snapshot giá lúc gọi; đọc định lượng lúc hoàn thành |
| NVL | GET `/api/inventory/ingredients?status`, chỉ id/name/unit/status | Không thêm CRUD/tồn kho đầy đủ trước Phase 3 |
| Bàn/đặt bàn | Floor-plan, danh sách/phân trang, available-tables, tạo/hủy | Bổ sung event sau commit cho thao tác có thay đổi |
| Phiên | POST `/api/sessions`, khóa bàn trước reservation, occupy bàn | Thêm GET chi tiết, gọi món/gọi thêm, hủy, phục vụ |
| Frontend | Auth, role guard, layout, 4 trang Phase 1, UI chung | Thay placeholder `/sessions/:id`, `/kitchen`, `/awaiting-service`; nối SSE |
| Kho | Entity/schema StockMovement, chưa có workflow tiêu hao | Chỉ CONSUMPTION khi hoàn thành món ở Phase 2 |

Không có gọi món, KitchenService, KitchenController, EventController, SseHub,
RealtimeEvent, useRealtime hoặc GET chi tiết phiên trong code hiện tại.
Dependency SSE frontend đã cài; cài thư viện không có nghĩa real-time đã hiện thực.

## 3. Điểm bắt đầu trong code

Đường dẫn backend dưới `backend/restaurant-management/src/main/java/vn/ueh/kltn/restaurant/`:

| File/nhóm | Điều cần biết |
|---|---|
| `controller/ServiceSessionController.java`, `service/ServiceSessionService.java`, `service/impl/ServiceSessionServiceImpl.java` | Chỉ có open; mở rộng module hiện có, không tạo service trùng tên/chức năng |
| `entity/FoodOrder.java` | Constructor nhận session/creator/time; `addItem` gắn quan hệ hai chiều; cascade PERSIST/MERGE cho items; `calculateTotal` đã có |
| `entity/OrderItem.java` | Constructor snapshot MenuItem.price; trạng thái PENDING; có startCooking/markUnavailable/markReady/markServed/cancel và calculateSubtotal. Cần test các guard này trong Phase 2 |
| `entity/ServiceSession.java` | Chưa có collection orders hoặc hàm tổng phiên; truy vấn các FoodOrder theo session qua repository, không giả định getOrders đã tồn tại |
| `entity/RecipeItem.java`, `repository/RecipeItemRepository.java` | calculateConsumption dùng BigDecimal; findByMenuItemId fetch ingredient, sắp theo tên; giữ cả dòng NVL inactive đã có |
| `repository/OrderItemRepository.java` | Có findLockedById PESSIMISTIC_WRITE; query hàng chờ và món chờ phục vụ chưa có |
| `repository/FoodOrderRepository.java`, `repository/StockMovementRepository.java` | Mới là repository nền tảng; chưa có query nghiệp vụ Phase 2 |
| `repository/MenuItemRepository.java` | findLockedById đang bảo vệ PUT recipe; không bỏ khóa/diff khi bổ sung code gọi món/bếp |
| `service/impl/ReservationServiceImpl.java` | Comment publish ở create/cancel; cancel hiện gọi entity no-op khi đã CANCELLED, nên Phase 2 phải kiểm thay đổi trước khi phát event |
| `service/impl/ServiceSessionServiceImpl.java` | Comment publish FLOOR_PLAN và RESERVATION nếu gắn đặt bàn; giữ thứ tự khóa DiningTable → Reservation |
| `exception/GlobalExceptionHandler.java` | Có handler AsyncRequestNotUsableException chỉ debug, không ghi JSON khi client ngắt; giữ khi thêm SSE |
| `config/SecurityConfig.java`, `security/CurrentUser.java` | Role từ claim, không tra DB mỗi request; không còn rule URL riêng cho accounts |
| `src/test/java/vn/ueh/kltn/restaurant/config/ControllerAuthorizationTest.java` (tính từ backend/restaurant-management) | Quét handler trong package controller, chỉ miễn đúng login; giữ test khi thêm controller |

Các entity/repository có sẵn không thay thế ServiceImpl, transaction và test nghiệp vụ.
Tránh N+1 khi load session/orders/items/menu/table cho màn chi tiết và queue;
OSIV đang false, nên mapping cần đủ dữ liệu trong transaction đọc.
Giữ phong cách sau review: import/kiểu tường minh, đặc biệt kết quả repository và Optional;
var chỉ khi `new X(...)` hiển nhiên, mỗi lệnh một dòng. Formatter đã dùng là
google-java-format 1.28.0/AOSP; không cần thêm dependency vào project để định dạng.

Frontend dưới `frontend/src/`: đọc `router.tsx`, `auth/roles.ts`, `layouts/AppLayout.tsx`,
`api/client.ts`, `api/queryClient.ts`, `hooks/useApiFeedback.ts`, `utils/labels.ts`,
`utils/time.ts`, `components/StatusTag.tsx`, `components/MoneyText.tsx` và các page Phase 1.
`router.tsx` vẫn dùng tên `phaseOnePages`; có thể tổ chức lại map khi thêm page, giữ lazy-load/role guard.

## 4. Quyết định phải bảo toàn

| Quyết định | Nội dung đã chốt |
|---|---|
| D10 | Khóa/đổi role không revoke JWT cũ; giữ role claim tối đa 12h. `/me` dùng role token, tên từ DB. Đăng nhập lại mới lấy role mới |
| D11 và review | Thay toàn bộ recipe bằng diff; khóa MenuItem trước khi đọc. NVL mới phải ACTIVE; NVL inactive đã có được giữ/sửa số lượng. Không thêm bảng snapshot recipe |
| Đọc recipe khi complete | Dùng các dòng recipe hiện có theo §12.10, không tự lọc mất dòng chỉ vì ingredient đã INACTIVE. Movement đã ghi không được sửa khi recipe đổi |
| Lịch đặt bàn | tableId tùy chọn; unexpired mặc định false, true → endTime > now. Giữ lịch sử của danh sách thông thường |
| Walk-in | Không chờ query reservations; D2 là cảnh báo UI, backend vẫn cho phép |
| Seed | DataSeeder @Order(0) có gate account; PhaseOneSeeder @Order(1) có gate từng bảng. Không sửa dữ liệu đã có hoặc làm mới ngày khi restart |
| Neon | QA trên main, không bắt tạo branch. Chủ dự án cho phép reset/init demo khi lỗi cần, nhưng không tự reset trong script hoặc lúc startup; ghi mọi tác động vào report |
| Idempotency | PATCH cùng trạng thái đích trả 200/no-op; complete ở READY hoặc SERVED không sinh thêm movement và không phát event mới |
| Dữ liệu/audit | Người thao tác từ CurrentUser, thời điểm từ Clock; không tin creator/performer/giá client; tiền/số lượng dùng BigDecimal |
| Schema | Giữ V1, 18 bảng, RESTRICT FK; không thêm migration nếu chưa nêu nhu cầu và được chủ dự án quyết định |

Trong lúc đọc code sẽ thấy ServiceSession.close và DiningTable.release đã có.
Không nối chúng vào Phase 2: thanh toán/đóng phiên là Phase 3.

## 5. API và quyền để nối tiếp

API Phase 1 giữ nguyên. Các chi tiết dễ dùng sai:

- POST `/api/sessions` nhận `{tableId, reservationId?}`, trả
  `{sessionId, tableId, reservationId, openedAt, status}`; frontend dùng sessionId để điều hướng.
- Floor-plan trả khu vực → tables, có `activeSessionId` và `upcomingReservation` nullable;
  không có trạng thái bàn RESERVED.
- Reservations nhận date/status/q/tableId/unexpired/page/size; PageResponse là
  `{items, page, size, total}`, size mặc định 20, tối đa 100; response có overdue suy ra.
- GET menu đăng nhập là được; POST/PUT/PATCH menu chỉ OWNER. Recipe chỉ OWNER/HEAD_CHEF.
- GET ingredients chỉ OWNER/HEAD_CHEF; đừng dùng nó để bắt WAITER có quyền kho.

API Phase 2 và ma trận role đầy đủ ở [hướng dẫn Phase 2](phase_instructions/phase-2.md).
Giữ phân biệt: GET chi tiết phiên cho WAITER/MANAGER/CASHIER theo §13.5;
route `/sessions/:id` dành cho WAITER/MANAGER theo §15. CASHIER sẽ dùng luồng thanh toán
riêng ở Phase 3; không tự mở quyền gọi món/hủy/phục vụ hoặc mở rộng route cho CASHIER.
MANAGER được gọi/hủy món nhưng **serve và awaiting-service chỉ WAITER**.

## 6. Event và query key

SSE chỉ là tín hiệu để refetch REST, không chứa khách hàng, token hoặc toàn bộ order.
Service publish trong transaction; listener AFTER_COMMIT mới broadcast. Không phát cho
rollback hoặc PATCH no-op. Reconnect phải invalidate lại các query liên quan vì SSE không phải lịch sử event.

| Event | Nguồn thay đổi trong Phase 2 | Prefix query key cần invalidate theo §14.2 |
|---|---|---|
| FLOOR_PLAN `{type, sessionId}` | Mở phiên (nối code Phase 1) | `['floor-plan']`, `['payment']`, `['session', sessionId]` |
| RESERVATION `{type}` | Tạo/hủy đặt bàn; mở phiên có reservation | `['reservations']`, `['floor-plan']` |
| ORDER `{type, sessionId}` | Gọi món/gọi thêm, hủy, start/unavailable/complete/serve | `['kitchen']`, `['session', sessionId]`, `['awaiting-service']`, `['payment']` |

Giữ invalidation `['payment']` để tương thích Phase 3 dù query thanh toán chưa có.
Query key có bộ lọc dùng invalidate theo prefix, gồm cả danh sách reservations và picker theo bàn.
Chuẩn hóa kiểu sessionId giữa route param và event để không lệch key số/chuỗi.

`useRealtime` gắn một lần sau đăng nhập trong AppLayout, gửi Authorization header bằng
fetch-event-source, openWhenHidden true; cleanup khi logout/unmount/đổi phiên đăng nhập.
Query của floor-plan/kitchen/awaiting-service có refetchInterval 30_000 và refetchOnWindowFocus.
Giữ retry không lặp 4xx, cơ chế stale 401/multi-tab và API feedback đã có.

## 7. Bằng chứng làm mốc

| Đợt kiểm | Kết quả và phạm vi |
|---|---|
| Nghiệm thu Phase 1 ban đầu | 75 test backend; 13 frontend; 186 API assertions thật; 17 browser chức năng + 5 visual/validation. Có tạo phiên trên Neon |
| Sau sửa review | 83 test backend; 13 frontend / 27 assertions; 46 API checks thật gồm 10 vòng PUT recipe đồng thời; 7 browser API mock; 4 test guard. Build hai phía/lint pass |
| Cấu trúc DB sau review | 18 bảng domain, 106 cột, 31 FK RESTRICT, 5 partial unique index; không đổi V1 |

Không cộng kết quả hai đợt hoặc gọi browser mock là end-to-end Neon.
Ca ingredient inactive và constraint khác active-session được kiểm bằng unit test;
chưa đổi tay DB để kiểm chúng. Chưa kiểm Edge hoặc thiết bị tablet thật.
Đợt chuẩn bị tài liệu này không chạy lại build/QA và không ghi DB.

## 8. Snapshot Neon và cách QA Phase 2

Snapshot đọc lúc 23:36 ngày 22/10, sau review: 8 account, 3 khu vực, 12 bàn,
13 món (món QA id 13 đã DISCONTINUED và recipe rỗng), 10 NVL, 16 dòng recipe,
13 reservation, 9 session ACTIVE; FoodOrder/StockMovement đều 0.
Floor-plan còn 3 bàn trống. Có 7 reservation CONFIRMED, 2 hết giờ, 5 chưa hết giờ;
chưa có reservation CONFIRMED ngày 27/10. Đây không phải cam kết dữ liệu còn nguyên khi QA tiếp.

Trước QA đọc lại bằng `node scripts/phase1-demo-readiness.mjs`. Có thể dùng phiên ACTIVE
đã có cho gọi món nếu đã xác minh đúng dữ liệu QA phù hợp; lấy id từ API, không hard-code.
Nếu cần mở thêm phiên để test SSE, ghi tác động và số bàn còn lại. Phase 2 vẫn chưa trả bàn.
Không chạy toàn bộ script Phase 1 cũ vì cần ít nhất 5 bàn trống, hiện snapshot chỉ có 3.

Tiêu hao Phase 2 có thể làm tồn âm vì chưa nhập hàng; D5 cho phép. Không thêm phiếu nhập,
tồn đầu kỳ, FEFO hoặc đổi ledger chỉ để làm đẹp dữ liệu QA. Tạo dữ liệu thử có tiền tố [QA]
ở tên/ghi chú phù hợp, giữ token/secret trong bộ nhớ/cấu hình gitignore.
Trước demo 27/10 chuẩn bị đặt bàn mới qua app, không UPDATE ngày lịch sử để làm mới.

Script ghi hiện có dùng `PHASE1_QA_ALLOW_WRITES=main`; script mới phải có guard tương đương,
nêu rõ loại dữ liệu sẽ ghi và không tự reset. Quyền main/reset xuất phát từ chỉ dẫn đã ghi
trong CLAUDE.md và báo cáo review, không cần yêu cầu tạo branch QA trở lại.

## 9. Kiểm thử Phase 2 cần bổ sung

- Tổng phiên dùng giá snapshot, bỏ CANCELLED/UNAVAILABLE; đổi giá món sau gọi không đổi đơn cũ.
- Gọi thêm tạo FoodOrder mới, chỉ ON_SALE và số lượng hợp lệ; phiên không ACTIVE bị chặn.
- OrderItem guard đúng/sai và PATCH no-op cho start/cancel/unavailable/complete/serve.
- Complete: đúng dấu/số movement/nguồn/người/thời điểm; recipe rỗng; retained inactive;
  tồn âm; lặp và 2 request song song không trừ kho hai lần; rollback không để movement mồ côi.
- Ma trận 6 role cho endpoint mới; annotation coverage; 401/403 và fieldErrors giữ đúng.
- Event đúng payload/type/sessionId, sau commit, không event khi rollback/no-op;
  SSE ngắt không log ERROR/ghi JSON vào stream; logout/reconnect không nhân kết nối.
- Hai browser context WAITER + KITCHEN_STAFF, cùng backend/Neon thật: món mới/hoàn thành/
  không thể chế biến/sơ đồ bàn đổi trong khoảng 1–2 giây không F5; fallback polling vẫn dùng được.
- Checklist §21.2: 14, hoàn thiện 15–16 phần gọi món/giá snapshot, 17–22 và 35;
  kiểm thêm reload/tablet phần Phase 2 của 36, không nhận nghiệm thu toàn hệ thống sớm.

## 10. Chạy và bàn giao tiếp

Lệnh chạy/build/test, cấu hình local và demo accounts: [README gốc](../README.md).
Lệnh QA an toàn/tái lập: [báo cáo review](phase_results/phase-1-review.md).
Backend đúng cwd `backend/restaurant-management`, frontend đúng cwd `frontend`.
Kiểm cổng 8080/5173, chỉ dừng tiến trình đã xác minh thuộc dự án; Windows có thể khóa JAR đang chạy khi clean.

Khi triển khai xong Phase 2 mới tạo `docs/phase_results/phase-2.md`, ghi số test thực chạy,
checklist từng mục, API thật/mock, tác động DB, file đổi, khác biệt với spec và phần chưa xác minh.
Cập nhật TRACEABILITY đúng phần đã làm; FR-04 còn chờ đóng phiên Phase 3,
FR-11–17 không trở thành hoàn thành chỉ vì Phase 2 đã có StockMovement.
Không commit/push hoặc tự sang Phase 3 nếu chủ dự án chưa yêu cầu.
