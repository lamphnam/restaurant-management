# Checklist nghiệm thu Phase 4 và hồi quy 1–36

Thực hiện **23/10/2026**, Asia/Ho_Chi_Minh, branch `feat/phase-4-implement`, HEAD nền `28bd527`.
Kết quả có phạm vi: API/browser thật khác unit/mock. “PASS” dưới đây là bằng chứng
trong cột cuối, không tuyên bố mọi nhánh đều được nhập tay trên thiết bị vật lý.
[Báo cáo đầy đủ](../phase_results/phase-4.md) ghi số kiểm tra, tác động DB, lỗi và giới hạn.
Nguồn master §21.2; Neon main, readiness trước ghi, guard `PHASE1_QA_ALLOW_WRITES=main`.
Không reset, sửa paidAt/ledger hoặc restore main.

Review giao diện sau nghiệm thu: [phase-4-review.md](../phase_results/phase-4-review.md),
gắn FR-01/UC4 (tìm tài khoản), FR-14/UC10.1 (khớp tồn) và FR-17/UC6.1 (ngày/tháng).
Không coi các ca review chỉ đọc/mock là chạy lại toàn bộ nghiệp vụ ghi checklist 1–36.

Mã bằng chứng:
- **API**: `scripts/phase4-api-check.mjs`, `.cache/phase4-api/results.json` (152 checks, cùng fixture được tiếp tục).
- **LIVE**: `scripts/phase4-live-browser-check.mjs`, `.cache/phase4-live-browser/results.json` (Chrome+Edge, 32 observations có login/guard lặp).
- **SQL/TX**: `scripts/PhaseFourQueryProbe.java`, `.cache/phase4-query-probe.log` (39 chỉ đọc) và `phase4-transaction-probe.log` (60 của lượt sau, không cộng).
- **MOCK**: `phase4-browser-check.mjs`, 36 checks mỗi Chrome/Edge; hồi quy picker7/stocktake16/popup59 qua các script cũ.
- **RECONNECT**: `.cache/phase4-reconnect/results.json`, restart backend thật, không reload browser; proxy HTTP local có5 assertions riêng.
- **STOCK-UI**: `scripts/phase4-stocktake-ui-check.mjs`, browser/API/Neon thật kiểm blank/clear/count-only/explicit0.

## Checklist gốc §21.2

| # | Kết quả cần chứng minh | Kết quả Phase 4 | Bằng chứng mới |
|---|---|---|---|
| 1 | Login đúng → landing từng vai trò, OWNER `/reports` có nội dung Phase 4 | PASS trong phạm vi bằng chứng | LIVE: login đủ6 vai trò và OWNER report thật |
| 2 | Login sai → lỗi chung, không lộ thông tin account | PASS trong phạm vi bằng chứng | API: SĐT sai/mật khẩu sai cùng message |
| 3 | Account LOCKED không login mới được; giữ D10 với JWT cũ | PASS trong phạm vi bằng chứng | API: accountQA9 LOCKED chặn login; /me JWT cũ giữ CASHIER sau đổi role |
| 4 | API sai role →403, thiếu JWT →401; bao gồm API Phase 4 | PASS trong phạm vi bằng chứng | API và MockMvc: 6 vai trò/401 trên5 endpoint mới; ma trận endpoint cũ trong suite |
| 5 | Tạo account trùng SĐT bị chặn | PASS trong phạm vi bằng chứng | API: tạo trùng phone QA9 trả409 |
| 6 | OWNER không tự khóa/đổi role mình | PASS trong phạm vi bằng chứng | API: OWNER tự lock/role trả409 |
| 7 | Đặt bàn vượt sức chứa bị chặn | PASS trong phạm vi bằng chứng | API: guestCount vượt capacity trả409 |
| 8 | Trùng lịch bị chặn; chạm biên được phép | PASS trong phạm vi bằng chứng | API: trùng409, chạm end/start tạo được |
| 9 | Hủy reservation →CANCELLED, giữ lịch sử | PASS trong phạm vi bằng chứng | API: reservation16/17 CANCELLED và còn lịch sử |
| 10 | Reservation đã nhận bàn không hủy được | PASS trong phạm vi bằng chứng | API: reservation18 đã seat, cancel409 |
| 11 | Walk-in mở phiên, bàn OCCUPIED, không phụ thuộc picker reservation | PASS trong phạm vi bằng chứng | API race và LIVE mở walk-in quaUI, floor tự đổi |
| 12 | Mở phiên từ reservation đúng bàn/chưa hết hiệu lực →SEATED và liên kết | PASS trong phạm vi bằng chứng | API: reservation18 liên kết session14, chặn hủy sau seat |
| 13 | Hai tab/request không mở hai phiên ACTIVE cùng bàn | PASS trong phạm vi bằng chứng | API: 2 request mở bàn cùng lúc đúng1 thành công |
| 14 | Gọi thêm tạo FoodOrder mới cùng phiên; cap50 dòng/99 phần | PASS trong phạm vi bằng chứng | API: FoodOrder19/20 mới cùngphiên, vượt99/50 trả400; biên hợp lệ trongunit |
| 15 | Đổi giá menu không đổi giá đã gọi/thanh toán | PASS trong phạm vi bằng chứng | API: 2×12.345 +1×23.456 =48.146 sau đổi menuprice |
| 16 | Món ngừng kinh doanh không gọi mới được | PASS trong phạm vi bằng chứng | API chặn gọi món ngừng; final audit ON_SALE không có món23 |
| 17 | Chỉ PENDING hủy được, quyền đúng, phiên CLOSED chặn cả no-op | PASS trong phạm vi bằng chứng | API: PENDING cancel được, COOKING/CLOSED chặn; thứ tự khóa/no-op trongunit |
| 18 | PENDING→COOKING đúng quyền/guard/khóa phiên | PASS trong phạm vi bằng chứng | API và LIVE: PENDING→COOKING; test khóa Session→OrderItem giữ |
| 19 | UNAVAILABLE cần lý do, không tiêu hao; waiter thấy lý do | PASS trong phạm vi bằng chứng | API: reason trống400, UNAVAILABLE córeason choWAITER; không movement nguồn món đó |
| 20 | Complete ghi tiêu hao theo recipe hiện tại, kể cả retained inactive, đúng audit | PASS trong phạm vi bằng chứng | API+SQL: retained inactive recipe0.125×2=-0.25, audit/source đủ |
| 21 | Complete lặp/song song không trừ kho hai lần | PASS trong phạm vi bằng chứng | API song song complete; SQL đúng1 consumption cho mỗi món/NVL |
| 22 | Chỉ READY được SERVED; phiên CLOSED vẫn chặn thao tác | PASS trong phạm vi bằng chứng | LIVE serve READY; API serve PENDING/CLOSED trả409 |
| 23 | Receipt/item/lot/RECEIPT atomic; trackExpiry thiếu HSD bị chặn | PASS trong phạm vi bằng chứng | API: receipt11/4items/4lots/4movements; thiếuHSD400, không phiếu dở dang |
| 24 | Stocktake chỉ dòng thực đếm, clear≠0, explicit0; D7/locks/duplicate/inactive; diff0 không movement | PASS trong phạm vi bằng chứng | STOCK-UI và MOCK: blank/clear/zero/count-only; API duplicate/inactive, zero diff; TX hai stocktake/disposal khóa thật; sortedIDs trongunit |
| 25 | Disposal≤0/vượt tồn/thiếu lý do/sai lô bị chặn; giữ khóa cạnh tranh | PASS trong phạm vi bằng chứng | API: ≤0/vượt tồn/thiếureason400; TX dùng cùng Ingredient lock; lotownership trongunit |
| 26 | Tồn UI/API = SUM ledger, kể cả0/âm; không sửa lịch sử | PASS trong phạm vi bằng chứng | API: currentStock bằngSUM4 loại; SQL/ledger và D5 qua LIVE |
| 27 | Tồn thấp `< minStock`; HSD expired/today/today+days/ngoài biên đúng ngày Việt Nam | PASS trong phạm vi bằng chứng | API: lowstock<min và HSD -1/today/+3/+4 theo ngày Việt Nam; không đổi Clock nửa đêm |
| 28 | Bốn loại movement/nguồn/lô/actor/thời gian/filter/page hiển thị đúng | PASS trong phạm vi bằng chứng | API: đủ4 loại, nguồn/actor/time; MOCK/UI reports; list query/page trongSQL |
| 29 | Billing bỏ CANCELLED/UNAVAILABLE, dùng snapshot, READY/0đ theoD8 | PASS trong phạm vi bằng chứng | API invoice6=48.146 theo snapshot, bỏcancel/unavailable; LIVE READY, API0đ |
| 30 | PENDING/COOKING chặn payment kể cả preview cũ | PASS trong phạm vi bằng chứng | API: cònCOOKING/PENDING trả400, POST tự đọc lại; unit stale preview |
| 31 | Duplicate/race payment chỉ một Invoice, request thua409 | PASS trong phạm vi bằng chứng | API: 2 payment request→1Invoice/1conflict409 |
| 32 | Payment atomic Invoice+CLOSED+closedAt+AVAILABLE; awaiting-service được làm mới | PASS trong phạm vi bằng chứng | API: CLOSED/closedAt/AVAILABLE; LIVE payment xóa awaiting-service206ms |
| 33 | Reconciliation chỉ Invoice trong `[start,end)`, server tính lại, không ghi doanh thu | PASS trong phạm vi bằng chứng | API+SQL: đúng [start,end) microsecond, stale preview/server recompute, total không nhân; snapshot không đổi |
| 34 | MANAGER confirm gán managerId; null hiện Chưa xác nhận; lặp/race trả409 | PASS trong phạm vi bằng chứng | API 200/409 race; TX heldlock đọc manager saucommit; LIVE pending→confirm |
| 35 | Hai browser waiter+kitchen thấy gọi/hoàn thành/trả bàn trong khoảng1–2s không F5; reconnect/polling | PASS trong phạm vi bằng chứng | LIVE Chrome/Edge: gọi233ms, complete317ms, floor513ms, payment206ms; polling18.266s; RECONNECT sau proxyfix |
| 36 | Reload/login lại giữ dữ liệu commit; UI dùng được tablet, popup normal/reduced motion | PASS trong phạm vi bằng chứng | LIVE reload/logout/login giữ đối soát; restart giữ counts/ledger; LIVE 768/1024px, MOCK thêm375px/normal/reduced; chưa tablet vật lý |

## Ca bổ sung Phase 4

| Nhóm | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| D9 biên | PASS thật | SQL đối chiếu từngpaidAt với cửa sổ1microsecond; start tính/end loại; API ca chồng nhau |
| D9 số liệu | PASS thật | Empty API, Invoice7=0đ, breakdown2method, count; SQL kiểm độc lập |
| D9 lập | PASS API/unit | Preview cũ/field giả mạo bị bỏ, actor/time đúng; actual0/âm/precision/reason500; Clock cố định trongunit |
| D9 snapshot | PASS thật | Confirm và Invoice mới giữ system/actual/reason/reconciledAt |
| D9 race | PASS thật | HTTP và held-transaction probe: chờ→1success/1conflict409 |
| Reports | PASS thật +mock | API snapshot/quantity/status/Invoiceonly, SQL aggregate; UI empty/partialerror cómock |
| Reports kho | PASS API/browser | API cũ, lowstock/lots/10movements hiện tại; không dựng tồn lịch sử |
| UI/role | PASS thật | Login/guard6 vai trò; API +MockMvc quyền mới; CASHIERUI/MANAGERUI/OWNERlanding |
| Performance | PASS query budget | Preview1/summary2/list2–3 SQL; chưa benchmark nhiều người dùng |
| Seed/restart | PASS thật | Restart bậtseed thường; counts/ledger giữ nguyên, SSE tựreconnect khôngreload |
| Browser | PASS viewport | Chrome+Edge headless, desktop/tablet/mobile normal/reduced; chưa thiết bị tablet vật lý |
| TR-09 | MỘT PHẦN | README cóhướng dẫn; clienttools chưa thấy trênPATH; chưa dump/restore, khôngrestoremain |
| Demo | PASS workflow, cần làm mới data trước27/10 | Chuỗi bán hàng API+UI và kho API/TX đãchạy; chưa có bookingCONFIRMED27/10 |

## Ghi nhận dữ liệu và phần chưa kiểm

- QA tạo account9LOCKED, menu23DISCONTINUED, ingredient19INACTIVE/tồn0kg;
  reviewingredient18 giữINACTIVE/tồn8kg. Sessions13/14/15 CLOSED quaInvoice6/7/8;
  reconciliation1/2/3 confirmed. Before/after và số tiền trong báo cáo Phase 4.
- Không reset, tạo Neonbranch hoặc đổi lịch sử. PrefixQA, guard bật cho từngscriptwrite.
- Bản sửa Viteproxy là lỗi hồi quy thật phát hiện khirestart; phiên bản trướcfix không
  reconnect được, không đánhPASS lượt lỗi. Bản saufix có HTTP vàbrowser thật.
- Các harness cólượt dừng vàđược sửa assertion/locator; xem phần4 báo cáo, không
  cộnglượt dừng thànhbộkếtquảđộc lập. Bộ kiểm hoàn tất giữ cùngfixture khiresuming.
- Chưa tablet vật lý, tải nhiều người dùng, HSD đúngthờiđiểm nửađêm hoặc thựcdiễnrestore.
  Các giới hạn này không được đánhPASS chỉbằng unit/mock/build.
