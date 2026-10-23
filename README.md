# Quản lý quán ăn phục vụ tại bàn — KLTN UEH

Prototype nội bộ cho quán ăn khoảng 30–50 bàn, hỗ trợ bán hàng tại bàn và kho NVL.
Đặc tả chính: [master Spring/React](CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md).
Tra cứu tài liệu: [docs/README](docs/README.md).

## Trạng thái ngày 23/10/2026

**Phase 0–3 và các sửa review đã có trong code. Phase 4 đã chuẩn bị tài liệu, chưa triển khai.**
Branch baseline `feat/phase-3-implement`, HEAD `72d1bdc` của PR #3; các sửa review và
tài liệu còn chưa commit/push. Kiểm `git status` trước khi làm việc và giữ thay đổi hiện có.

- JWT/6 vai trò, tài khoản, thực đơn/định lượng, sơ đồ bàn, đặt bàn, mở phiên.
- Gọi/gọi thêm/hủy món, bếp, tiêu hao, xác nhận phục vụ; SSE sau commit và polling 30s.
- Thanh toán/hóa đơn: snapshot giá, chặn PENDING/COOKING, cho READY và 0đ, đóng phiên `CLOSED`, trả bàn.
- Kho: danh mục, D12, nhập/lô/HSD, tồn từ SUM ledger, kiểm kê D7, xuất hủy, cảnh báo và lịch sử.
- Review PR #3: form chỉ gửi số thực đếm; kiểm kê khóa Ingredient tăng dần, chặn trùng/inactive;
  seed tồn đầu không âm qua service; làm mới món chờ phục vụ sau payment; sửa N+1 và code/type trùng.
- `/reconciliation` và `/reports` hiện vẫn là placeholder. Chưa có `/api/reconciliations/**`
  hoặc `/api/payments/summary`.

| Bằng chứng | Kết quả |
|---|---|
| [Review Phase 3](docs/phase_results/phase-3-review.md) | 187 backend tests; 26 frontend tests / 77 assertions; hai build và lint PASS |
| Browser review | 16 nhóm ca API mock, desktop/mobile viewport và normal/reduced motion |
| Neon review | 10 checks chỉ đọc; 22 checks service/transaction thật, có race kiểm kê/disposal |
| [Phase 3 ban đầu](docs/phase_results/phase-3.md) | 176 backend tests; 25 frontend / 76 assertions; 111 API checks (mốc cũ) |

Các số liệu là những lượt kiểm riêng, không cộng dồn hoặc thay cho nghiệm thu Phase 4.
Lịch sử review [Phase 1](docs/phase_results/phase-1-review.md),
[Phase 2](docs/phase_results/phase-2-review.md), [popup](docs/phase_results/phase-2-popup-fix.md) vẫn phải bảo toàn.

## Bắt đầu Phase 4 khi được yêu cầu

1. Đọc [bàn giao Phase 4](docs/PHASE_4_HANDOFF.md) để nắm code, baseline, dữ liệu và các giới hạn.
2. Dùng [hướng dẫn](docs/phase_instructions/phase-4.md) và [prompt triển khai](docs/phase_instructions/phase-4-prompt.md).
3. Ghi bằng chứng vào [checklist Phase 4](docs/phase_instructions/phase-4-checklist.md) khi thực sự chạy.

Phần còn lại: FR-10/UC11.2 đối soát, FR-17/UC6.1 báo cáo, kiểm 33–36 và hồi quy 1–36,
chốt tài liệu/demo. Không tự thêm tính năng đã cắt hoặc bắt đầu code từ việc đọc tài liệu.

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

JUnit/Mockito không cần DB; `contextLoads()` mặc định đã bỏ. Baseline mới nhất là 187 tests,
không phải chỉ 6 tests: §21.1 là sáu **nhóm ca bắt buộc**. Phase 4 phải giữ toàn bộ baseline.

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
| 0900000001 | OWNER | `/reports` — placeholder trước Phase 4 |
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

QA review để lại NVL `[QA]` ID 18 INACTIVE, tồn 8 kg. Snapshot cuối 23/10:
18 NVL, 9 receipts, 12 stocktakes, 48 movements, 4 invoices, 12 sessions.
Đây là mốc đã ghi nhận; đọc readiness/API lại trước demo. Lần đọc gần nhất thấy
4 bàn trống/8 phiên ACTIVE, chưa có đặt bàn ngày 27/10. Khi cần, tạo giao dịch mới
qua workflow; không sửa seed cũ để làm mới ngày.

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

Test/build của lượt sửa code trước đã PASS; lượt cập nhật tài liệu không phải một lượt nghiệm thu mới.

## Backup/restore (TR-09)

Giữ Neon `main` theo lựa chọn của chủ dự án. Hướng dẫn có sẵn không đồng nghĩa đã
thực diễn restore; TR-09 vẫn cần ghi bằng chứng ở Phase 4. Branch/snapshot demo là
tùy chọn chuẩn bị khi chủ dự án cần, không tự tạo từ việc cập nhật tài liệu.
PostgreSQL client tools dùng phiên bản tương thích server:

```powershell
pg_dump '<neon-direct-connection-uri>' -Fc -f backup.dump
pg_restore --clean --no-owner -d '<neon-direct-connection-uri>' backup.dump
```

`pg_restore --clean` thay các đối tượng database đích. Chỉ thực hiện khi đã xác định
đúng phạm vi phục hồi; không chạy để kiểm tài liệu. Không thêm script backup riêng.
Giữ `.dump` và credentials ngoài Git.
