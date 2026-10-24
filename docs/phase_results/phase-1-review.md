# Sửa review Phase 1 — PR #1

Ngày kiểm tra: 22/10/2026, Asia/Ho_Chi_Minh. Branch: `feat/phase-1-implement`.
Đã xử lý 7 mục review. Chưa commit/push các thay đổi lần này; không triển khai Phase 2.

Đã chuẩn bị tài liệu nối tiếp: [PHASE_2_HANDOFF](../PHASE_2_HANDOFF.md),
[hướng dẫn Phase 2](../phase_instructions/phase-2.md) và
[prompt triển khai](../phase_instructions/phase-2-prompt.md).
Việc chuẩn bị tài liệu không chạy lại QA hoặc thay đổi dữ liệu; số liệu dưới đây thuộc đợt sửa review.

## Kế hoạch và phạm vi

Giữ FR-01/UC4, FR-02/UC5, FR-03/UC7, FR-04/UC8.1 và FR-18 trong phạm vi Phase 1.
Các bảng liên quan: menu_item, recipe_item, ingredient, reservation, dining_table, service_session;
Account và các controller chỉ được kiểm bảo vệ quyền/chuẩn hóa phong cách. Không đổi schema,
V1, trạng thái, role, D10 hoặc seed gate. Không thêm bảng/API đóng phiên hay luồng gọi món.

Trước khi sửa đã chốt: sửa định lượng và lock trước, tách query của modal, sửa ánh xạ constraint,
thêm kiểm tra annotation, chuẩn hóa Java, guard QA và kiểm thử lại. Hai điều chỉnh được yêu cầu
trong review là cho giữ NVL đã ngừng và thêm bộ lọc đặt bàn; đã đồng bộ master spec và prompt Phase 1.

## Các mục đã sửa

| Mục | Thay đổi | Bằng chứng |
|---|---|---|
| 1 | Chỉ yêu cầu ACTIVE với NVL mới thêm; dòng đã có vẫn giữ/sửa số lượng được. Lỗi thêm NVL đã ngừng nêu tên NVL. | Unit test giữ dòng inactive và sửa dòng khác; các test từ chối NVL inactive mới/trùng/thiếu/số lượng không hợp lệ vẫn pass. |
| 2 | `findLockedById` dùng PESSIMISTIC_WRITE trên MenuItem trước khi đọc recipe và tính diff, kể cả recipe rỗng. | Unit test thứ tự gọi; 10 vòng OWNER/HEAD_CHEF PUT đồng thời trên Neon: cả hai 200, kết quả cuối bằng đúng một request, không hợp hai danh sách/409/500. |
| 3 | GET reservations thêm `tableId`, `unexpired` (mặc định false, true → endTime > now). Modal dùng query chỉ khi mode đặt trước, không quét toàn quán; trang tiếp tải bằng nút. Walk-in không bị pending/error của query khóa. | 24 kiểm tra API theo 12 bàn; unit test predicate và giữ lịch sử mặc định; Chrome kiểm pending, HTTP 500, mode walk-in, phân trang 101 dòng. |
| 4 | Chỉ constraint `uq_active_session_table` được đổi thành SESSION_ALREADY_ACTIVE. DVI khác được ném lại để handler trả DATA_CONFLICT. | Unit test active-session unique, unique reservation, FK/không phân loại; bộ test handler 409 có sẵn vẫn pass. |
| 5 | Reflection quét handler trong package controller, bắt thiếu @PreAuthorize cấp class/method. Chỉ miễn đúng AuthController.login(LoginRequest), không miễn cả controller. | Quét handler thật và fixture âm/dương; ma trận 6 role × 19 endpoint hiện có vẫn chạy. |
| 6 | Chuẩn hóa 65 file Java trong phạm vi Phase 1: import tường minh, rút FQN trong code, kiểu tường minh với kết quả repository/Optional/thời gian; chỉ giữ var khi khởi tạo new hiển nhiên. Mỗi lệnh một dòng. | google-java-format 1.28.0 chế độ AOSP; 0 wildcard import trong phạm vi sửa; clean verify pass sau định dạng. Không thay chuỗi JPQL hoặc logic seed. |
| 7 | Guard `PHASE1_QA_ALLOW_WRITES=main` trước HTTP/browser setup cho các script ghi dữ liệu. Thêm kiểm tra demo chỉ đọc và script hồi quy không mở phiên. Ghi nguồn quyền dùng main/reset từ chỉ dẫn cũ của chủ dự án. | 4 test guard pass, script readiness đã chạy; không reset hoặc mở phiên trên Neon trong lần sửa này. |

Reflection test ngăn việc quên annotation. Nó không đổi thứ tự xử lý của Spring MVC:
request body sai có thể bị validation trả 400 trước khi method security trả 403.
Ma trận quyền dùng body hợp lệ. Không thêm nguồn phân quyền URL trùng @PreAuthorize.

## Build và kiểm thử mới

| Kiểm tra | Kết quả |
|---|---|
| Backend `mvnw.cmd clean verify` | PASS: 83 test, 0 failure/error/skipped; JAR tạo thành công |
| Frontend `bun run build` | PASS: TypeScript + Vite production build |
| Frontend `bun run lint` | PASS |
| Frontend `bun run test` | PASS: 13 test, 27 assertions |
| `node --test scripts/tests/qa-write-guard.test.mjs` | PASS: 4 test |
| `phase1-review-api-check.mjs` trên app/Neon thật | PASS: 46 kiểm tra, gồm 10 vòng PUT đồng thời |
| `phase1-review-browser-check.mjs` | PASS: 7 kiểm tra Chrome headless, 0 lỗi JavaScript, tablet 1024×768 |
| Schema/count chỉ đọc | PASS: 18 bảng, 106 cột, 31 FK RESTRICT, 5 partial unique index |
| Git diff whitespace | PASS |

Browser hồi quy lần này mock toàn bộ `/api/*`, gồm login và mở phiên; không gửi POST sessions
đến Neon. API hồi quy dùng backend mới và Neon main thật. Các số 186 API/17 browser/5 visual
trong báo cáo Phase 1 là bằng chứng nghiệm thu ban đầu, không phải số chạy lại trong lần sửa này.
Không chạy lại toàn bộ checklist 5–13, 15–16 vì script cũ tiêu thụ bàn; xem báo cáo ban đầu
cho các luồng không đổi. Lần này tập trung các nhánh bị review và giữ số phiên/bàn không đổi.

## Tác động dữ liệu và độ tươi demo

Lúc kiểm readiness (23:36 ngày 22/10): 9 phiên đang hoạt động, 3 bàn AVAILABLE,
7 đặt bàn CONFIRMED (2 đã hết giờ, 5 chưa hết giờ), 2 bàn có badge sắp có khách.
Chưa có đặt bàn CONFIRMED cho ngày 27/10 theo giờ Việt Nam. Đây là snapshot hiện tại;
báo cáo nghiệm thu trước đó ghi 8 phiên/4 bàn trống ở thời điểm khác.

API hồi quy tạo đúng một món `[QA] Review recipe …` (id 13), chỉ thay định lượng của món này.
Sau khi xong đã PUT lines rỗng và discontinue món QA. Số phiên, trạng thái từng bàn và
activeSessionId trước/sau giống nhau. Không sửa dữ liệu ingredient để tạo ca inactive,
không đổi ngày seed, không reset hoặc chỉnh lịch sử. Trước demo cần chuẩn bị đặt bàn mới qua app.

Quyền QA trên main/reset đã có từ chỉ dẫn của chủ dự án ngày 22/10:
“cứ làm trên branch main của Neon không cần tạo thêm gì nữa hết. Nếu lỗi cứ reset và init lại data”.
Lần này chỉ thêm guard để tránh chạy nhầm script; không có reset tự động.

## Lệnh tái lập

Backend, trong `backend/restaurant-management`:

```powershell
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

Máy hiện tại dùng `MAVEN_USER_HOME=.cache/maven` và
`-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository`, có thể thêm `-o` khi đã đủ dependency.
Trước restart đã xác minh đúng backend của dự án trên cổng 8080; Vite trên 5173 được giữ nguyên.
Cấu hình local và mật khẩu không đưa vào source/report.

Frontend, trong `frontend`:

```powershell
bun run test
bun run lint
bun run build
bun run dev -- --host 127.0.0.1
```

Từ gốc repo, app đang chạy:

```powershell
node --test scripts/tests/qa-write-guard.test.mjs
node scripts/phase1-demo-readiness.mjs # Login + GET, không ghi nghiệp vụ

# Hồi quy UI: API mock, không chiếm bàn. Cài Playwright vào cache nếu chưa có.
bun add --cwd .cache/phase1-browser playwright@1.64.1
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase1-browser/node_modules/playwright/index.mjs).Path
node scripts/phase1-review-browser-check.mjs

# API thật: thêm một món QA, chạy PUT đồng thời, dọn định lượng/ngừng món; không mở phiên.
$env:PHASE1_QA_ALLOW_WRITES = 'main'
try { node scripts/phase1-review-api-check.mjs }
finally { Remove-Item Env:PHASE1_QA_ALLOW_WRITES }
```

Script ghi dữ liệu sẽ từ chối ngay khi thiếu flag. API_URL, FRONTEND_URL, DEMO_PASSWORD,
BROWSER_CHANNEL và PLAYWRIGHT_MODULE có thể cấu hình. Không chạy script QA đầy đủ cũ
trên trạng thái hiện tại: API script cũ cần ít nhất 5 bàn trống; chỉ còn 3.
JSON kết quả được sinh trong `.cache/phase1-review/`; script/test tái lập nằm trong Git.

## Giới hạn và bàn giao

- Ca giữ NVL inactive và ánh xạ các constraint khác được kiểm bằng unit test; không đổi tay dữ liệu Neon để tạo chúng.
- Chưa kiểm Edge hoặc thiết bị tablet thật; kiểm Chrome headless với viewport tablet.
- Không thu hồi JWT, không sửa migration, không thêm schema hoặc triển khai Phase 2. Khi thêm handler mới giữ test annotation; khi thêm luồng ghi recipe khác phải dùng cùng khóa MenuItem.
- Thay đổi hợp đồng có chủ đích: bộ lọc tableId/unexpired tùy chọn. Thay đổi quy tắc có chủ đích: cho giữ/sửa dòng inactive đã có theo yêu cầu review; dòng thêm mới vẫn phải ACTIVE. Đã ghi master §12.5/§13.4/§16.3 và prompt Phase 1.
- Danh sách file sửa/tạo: [phase-1-review-files.md](phase-1-review-files.md). Phần lớn diff Java là định dạng/import/kiểu tường minh theo mục 6.
