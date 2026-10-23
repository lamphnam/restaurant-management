# Review giao diện Phase 4 — báo cáo, tài khoản và kiểm kê

Thực hiện **23/10/2026**, Asia/Ho_Chi_Minh, theo phản hồi trực tiếp của chủ dự án:
báo cáo cần xem từng ngày trong tháng/ngày cao nhất, tài khoản cần tìm nhân viên,
kiểm kê cần nút điền số thực tế bằng tồn đang hiển thị khi đã đếm thấy khớp.

Branch thực tế `feat/phase-4-implement`, HEAD nền `28bd527`.
Giữ toàn bộ working tree Phase 4 đã có; không reset/stash/discard, không commit/push.
[Phase 4 ban đầu](phase-4.md) là bằng chứng trước review, không cộng số tests/checks lịch sử
vào kết quả dưới đây. Đây là cải thiện FR-01/UC4, FR-14/UC10.1, FR-17/UC6.1 được người dùng giao;
không đổi nghiệp vụ, schema, role hoặc status, không thêm chức năng đã cắt.

## Thay đổi đã triển khai

### OWNER — báo cáo ngày/tháng

- Giữ khoảng ngày tùy chọn và mặc định hôm nay; thêm chọn tháng, nút Hôm nay/7 ngày qua/Tháng này.
- Bảng từng ngày: ngày, số hóa đơn, tiền mặt, chuyển khoản, doanh thu. Hiển thị cả ngày không
  có hóa đơn bằng 0đ; phân trang 10/20/31 dòng, không tạo hàng chục nghìn dòng cho kỳ dài.
- Chỉ số: ngày doanh thu cao nhất, giữ tất cả ngày đồng hạng có doanh thu dương;
  bình quân/hóa đơn, bình quân/ngày lịch trong kỳ và số ngày có hóa đơn.
  Không chọn một ngày giả khi toàn kỳ 0đ; hóa đơn 0đ vẫn tăng count/ngày có hóa đơn.
- Backend tính các chỉ số; số bình quân làm tròn HALF_UP đến đồng để hiển thị.
  Tổng tiền hóa đơn không bị làm tròn hoặc tính lại ở frontend.
- Giữ doanh thu tổng/phương thức/top món và thông tin kho hiện tại; lỗi tải doanh thu
  ẩn số liệu phân tích/top cũ, các khối kho vẫn xử lý lỗi độc lập.

`GET /api/payments/summary?from&to` giữ `revenue`, `topItems`, thêm:

| Field | Nội dung |
|---|---|
| `dailyRevenue` | Ngày có hóa đơn, tăng dần: `{date, invoiceCount, revenue, cashRevenue, bankTransferRevenue}` |
| `analysis` | `{averageInvoiceAmount, averageDailyRevenue, peakRevenue, peakDates, activeDays, calendarDays}` |

Chỉ lấy `Invoice`, lọc `paidAt >= from AND paidAt < to` theo D9; nhóm ngày bằng timezone
cấu hình ứng dụng (`Asia/Ho_Chi_Minh`). Khoảng API bất kỳ đếm các ngày lịch có giao với
`[from,to)`, không thêm ngày mới nếu `to` đúng nửa đêm. Tổng, daily và top chạy trong cùng
transaction read-only REPEATABLE_READ. Summary hiện **3 SQL** thay vì 2 trước review.
Không đổi `listInvoices` đang dùng `<=to`, không join chi tiết để tính tổng hóa đơn.

### OWNER — tìm tài khoản

- Ô tìm có nút Tìm kiếm/Enter, tên có dấu hoặc không dấu, SĐT đầy đủ/một phần/có khoảng trắng.
- Lọc thêm vai trò/trạng thái, số kết quả, Đặt lại và thông báo khi không tìm thấy.
- Lọc toàn bộ danh sách API trả về trước phân trang 20 dòng; đổi bộ lọc quay về trang đầu.
  Sau khóa/mở khóa vẫn refetch và giữ bộ lọc, thao tác dùng đúng ID của dòng tìm thấy.
- Không đổi API/quyền/D10; thao tác chính mình vẫn bị vô hiệu hóa và backend vẫn chặn.

### HEAD_CHEF — khớp tồn khi kiểm kê

- Nút **Khớp tồn hệ thống** từng dòng sao chép số đang hiển thị vào ô thực tế sau thao tác
  người dùng; tooltip nhắc chỉ bấm khi đã đếm thấy khớp. Không tự chọn các dòng khác.
- Ô thực tế vẫn trống ban đầu. Xóa ô bỏ dòng; chọn số 0 vẫn gửi 0. Ghi chú đơn thuần không
  tạo dòng đã đếm; đang lưu thì khóa input/nút. Không sao chép tồn âm vào actual không âm.
- Số đã chọn là actual tường minh; nếu kho đổi trước lúc lưu, backend vẫn khóa Ingredient
  và tính lại `systemQuantity`/difference theo D7. Không gửi systemQuantity/difference từ UI.
- Sửa tràn ngang lịch sử kiểm kê ở 375px bằng bảng cuộn ngang; tiêu đề xuống dòng và giảm
  padding trên màn hình nhỏ. Giữ CSS reduced-motion `transition: none`.

## Kiểm chứng mới

| Phạm vi | Kết quả của lượt review | Bằng chứng tái tạo (gitignored) |
|---|---|---|
| Backend Java21 `clean verify` | **211 tests**, 0 failures/errors/skipped; JAR PASS | `.cache/phase4-review-clean-verify.log`, `target/surefire-reports/` |
| Frontend `bun run test` | **33 tests / 97 assertions**, 0 fail | output Bun |
| Frontend build/lint | **PASS / PASS**, gồm type-check | output Vite/oxlint |
| Neon query/service chỉ đọc | **70 checks**, đúng18 bảng; before/after counts giống nhau | `.cache/phase4-review-query-probe-final.log` |
| UI review mock — Chrome | **30 nhóm checks**, 1440/768/375px, normal/reduced motion, 0 page errors | `.cache/phase4-review-browser-chrome/results.json`, PNG |
| UI review mock — Edge | **30 nhóm checks**, cùng cấu hình, 0 page errors | `.cache/phase4-review-browser-msedge/results.json`, PNG |
| API/browser/Neon thật chỉ đọc | **11 nhóm checks**, Chrome + Edge; không ghi nghiệp vụ | `.cache/phase4-review-live-readonly/results.json`, PNG |
| Hồi quy đối soát/report mock | **36 checks mỗi Chrome/Edge**, 0 page errors | `.cache/phase4-browser-{chrome,msedge}/results.json` |
| Hồi quy kiểm kê mock | **16 scenarios**, 0 page errors/unexpected endpoints | `.cache/phase3-review/browser-results.json`, `.cache/phase4-review-stocktake-regression.log` |
| Hồi quy popup mock | **59 checks**, 1440/768px normal/reduced motion | `.cache/popup-qa/results.json`, `.cache/phase4-review-popup.log` |

Thêm 5 backend tests cho tháng nhuận/đồng hạng/bình quân, hóa đơn0đ, biên nửa đêm exclusive,
timezone cấu hình và khoảng dài thưa. Thêm 6 frontend tests cho tìm trên120 tài khoản,
dấu tiếng Việt/SĐT/lọc kết hợp và lấp ngày trống/phân trang/tháng nhuận/kỳ dài.

Query probe so native projection với **từng hóa đơn đọc bằng JDBC, nhóm lại bằng Java**
ở Asia/Ho_Chi_Minh và America/Los_Angeles. Với từng paidAt sẵn có, kiểm bắt đầu đúng paidAt
có hóa đơn và kết thúc đúng paidAt loại hóa đơn. Không sửa timestamp hoặc tạo hóa đơn giả.
Đo lại preview1 SQL, summary3; invoices/reconciliations/movements/receipts/stocktakes
giữ tối đa2–3 SQL/trang ở fixture hiện tại. Đây là query count, không phải load benchmark.

Mock UI dùng120 nhân viên, tìm nhân viên111 nằm ngoài trang đầu rồi khóa đúng ID;
báo cáo có2 ngày cao nhất, ngày0đ, ngày thiếu, tháng nhuận và lỗi refetch; kiểm kê có tồn
dương/0/âm, clear/zero/count-only và actual giữ nguyên khi backend trả tồn khác.
Toàn bộ `/api/` kể cả POST/PATCH đều bị mock; các ca đó không chứng minh ghi Neon.
Ngày mock cố định23/10/2026, browser timezone America/New_York.

Lượt thật so báo cáo tháng10 với từng hóa đơn qua API, so peak/averages độc lập,
kiểm tháng2/2028 rỗng và cả5 role ngoài OWNER trả403. Chrome và Edge đăng nhập thật,
xem báo cáo tháng, tìm nhân viên thật và bấm khớp/xóa số trên template kiểm kê thật.
**Không bấm khóa tài khoản hoặc lưu kiểm kê trên Neon trong review này.** Browser chặn
mọi mutation ngoài POST đăng nhập; không có mutation nào bị yêu cầu/chặn, không page error.

## Lỗi phát hiện và sửa khi QA

- **Ngày cuối tháng bị lệch bởi DST của trình duyệt.** Với browser America/New_York,
  `nowInAppZone().endOf('month')` cho kết quả01/11 00:59 thay vì31/10 cuối ngày;
  request tháng10 kết thúc `2026-11-01T18:00:00Z`. Picker report nay giữ ngày lịch thông thường
  dựng từ ngày hôm nay ở Việt Nam, chỉ diễn giải wall-clock sang UTC ở biên gửi.
  Chrome/Edge đã kiểm request đúng `2026-09-30T17:00:00Z` → `2026-10-31T17:00:00Z`,
  tháng nhuận cũng đúng; không sửa timezone/database để làm khớp test.
- **Lịch sử kiểm kê tràn document ở375px** khi đã có dòng lịch sử. Thêm scroll cho bảng
  lịch sử/bảng chi tiết và chỉnh padding/title; kiểm lại không tràn document.
- Lỗi harness đã sửa: InputNumber hiển thị `10.000`, assertion cần so giá trị số10;
  popup script cần trỏ `PLAYWRIGHT_MODULE` tới cache đã cài. Các lượt dừng không được đánh PASS.

## Tác động dữ liệu và giới hạn

Backend do phiên làm việc mở trước đó PID6380 được thay bằng JAR đã build, PID5716,
cổng8080, `app.seed=false`; frontend5173 có sẵn giữ nguyên. Không reset/restore hoặc migration.
Không dùng cờ cho phép ghi QA vì toàn bộ lượt review là chỉ đọc.

Query probe before/after: account9, reservation18, service_session15, food_order22,
order_item30, invoice8, revenue_reconciliation3, ingredient19, ingredient_lot8,
stock_receipt10, stock_receipt_item23, stocktake24, stocktake_item33, stock_movement66.
Snapshot live trước/sau cũng giữ nguyên counts nghiệp vụ/ledger và nguồn movement.
Fixture cũ vẫn giữ nguyên; không thêm nhân viên/phiếu kiểm kê/hóa đơn/đối soát mới.

Báo cáo tháng10 tại thời điểm kiểm có8 hóa đơn, tổng531.058đ, cả doanh thu trong ngày23/10;
đây là dữ liệu demo/QA cũ, không phải doanh thu kinh doanh thực. Nhiều ngày bằng nhau,
120 nhân viên và tồn âm của ca review được kiểm bằng mock riêng.

Không chạy lại các nghiệp vụ ghi của toàn bộ checklist1–36 trong lượt review; bằng chứng đó
vẫn ở Phase4 ban đầu. Chưa kiểm tải hàng trăm tài khoản qua mạng chậm, nhiều người dùng,
tablet vật lý hoặc thực diễn restore. Không thêm lợi nhuận/chi phí vì schema hiện tại không
có dữ liệu kế toán để tính các chỉ số đó. Thực đơn và các trang người dùng đánh giá tạm ổn
không được thay đổi trong review này.

## Chạy lại và demo

Backend đang dùng đúng cấu hình Neon direct/local. Từ repo root, sau khi app chạy:

```powershell
node scripts/phase4-review-browser-check.mjs
$env:BROWSER_CHANNEL='msedge'
node scripts/phase4-review-browser-check.mjs
Remove-Item Env:BROWSER_CHANNEL
node scripts/phase4-review-live-readonly.mjs
```

Script live chỉ đọc, tự chặn mutation UI ngoài login; không cần guard ghi.
Playwright mặc định dùng cache Phase0; đổi `PLAYWRIGHT_MODULE` nếu môi trường khác.
Query probe dùng `PhaseFourQueryProbe.java` **không truyền `--writes`**, seed=false.
Mọi script QA có ghi trong Phase4 ban đầu vẫn cần guard/readiness như trước.

Demo OWNER: Báo cáo → chọn tháng có hóa đơn → xem ngày cao nhất/bình quân/bảng ngày;
Tài khoản → tìm tên không dấu hoặc SĐT → lọc vai trò/trạng thái.
Demo HEAD_CHEF: Kiểm kê → sau khi đã đếm thấy khớp, bấm Khớp tồn hệ thống ở dòng đó;
xóa ô để bỏ qua, nhập0 nếu hết hàng, xác nhận chỉ khi thực sự muốn ghi phiếu.

Các file chính: `InvoiceRepository`, `PaymentServiceImpl`, ba DTO daily/analysis/summary;
`AccountsPage`, `accountFilters`, `StocktakePage`, `ReportsPage`, `DailyRevenueSection`,
`reportDays`, types/CSS, unit tests và hai script review mới cùng query probe.
Master/README/AGENTS/CLAUDE/TRACEABILITY đã cập nhật; V1/18 bảng và IngredientService đã xóa giữ nguyên.
