# Kết quả Phase 1 — Danh mục, đặt bàn, mở phiên

Kết quả sửa sau review PR #1 và kiểm thử mới nằm ở [phase-1-review.md](phase-1-review.md). Các số liệu bên dưới là lần nghiệm thu ban đầu; trạng thái Neon mới nhất và guard QA xem báo cáo review.

Ngày kiểm tra ban đầu: 22/10/2026, Asia/Ho_Chi_Minh. Phase 1 đã triển khai và xử lý 7 mục review;
đang bàn giao tài liệu để chuẩn bị Phase 2. Phase 2 chưa bắt đầu. Số test/QA trong báo cáo này
giữ nguyên theo đợt nghiệm thu ban đầu; số sau sửa xem báo cáo review phía trên.

Bàn giao code/quyết định/dữ liệu: [PHASE_2_HANDOFF](../PHASE_2_HANDOFF.md).
Hướng dẫn và prompt tiếp theo: [phase-2.md](../phase_instructions/phase-2.md),
[phase-2-prompt.md](../phase_instructions/phase-2-prompt.md).

## Phạm vi hoàn thành

- FR-01/UC4: danh sách/tạo tài khoản, khóa/mở khóa/đổi role, OWNER không sửa chính mình. Không trả password/hash. Kiểm SĐT unique trước khi lưu và xử lý race. Mật khẩu tạo mới 6–72 ký tự, tối đa 72 byte UTF-8 trước BCrypt.
- FR-02/UC5: tra cứu theo tên/trạng thái, thêm/sửa tên/giá, ngừng/kinh doanh lại. HEAD_CHEF chỉ đọc thực đơn và sửa định lượng.
- FR-18 phần định lượng: GET/PUT toàn bộ bằng diff thêm/sửa/xóa; giữ lại khóa kép cũ, không xóa rồi insert lại cùng khóa. Sau review: khóa MenuItem trước diff, chỉ chặn NVL INACTIVE với dòng mới; dòng đã có được giữ/sửa số lượng. Chặn trùng NVL và số lượng không hợp lệ; danh sách rỗng được phép.
- Đọc NVL tối thiểu tại GET /api/inventory/ingredients?status. Chưa có currentStock hoặc CRUD kho.
- FR-03/UC7: tra cứu theo ngày Việt Nam/trạng thái/tên/SĐT, phân trang; gợi ý bàn; tạo/hủy; nhãn overdue suy ra. Không có sửa đặt bàn hoặc trạng thái mới.
- FR-04/UC8.1: mở walk-in/gắn reservation, khóa DiningTable trước Reservation, kiểm trạng thái/liên kết/thời hạn; lưu phiên và đổi trạng thái bàn trong một transaction.
- Frontend: bốn route /accounts, /menu, /floor-plan, /reservations có giao diện thật. Các route khác và /sessions/:id giữ placeholder.
- Seed PhaseOneSeeder @Order(1), transaction và cổng riêng cho từng bảng; không phụ thuộc account rỗng. Seed 10 món, 10 NVL (3 theo dõi HSD), 14 dòng định lượng cho 7 món, 3 đặt bàn. Không seed phiếu nhập/kiểm kê/lô.

## Quy tắc giữ nguyên và dọn nợ

- D10: khóa/đổi role không revoke JWT hoặc nạp role từ DB. JWT cũ giữ role tối đa 12h; /me trả role token. Swagger AccountController ghi rõ chính sách này.
- Bỏ rule URL /api/accounts/**; quyền nằm ở @PreAuthorize trên controller.
- Reservation.confirmSeated() chỉ nhận CONFIRMED, kể cả SEATED gọi lại cũng lỗi INVALID_STATE. cancel() vẫn no-op khi CANCELLED, chặn SEATED. close()/release() giữ nguyên cho Phase 3.
- D1: overlap dùng newStart < existingEnd và newEnd > existingStart, so với CONFIRMED/SEATED. Chạm biên hợp lệ; không cấm đặt bàn trong quá khứ.
- D2: backend cho walk-in dù có đặt trước; UI hỏi xác nhận khi sơ đồ trả upcomingReservation. Không tạo thêm trạng thái bàn.
- D3: chỉ gắn reservation CONFIRMED, cùng bàn, endTime > now. Người thao tác lấy từ JWT, không từ body.
- Đúng 18 bảng/106 cột, 31 FK RESTRICT, 5 partial unique index. Không sửa V1, không thêm migration, không đổi quan hệ/trạng thái/vai trò.
- ErrorCode bổ sung mã cụ thể cho tài khoản, bàn, đặt bàn, phiên và định lượng; giữ mã hiện có. Request kiểm độ dài cột, số lượng NUMERIC(12,3), tiền NUMERIC(14,0); thông báo tiếng Việt.

## Build và test

| Kiểm tra | Kết quả |
|---|---|
| Backend mvnw.cmd clean verify, Java 21/Boot 4.1.1 | PASS — 75 test, 0 lỗi, 0 bỏ qua |
| Unit/MockMvc mới | Guard Reservation, service account/menu/reservation/session/table, seed độc lập, validation UTF-8, ma trận 6 vai trò × 19 endpoint bằng controller thật |
| Frontend bun run build | PASS — TypeScript và Vite |
| Frontend bun run lint | PASS — không cảnh báo |
| Frontend bun run test | PASS — 13 test, gồm 3 test múi giờ |
| Live API script | PASS — 186 assertion, không lộ passwordHash |
| Chrome headless | PASS — 17 kiểm tra luồng; 5 kiểm tra hình ảnh/validation; không lỗi JavaScript/cảnh báo console |
| Probe hiệu năng trên Neon | PASS — floor-plan thực thi đúng 3 câu SQL, seed tắt, không ghi DB |
| Schema/seed và restart | Kiểm snapshot trước seed, sau seed, sau QA và hai lần restart; số dòng không tăng khi restart |
| Git/secrets/JAR | PASS — whitespace sạch, V1 không đổi; không có DB password/JWT secret riêng trong source, không có application-local.yaml trong JAR |

Maven/JVM có thể in cảnh báo Mockito agent; không có lỗi test/build. Test service/MockMvc không cần Neon. Kiểm SQL và QA app thật là các script riêng, không chạy mặc định trong unit test.

## Checklist §21.2 từng mục

| Mục | Kết quả và bằng chứng |
|---|---|
| 5 | PASS — POST account trùng SĐT → 409 PHONE_ALREADY_EXISTS; form UI hiển thị đúng message server. |
| 6 | PASS — tự lock/unlock/changeRole → 409 CANNOT_MODIFY_SELF; Select và nút tự khóa trên UI disabled. |
| 7 | PASS — số khách vượt capacity → 409 TABLE_CAPACITY_EXCEEDED trên API; query gợi ý lọc theo sức chứa. |
| 8 | PASS — overlap một phần → 409 RESERVATION_OVERLAP; API tạo chạm biên thành công và available-tables trả lại bàn ở khung chạm biên. |
| 9 | PASS — cancel hai lần → 200, vẫn có trong lịch sử dưới trạng thái CANCELLED; UI Popconfirm và nhãn Đã hủy. |
| 10 | PASS — reservation đã SEATED không hủy được, 409 RESERVATION_NOT_CONFIRMED; UI không có nút hủy dòng này. |
| 11 | PASS — walk-in → ACTIVE, reservationId null, bàn OCCUPIED; UI có bước xác nhận D2 và chuyển /sessions/:id. |
| 12 | PASS — mở với reservation → liên kết đúng, SEATED, bàn OCCUPIED; chọn đặt bàn và mở phiên bằng UI thành công. |
| 13 | PASS — hai POST song song từ WAITER/MANAGER trên một bàn → đúng [200, 409]; bên thua có code SESSION_ALREADY_ACTIVE; không có 500. UI bàn đã mở ẩn Mở phiên, hiện Xem phiên. |
| 15 | PASS phần Phase 1 — PUT đổi price 50.000 → 55.000 trên API; UI đổi 55.000 → 56.000 cho món QA. Snapshot giá OrderItem chưa kiểm, thuộc Phase 2; Phase 1 không ghi bảng order_item. |
| 16 | PASS phần Phase 1 — ngừng món qua UI/API, GET status=ON_SALE không trả món đó; reactivate idempotent. Form gọi món chưa có, kiểm ở Phase 2. |

Kiểm thêm đã đạt: 6 vai trò × 19 endpoint qua API thật; thiếu/sai tham số → 400; SĐT sai/sai mật khẩu không lộ thông tin; D10 role token sau đổi role và token còn dùng sau khóa; recipe giữ một NVL cũ đồng thời đổi/xóa/thêm không lỗi PK; PUT lines rỗng; overdue và đặt trong quá khứ; thời gian form đúng giờ Việt Nam dù browser đặt timezone UTC; lỗi fieldErrors quay về bước nhập và gắn đúng field (HTTP mock cho riêng nhánh UI này).

## Dữ liệu và quyết định QA trên main

Chủ dự án thay yêu cầu branch QA ngày 22/10/2026: dùng Neon main, không tạo phase1-qa. Được reset/init lại dữ liệu demo khi lỗi cần đến. Đã cập nhật CLAUDE.md, master §20 và prompt trong docs/phase_instructions/phase-1.md. Lần này **không reset, không sửa/xóa lịch sử, không sửa ngày của seed cũ**. Dữ liệu thử mang tiền tố [QA].

| Thời điểm | Account | Món | NVL | Dòng recipe | Reservation | Session |
|---|---:|---:|---:|---:|---:|---:|
| Trước chạy Phase 1, account đã có | 6 | 0 | 0 | 0 | 0 | 0 |
| Sau seed lần đầu | 6 | 10 | 10 | 14 | 3 | 0 |
| Sau QA | 8 | 12 | 10 | 16 | 13 | 8 |
| Sau restart | 8 | 12 | 10 | 16 | 13 | 8 |

8 phiên QA còn ACTIVE trên main (T01–T08 đang OCCUPIED), còn 4 bàn trống. Đây là tác động đã được chủ dự án cho phép khi đổi chính sách QA; chưa có endpoint thanh toán/đóng phiên để trả bàn. Một số bản ghi QA hình thành qua các lần chỉnh locator của script, được giữ trong lịch sử. FoodOrder và StockMovement vẫn có 0 dòng. Không in DB password/JWT secret/token vào report hoặc kết quả QA.

Các mốc 45 phút/ngày mai tính ở lần seed đầu; restart không làm mới. Trước demo 27/10 cần kiểm lại độ tươi và tạo đặt bàn mới qua app khi cần.

## Lệnh tái lập

Backend (terminal trong backend/restaurant-management):

```powershell
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

Máy hiện tại dùng MAVEN_USER_HOME trong .cache/maven và -Dmaven.repo.local trỏ .cache/maven/repository; có thể thêm -o nếu dependency đã đủ. Cấu hình Neon/JWT trong application-local.yaml (gitignore), theo README. Không dừng tiến trình cổng 8080/5173 khi chưa xác định chủ sở hữu.

Frontend (terminal trong frontend):

```powershell
bun install --frozen-lockfile
bun run test
bun run lint
bun run build
bun run dev -- --host 127.0.0.1
```

QA từ gốc repo, app đang chạy:

```powershell
$env:PHASE1_QA_ALLOW_WRITES = 'main' # Ghi QA, tiêu thụ bàn; kiểm readiness trước.
node scripts/phase1-api-check.mjs
New-Item -ItemType Directory -Force .cache/phase1-browser | Out-Null
bun add --cwd .cache/phase1-browser playwright@1.64.1
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase1-browser/node_modules/playwright/index.mjs).Path
node scripts/phase1-browser-check.mjs
Remove-Item Env:PHASE1_QA_ALLOW_WRITES
node scripts/phase1-visual-check.mjs
```

API script ghi dữ liệu QA, cần ít nhất 5 bàn AVAILABLE không có upcomingReservation; browser luồng mở phiên cần thêm bàn trống và một bàn có đặt trước gần giờ (seed lần đầu có). Mỗi lần chạy sẽ tiêu thụ bàn vì chưa có đóng phiên. Không chạy lại toàn bộ trên trạng thái sau QA này mà không chuẩn bị lại dữ liệu demo; script không tự reset. Unit test, visual-check và DB snapshot có thể chạy lại mà không mở thêm phiên. Browser script dùng qa-context.json do API script sinh, nên không phụ thuộc một fixture cache có sẵn từ máy này. API_URL/FRONTEND_URL/DEMO_PASSWORD/BROWSER_CHANNEL có thể cấu hình; token chỉ giữ trong bộ nhớ.

Đọc schema/count (JDK 21 và pgJDBC đã tải bởi Maven):

```powershell
java -cp '<path-to-postgresql-42.7.13.jar>' scripts/PhaseOneDbCheck.java backend/restaurant-management/application-local.yaml .cache/phase1/db-snapshot.json
```

Kiểm N+1 bằng Hibernate Statistics, từ gốc repo:

```powershell
New-Item -ItemType Directory -Force .cache/phase1/probe | Out-Null
javac -d .cache/phase1/probe scripts/PhaseOneQueryProbe.java
$phaseOneProbePath = (Resolve-Path .cache/phase1/probe).Path
cd backend/restaurant-management
java '-Dloader.main=PhaseOneQueryProbe' "-Dloader.path=$phaseOneProbePath" -cp target/restaurant-management-0.0.1-SNAPSHOT.jar org.springframework.boot.loader.launch.PropertiesLauncher
```

Probe mở app trên port ngẫu nhiên, tắt seed, chỉ đọc floor-plan rồi đóng app; yêu cầu DB có dữ liệu bàn. Kết quả đúng: 3 SQL statements. Để kiểm idempotent seed, chụp count, dừng/khởi động app hai lần với seed=true, chụp lại và so sánh.

Swagger local /swagger-ui.html có đủ endpoint/role/D10. Có thể thử bằng curl với bearer riêng không lưu vào source:

```powershell
curl.exe -H "Authorization: Bearer $env:QA_TOKEN" http://localhost:8080/api/accounts
curl.exe -H "Authorization: Bearer $env:QA_TOKEN" 'http://localhost:8080/api/menu-items?status=ON_SALE'
curl.exe -H "Authorization: Bearer $env:QA_TOKEN" 'http://localhost:8080/api/reservations?date=2026-10-23&page=0&size=20'
```

## Khác biệt, giới hạn và bàn giao Phase 2

- Khác biệt được duyệt: QA trên Neon main thay branch; quyền reset/init demo khi cần. Không có thay đổi nghiệp vụ/schema/API contract khác. D10 và seed độc lập tiếp tục theo quyết định Phase 0.
- Các trang còn lại giữ khung. CASHIER/OWNER xem sơ đồ, trạng thái và mã phiên; nút điều hướng Xem phiên chỉ cho WAITER/MANAGER theo guard /sessions/:id hiện có. Chưa mở rộng màn chi tiết cho role khác.
- Mục 15 chưa kiểm snapshot giá, mục 16 chưa kiểm UI gọi món; không có GET /api/sessions/{id}, gọi món, SSE hay thanh toán/kho đầy đủ.
- Chưa kiểm Edge thật; tài khoản khóa/ingredient inactive/table inactive đã có unit test, không đổi thủ công master data trên Neon để tạo fixture bất hoạt. Visual/fieldErrors mock chỉ kiểm nhánh hiển thị lỗi, các luồng nghiệp vụ còn lại gọi API thật.
- Phase 2 thêm publish ở vị trí comment trong ReservationServiceImpl/ServiceSessionServiceImpl, giao sự kiện sau commit và không publish PATCH no-op. Thêm GET session/detail UI, snapshot giá khi tạo OrderItem và tiêu hao sau đó; không suy ra phần này đã hoàn thành từ entity/repository hiện có.
- Danh sách 97 file: [phase-1-files.md](phase-1-files.md). Script và test được đưa vào repo; output/ảnh QA nằm trong .cache/phase1, được sinh lại bằng lệnh trên.
