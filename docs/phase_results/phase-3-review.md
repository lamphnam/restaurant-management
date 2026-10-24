# Sửa review PR #3 — Phase 3

Ngày thực hiện: **23/10/2026**. Baseline: branch `feat/phase-3-implement`, commit
`72d1bdcb0f2f7b9e13a1270bb5ebc676974a6d11`. GitHub API xác nhận PR #3 đang mở và head
khớp commit này. Working tree sạch trước khi sửa; chưa commit/push.

Bàn giao tiếp theo: [PHASE_4_HANDOFF](../PHASE_4_HANDOFF.md),
[hướng dẫn](../phase_instructions/phase-4.md), [prompt](../phase_instructions/phase-4-prompt.md),
[checklist 1–36 chưa chạy](../phase_instructions/phase-4-checklist.md).
Lượt đồng bộ tài liệu sau review không phải một lượt chạy code/QA Phase 4 mới.

Nguồn đối chiếu: `AGENTS.md`, `CLAUDE.md`, master Spring/React §10–14, §16.3, §18,
§20–21; hướng dẫn/prompt/bàn giao Phase 3, TRACEABILITY và báo cáo triển khai Phase 3.
Phạm vi: BR-02/06/09, FR-09/12–16, NFR-02/03/06/11; UC10.1/10.2/10.3,
UC6.3/11.1, checklist 24–28/32. Không triển khai Phase 4.

## 1. Kết quả đối chiếu và sửa

| Mục review | Hiện thực cuối |
|---|---|
| 1 — Form gửi tồn cũ/0 ngoài ý muốn | Tồn hệ thống vẫn hiển thị; ô thực đếm ban đầu trống. Payload chỉ gồm dòng đã nhập số thực tế. Xóa ô → `null` → bỏ dòng; nhập 0 rõ ràng vẫn gửi 0. Ghi chú đơn thuần không đánh dấu đã đếm. Chặn phiếu rỗng, khóa input/nút khi đang lưu, reset sau thành công. Có nhãn truy cập và hướng dẫn phân biệt trống/0. Bảng cuộn ngang ở màn hẹp. |
| 2 — Kiểm kê thiếu khóa Ingredient | Kiểm tra ID trùng trước; khóa tất cả Ingredient theo ID tăng dần bằng `findLockedById` trước bất kỳ SUM nào. Khóa cùng dòng cha với disposal; D7 đọc lại tổng khi đã có khóa. Giữ thứ tự dòng theo request trong response. |
| 3 — Seed có thể tạo actual âm, bỏ qua workflow | Tồn đầu là 10 số thực đếm cấu hình không âm, không suy từ `system` hay `system - 2`. Kiểm kê trước phiếu nhập demo lô/HSD. Service tính SUM thực theo D7, kể cả ledger đang âm; không giả system=0 và không sửa lịch sử. Seeder gọi `createStocktakeForSeed`/`createReceiptForSeed` dùng chung hàm workflow với API, truyền Account HEAD_CHEF nội bộ, không dựng JWT cho seeder. Giữ gate độc lập; danh mục thiếu/ngừng dùng thì bỏ cả khối và log. |
| 4 — Thanh toán còn hiện món chờ phục vụ | Thêm prefix `['awaiting-service']` vào invalidation của `FLOOR_PLAN`. Giữ loại event/đường phát AFTER_COMMIT và API thanh toán hiện có. |
| 5 — NVL ngừng dùng/ID trùng | Backend trả `INGREDIENT_INACTIVE` cho NVL ngừng dùng; ID trùng trả `INVALID_STOCKTAKE`, thông báo “Nguyên vật liệu bị trùng trong phiếu kiểm kê”. Từ chối trước khi lưu phiếu/đọc ledger. |
| 6 — Hai bean IngredientService | Xóa `IngredientService`/`IngredientServiceImpl`, bỏ kế thừa và `list()` sao chép. Controller tiếp tục dùng `listIngredients`; lookup RecipeDrawer vẫn nhận các trường cũ. |
| 7 — N+1 | `InvoiceRepository` và `StockMovementRepository` fetch graph các quan hệ to-one mapper cần. Receipt/stocktake lấy trang trước, fetch join chi tiết cho đúng tập ID trong trang rồi map theo thứ tự trang. Không phân trang trên collection fetch join; không bật batch toàn ứng dụng. |
| 8 — var trong mapper | Dùng kiểu tường minh IngredientLot/FoodOrder/ServiceSession/DiningTable/DiningArea, format google-java-format 1.28.0 AOSP. |
| 9 — PageResponse frontend trùng | Hai API cùng import `PageResponse` từ `types/tables.ts`; bỏ type trong paymentApi và phụ thuộc inventoryApi → paymentApi. |

Không đổi schema, 18 bảng, role, status hoặc rule D5/D8/D10/D12. Bổ sung khóa kiểm kê
theo yêu cầu review; bảng khóa §16.3 ở baseline trước đó để dấu “—”. Lượt đồng bộ
tài liệu đã cập nhật master để phản ánh khóa kiểm kê/FLOOR_PLAN invalidation/seed hiện tại.
Không thêm cảnh báo template đổi trước submit (mục 1 tùy chọn): số thực đếm được nhập
tường minh và backend tính tồn lại sau khóa. Seed mới chỉ tác động khi gate chưa có
giao dịch; dữ liệu demo hiện có không được refresh/ghi đè lúc khởi động.

## 2. Kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| Backend `clean verify`, Java 21 | **187 tests**, 0 failures/errors/skipped; JAR build thành công (+11 so baseline) |
| Frontend `bun run test` | **26 tests / 77 assertions**, 0 failures |
| Frontend `bun run build` / `bun run lint` | PASS / PASS |
| Browser mocked API | **16/16 nhóm ca**, 1024px và 375px, normal/reduced motion; không page error hoặc API ngoài fixture |
| Neon read-only service probe | **10/10 checks**; số bản ghi trước/sau giống nhau |
| Neon concurrent service probe | **22/22 checks** trong lượt hoàn tất, gồm query count, readiness, validation và khóa thật |

Unit test mới kiểm: mọi khóa trước SUM và tăng dần dù request đảo thứ tự; duplicate;
inactive; kiểm kê qua seed helper với system=-3, actual=0.5 → difference=+3.5 không JWT;
fetch chi tiết giữ thứ tự/total của trang; seed thứ tự, gate độc lập/idempotent,
nonnegative actual, thiếu/inactive catalog, tài khoản bị khóa và app.seed=false.
Test realtime gọi hàm invalidation thật với cache TanStack, xác nhận prefix danh sách
món chờ phục vụ bị invalidate khi nhận FLOOR_PLAN.

Browser chạy app thật qua Vite nhưng chặn toàn bộ `/api/`: kiểm ban đầu trống,
chỉ ghi chú, nhập rồi xóa, stock hệ thống 10→9 trong lúc form cũ còn mở nhưng chỉ đếm
Trứng, explicit zero, payload chỉ gồm dòng đã đếm, reset sau lưu và Popconfirm ở cả
hai chế độ chuyển động. Đây không phải browser QA ghi Neon.

Số SQL thực đo bằng Hibernate Statistics, mỗi lời gọi service có transaction riêng:

| API danh sách | size=1 | size=50 |
|---|---:|---:|
| Invoices | 2 | 1 |
| Movements | 2 | 1 |
| Receipts | 3 | 2 |
| Stocktakes | 3 | 2 |

Trang cuối không đầy không cần count query. Cả bốn luồng không tăng SELECT theo số
dòng; query filter/page và mapper chạy trên Neon thật, seed=false.

Ca concurrent thật giữ giao dịch A mở sau workflow, gọi B trên worker/connection khác:

- Hai kiểm kê actual=8 từ tồn 10: B chưa hoàn tất khi A giữ khóa; A điều chỉnh -2,
  B đọc system=8 và difference=0. Không nhân đôi điều chỉnh.
- Disposal 3 từ tồn 8 giữ khóa chưa commit: kiểm kê B chờ; sau commit B đọc system=5,
  actual=8 → adjustment +3, cuối cùng SUM=8.

Không chạy lại toàn bộ 111 live API checks của lần triển khai gốc; không gộp số cũ
vào lượt review. Seed trên database rỗng/tồn âm được kiểm bằng unit test, không reset
Neon để dựng lại trạng thái này. Browser Edge và payment→SSE trên hai trình duyệt thật
không được chạy trong lượt này; regression cache/event có unit test.

## 3. Tác động Neon main

Đã chạy readiness chỉ đọc trước ghi. QA writes chỉ bật cho đúng lượt bằng
`PHASE1_QA_ALLOW_WRITES=main`. Một lượt probe ban đầu dừng do setup authentication
của chính probe chưa đặt authorities; đã sửa probe và dùng lại **cùng NVL ID 18**,
không tạo thêm NVL để thử lại. Lượt hoàn tất chạy đủ 22 checks.

| Bảng | Trước toàn bộ review | Sau toàn bộ review | Tăng |
|---|---:|---:|---:|
| ingredient | 17 | 18 | 1 |
| ingredient_lot | 4 | 4 | 0 |
| stock_receipt | 8 | 9 | 1 |
| stock_receipt_item | 18 | 19 | 1 |
| stocktake | 6 | 12 | 6 |
| stocktake_item | 15 | 21 | 6 |
| stock_movement | 42 | 48 | 6 |
| invoice | 4 | 4 | 0 |
| service_session | 12 | 12 | 0 |

NVL mới có tên `[QA] Phase3 review ...`, ID 18, đơn vị kg; tồn cuối **8 kg** và
đã chuyển INACTIVE để không xuất hiện ở form nghiệp vụ mới. Tất cả nghiệp vụ ghi qua
service, giữ audit/head chef và ledger. Không reset, xóa/sửa movement, sửa lịch sử
CONSUMPTION, thanh toán hoặc mở/đóng phiên. Seed tắt trong tất cả live probes.

## 4. File thay đổi

Trong backend `src/main/java/vn/ueh/kltn/restaurant/`:

- `service/InventoryService.java`, `service/impl/InventoryServiceImpl.java`.
- Xóa `service/IngredientService.java`, `service/impl/IngredientServiceImpl.java`.
- `seed/PhaseThreeSeeder.java`.
- `mapper/InventoryMapper.java`, `mapper/PaymentMapper.java`.
- `repository/InvoiceRepository.java`, `StockMovementRepository.java`,
  `StockReceiptRepository.java`, `StocktakeRepository.java`.
- Tests: `InventoryServiceImplTest.java`, `PhaseThreeSeederTest.java`.

Frontend: `src/pages/inventory/StocktakePage.tsx`, `src/realtime/invalidation.ts`,
`src/api/inventoryApi.ts`, `src/api/paymentApi.ts`, `tests/realtime.test.ts`.

QA: `scripts/PhaseThreeReviewProbe.java`, `scripts/phase3-review-browser-check.mjs`.
Docs: báo cáo này, TRACEABILITY, AGENTS và CLAUDE cập nhật bằng chứng review.

## 5. Chạy lại

Backend cwd `backend/restaurant-management`, dùng Java 21 và cache trong workspace:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
$env:MAVEN_USER_HOME = 'D:\capstone_project_ueh\.cache\maven'
.\mvnw.cmd '-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository' clean verify
.\mvnw.cmd '-Dmaven.repo.local=D:\capstone_project_ueh\.cache\maven\repository' dependency:build-classpath '-Dmdep.outputFile=D:\capstone_project_ueh\.cache\phase3-review-classpath.txt'
$probeClasspath = 'target/classes;' + (Get-Content -Raw ../../.cache/phase3-review-classpath.txt).Trim()
& "$env:JAVA_HOME/bin/java.exe" -cp $probeClasspath ../../scripts/PhaseThreeReviewProbe.java
```

Probe mặc định chỉ đọc; cần cổng 8080 trống và cấu hình local hiện có. Chỉ khi muốn
tạo lại QA history: đặt cờ writes theo quy định rồi thêm `--writes`. Có thể thêm
`--ingredient-id=18` để dùng lại fixture review này; script xác minh tên prefix,
kích hoạt tạm, kiểm kê về 10, chạy ca và ngừng dùng lại. Không chạy nhầm trên NVL khác.
Đây là kiểm thử service/transaction, không phải HTTP authorization QA; disposal dùng
authentication nội bộ riêng trong probe, seeder không dùng authentication giả.

Browser cwd repo root, Vite chạy cổng 5173:

```powershell
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase0/browser/node_modules/playwright/index.mjs).Path
node scripts/phase3-review-browser-check.mjs
```

Log/ảnh trong `.cache/phase3-review*`, gitignored. Build/test/frontend commands giữ
nguyên hướng dẫn dự án. Không thêm dependency, migration hoặc reset script.
