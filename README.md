# Quản lý quán ăn phục vụ tại bàn — KLTN UEH

Prototype nội bộ cho quán ăn khoảng 30–50 bàn, hỗ trợ bán hàng tại bàn và kho NVL.
Đặc tả chính: [master Spring/React](CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md).
Tra cứu tài liệu: [docs/README](docs/README.md).

## Trạng thái ngày 23/10/2026

**Phase 0–4 đã triển khai**, giữ toàn bộ sửa review. Branch thực tế
`feat/phase-4-implement`, HEAD nền `28bd527`; thay đổi Phase 4 chưa commit/push.
Bằng chứng và giới hạn: [Phase 4](docs/phase_results/phase-4.md),
[review giao diện Phase 4](docs/phase_results/phase-4-review.md),
[checklist 1–36](docs/phase_instructions/phase-4-checklist.md), [TRACEABILITY](docs/TRACEABILITY.md).

- JWT/6 vai trò, tài khoản có tìm tên/SĐT/lọc vai trò/trạng thái, thực đơn/định lượng, sơ đồ bàn, đặt bàn và mở phiên.
- Gọi/gọi thêm/hủy, bếp/tiêu hao/phục vụ; SSE sau commit, reconnect và polling30s.
- Thanh toán/hóa đơn theo snapshot, READY/0đ, đóng phiên/trả bàn atomic.
- Kho: danh mục/D12, nhập/lô/HSD, SUM ledger, kiểm kê D7, xuất hủy và lịch sử.
- Đối soát CASHIER lập/MANAGER xác nhận: Invoice theo `[start,end)`, POST tính lại,
  giữ snapshot; confirm có khóa dòng, lặp/race trả409 theo §12.18.
- Báo cáo OWNER: doanh thu/count/phương thức/top món, tồn thấp/lô chú ý hiện tại,
  10 biến động mới nhất; chọn tháng, bảng từng ngày, ngày cao nhất và bình quân.
  Kiểm kê có nút Khớp tồn hệ thống từng dòng, vẫn giữ D7 và actual ban đầu trống.

| Kiểm chứng mới | Kết quả |
|---|---|
| Backend clean verify | 211 tests, 0 failures/errors/skipped; JAR PASS |
| Frontend test/build/lint | 33 tests/97 assertions; PASS/PASS |
| Review Neon thật chỉ đọc | 70 query checks; 11 nhóm API/browser checks; counts/ledger giữ nguyên |
| API Phase 4 trước review | 152 API checks trong một chuỗi tiếp tục cùng fixture; query/transaction probe riêng |
| Browser | Chrome và Edge thật; mock tách riêng; xem số đo và giới hạn trong báo cáo |
| Restart/reconnect | SSE tự kết nối lại, REST invalidation, seed gates không nhân dữ liệu |

Chưa nghiệm thu tablet vật lý, tải nhiều user hoặc thực diễn backup/restore.
Các báo cáo Phase1–3 là bằng chứng lịch sử, không cộng vào kết quả Phase4.
Không tự mở rộng chức năng đã cắt hoặc commit/push.

## Môi trường và cấu hình

JDK 21, Bun, Git; Maven qua wrapper. Backend là Java 21/Spring Boot 4.1.1,
frontend là React/TypeScript/Vite. Không dùng npm, Docker hoặc database local.
Flyway quản lý đúng 18 bảng domain; `ddl-auto: validate`, không dùng `update`.

Lần thiết lập đầu dùng project/database Neon của chủ dự án, lấy kết nối **direct**
(hostname không có `-pooler`) cho Flyway. Workspace này đã có Neon `main`; không tự
tạo project hoặc branch mới. Cấu hình `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`
qua môi trường hoặc file gitignored `backend/restaurant-management/application-local.yaml`.
File mẫu: [application-local.example.yaml](backend/restaurant-management/application-local.example.yaml).

File local nằm ngoài `src/main/resources`, không được đóng gói vào JAR. Profile `local`
nạp file tương đối với cwd backend; JWT secret ít nhất 32 ký tự. Hikari tối đa 5 kết nối.
Không đưa DB credentials, secret hoặc bearer token vào tài liệu/frontend/log chia sẻ.

## Chạy backend

```powershell
cd D:\capstone_project_ueh\backend\restaurant-management
# Chỉ tạo file nếu chưa có; không ghi đè cấu hình hiện có:
# Copy-Item application-local.example.yaml application-local.yaml
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

API: http://localhost:8080/api. Swagger trong profile local:
http://localhost:8080/swagger-ui.html. Đăng nhập `POST /api/auth/login`, lấy accessToken
và Authorize để gọi API. Ngoài local, Swagger tắt. Auth stateless, không Basic/session cookie.

```powershell
.\mvnw.cmd clean verify
```

JUnit/Mockito không cần DB; `contextLoads()` mặc định đã bỏ. Baseline mới nhất là 211 tests,
không phải chỉ 6 tests: §21.1 là sáu **nhóm ca bắt buộc**. Các thay đổi sau phải giữ toàn bộ baseline.

Nếu môi trường sandbox không ghi được cache mặc định, dùng cache workspace đã có:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
$env:MAVEN_USER_HOME = 'D:\capstone_project_ueh\.cache\maven'
.\mvnw.cmd '-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository' clean verify
```

Đường dẫn JDK trên là đường dẫn đã dùng tại máy này; kiểm lại nếu đổi máy.

## Chạy frontend

```powershell
cd D:\capstone_project_ueh\frontend
bun install
bun run dev
```

Mở http://localhost:5173; Vite proxy `/api` → backend 8080. Ant Design/dayjs dùng tiếng Việt.
Giữ `bun.lock` trong Git. Xem [frontend README](frontend/README.md) về route/query key/UI.

```powershell
bun run test
bun run build
bun run lint
```

## Tài khoản demo, seed và dữ liệu

Mật khẩu demo chung: **Demo@123**; DB lưu BCrypt, không plaintext.

| Số điện thoại | Vai trò | Trang mặc định |
|---|---|---|
| 0900000001 | OWNER | `/reports` |
| 0900000002 | MANAGER | `/reservations` |
| 0900000003 | CASHIER | `/payment` |
| 0900000004 | WAITER | `/floor-plan` |
| 0900000005 | KITCHEN_STAFF | `/kitchen` |
| 0900000006 | HEAD_CHEF | `/kitchen` |

`DataSeeder` @Order(0): app.seed và bảng account rỗng. `PhaseOneSeeder` @Order(1):
gate độc lập cho món/NVL/định lượng/đặt bàn. `PhaseThreeSeeder` @Order(2): gate
stocktake/receipt riêng, kiểm kê tồn đầu cấu hình không âm trước receipt demo lô/HSD,
qua InventoryService; dùng SUM thực nếu đã có tiêu hao. Danh mục thiếu/ngừng dùng
thì bỏ cả khối và báo. Startup không reset, sửa lịch sử hoặc refresh ngày tương đối.

QA Phase4 để lại account9 LOCKED, món23 DISCONTINUED, NVL19 INACTIVE tồn0kg;
NVL review18 vẫn INACTIVE tồn8kg. Sessions13/14/15 đã CLOSED qua payment,
invoices6/7/8 và reconciliations1/2/3 có lịch sử thật. Snapshot cuối:
19 NVL, 10 receipts, 24 stocktakes, 66 movements, 8 invoices, 15 sessions.
Readiness: 5 bàn trống/7 ACTIVE, chưa có booking CONFIRMED ngày27/10.
Đọc readiness/API lại trước demo; chuẩn bị giao dịch mới qua workflow,
không refresh ngày seed hay sửa lịch sử.

D10: khóa account chặn login mới; JWT đã cấp giữ role trong claim đến hết hạn 12h,
kể cả đổi role. `/api/auth/me` dùng role token, tên hiện tại từ DB. Login lại nhận role mới.

## QA và hồi quy

Chạy từ repo root, kiểm đúng process/cổng trước khi dùng app:

```powershell
node scripts/phase1-demo-readiness.mjs
```

Readiness chỉ login/GET. QA ghi trực tiếp Neon `main` theo duyệt của chủ dự án;
script ghi phải bật `PHASE1_QA_ALLOW_WRITES=main` cho đúng lượt. Dùng prefix `[QA]`,
ghi tác động dữ liệu vào báo cáo, không tự reset hoặc trả tiền hàng loạt phiên để dọn bàn.
Đã có payment để đóng phiên qua workflow, nhưng việc chạy lại script vẫn tạo lịch sử thật.

Lệnh/script hiện có:

- [Review Phase 3](docs/phase_results/phase-3-review.md): browser mock và service probe
  (mặc định chỉ đọc; `--writes` cần cờ riêng), query count và concurrency trên fixture review.
- [Phase 3 ban đầu](docs/phase_results/phase-3.md): `scripts/phase3-api-check.mjs` ghi Neon thật.
- [Popup](docs/phase_results/phase-2-popup-fix.md): `popup-browser-check.mjs` mock và
  `popup-live-browser-check.mjs` chỉ đọc thật.

Các script và lệnh Phase4, trước/sau QA và cách dùng guard/resume nằm trong
[báo cáo Phase4](docs/phase_results/phase-4.md). Scripts mock không ghi Neon;
API/live browser/transaction probe có guard và tạo lịch sử thật khi chạy lại.

## Backup/restore (TR-09)

Giữ Neon `main` theo lựa chọn của chủ dự án. Hướng dẫn có sẵn không đồng nghĩa đã
thực diễn restore; lượt Phase4 chưa dump/restore (client tools chưa thấy trên PATH). Branch/snapshot demo là
tùy chọn chuẩn bị khi chủ dự án cần, không tự tạo từ việc cập nhật tài liệu.
PostgreSQL client tools dùng phiên bản tương thích server:

```powershell
pg_dump '<neon-direct-connection-uri>' -Fc -f backup.dump
pg_restore --clean --no-owner -d '<neon-direct-connection-uri>' backup.dump
```

`pg_restore --clean` thay các đối tượng database đích. Chỉ thực hiện khi đã xác định
đúng phạm vi phục hồi; không chạy để kiểm tài liệu. Không thêm script backup riêng.
Giữ `.dump` và credentials ngoài Git.
