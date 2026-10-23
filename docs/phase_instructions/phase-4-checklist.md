# Checklist nghiệm thu Phase 4 và hồi quy 1–36

Chuẩn bị **23/10/2026**; **chưa chạy Phase 4**. File này là mẫu kế hoạch kiểm,
không phải báo cáo nghiệm thu. Kết quả Phase 0–3 nằm trong các báo cáo riêng.
Khi thực hiện, ghi PASS/FAIL/CHƯA KIỂM, ngày, script/ảnh/request ID và giới hạn;
không đánh PASS bằng unit test hoặc số đo cũ cho một ca yêu cầu app thật.

Nguồn: master §21.2, [hướng dẫn](phase-4.md), [bàn giao](../PHASE_4_HANDOFF.md).
Trước ghi Neon: readiness chỉ đọc, xác minh fixture, guard `PHASE1_QA_ALLOW_WRITES=main`.
Không chạy/reset database chỉ để điền checklist trong lượt chuẩn bị tài liệu.

## Checklist gốc §21.2

| # | Kết quả cần chứng minh | Kết quả Phase 4 | Bằng chứng mới |
|---|---|---|---|
| 1 | Login đúng → landing từng vai trò, OWNER `/reports` có nội dung Phase 4 | Chưa chạy | — |
| 2 | Login sai → lỗi chung, không lộ thông tin account | Chưa chạy | — |
| 3 | Account LOCKED không login mới được; giữ D10 với JWT cũ | Chưa chạy | — |
| 4 | API sai role →403, thiếu JWT →401; bao gồm API Phase 4 | Chưa chạy | — |
| 5 | Tạo account trùng SĐT bị chặn | Chưa chạy | — |
| 6 | OWNER không tự khóa/đổi role mình | Chưa chạy | — |
| 7 | Đặt bàn vượt sức chứa bị chặn | Chưa chạy | — |
| 8 | Trùng lịch bị chặn; chạm biên được phép | Chưa chạy | — |
| 9 | Hủy reservation →CANCELLED, giữ lịch sử | Chưa chạy | — |
| 10 | Reservation đã nhận bàn không hủy được | Chưa chạy | — |
| 11 | Walk-in mở phiên, bàn OCCUPIED, không phụ thuộc picker reservation | Chưa chạy | — |
| 12 | Mở phiên từ reservation đúng bàn/chưa hết hiệu lực →SEATED và liên kết | Chưa chạy | — |
| 13 | Hai tab/request không mở hai phiên ACTIVE cùng bàn | Chưa chạy | — |
| 14 | Gọi thêm tạo FoodOrder mới cùng phiên; cap50 dòng/99 phần | Chưa chạy | — |
| 15 | Đổi giá menu không đổi giá đã gọi/thanh toán | Chưa chạy | — |
| 16 | Món ngừng kinh doanh không gọi mới được | Chưa chạy | — |
| 17 | Chỉ PENDING hủy được, quyền đúng, phiên CLOSED chặn cả no-op | Chưa chạy | — |
| 18 | PENDING→COOKING đúng quyền/guard/khóa phiên | Chưa chạy | — |
| 19 | UNAVAILABLE cần lý do, không tiêu hao; waiter thấy lý do | Chưa chạy | — |
| 20 | Complete ghi tiêu hao theo recipe hiện tại, kể cả retained inactive, đúng audit | Chưa chạy | — |
| 21 | Complete lặp/song song không trừ kho hai lần | Chưa chạy | — |
| 22 | Chỉ READY được SERVED; phiên CLOSED vẫn chặn thao tác | Chưa chạy | — |
| 23 | Receipt/item/lot/RECEIPT atomic; trackExpiry thiếu HSD bị chặn | Chưa chạy | — |
| 24 | Stocktake chỉ dòng thực đếm, clear≠0, explicit0; D7/locks/duplicate/inactive; diff0 không movement | Chưa chạy | — |
| 25 | Disposal≤0/vượt tồn/thiếu lý do/sai lô bị chặn; giữ khóa cạnh tranh | Chưa chạy | — |
| 26 | Tồn UI/API = SUM ledger, kể cả0/âm; không sửa lịch sử | Chưa chạy | — |
| 27 | Tồn thấp `< minStock`; HSD expired/today/today+days/ngoài biên đúng ngày Việt Nam | Chưa chạy | — |
| 28 | Bốn loại movement/nguồn/lô/actor/thời gian/filter/page hiển thị đúng | Chưa chạy | — |
| 29 | Billing bỏ CANCELLED/UNAVAILABLE, dùng snapshot, READY/0đ theoD8 | Chưa chạy | — |
| 30 | PENDING/COOKING chặn payment kể cả preview cũ | Chưa chạy | — |
| 31 | Duplicate/race payment chỉ một Invoice, request thua409 | Chưa chạy | — |
| 32 | Payment atomic Invoice+CLOSED+closedAt+AVAILABLE; awaiting-service được làm mới | Chưa chạy | — |
| 33 | Reconciliation chỉ Invoice trong `[start,end)`, server tính lại, không ghi doanh thu | Chưa chạy | — |
| 34 | MANAGER confirm gán managerId; null hiện Chưa xác nhận; lặp/race trả409 | Chưa chạy | — |
| 35 | Hai browser waiter+kitchen thấy gọi/hoàn thành/trả bàn trong khoảng1–2s không F5; reconnect/polling | Chưa chạy | — |
| 36 | Reload/login lại giữ dữ liệu commit; UI dùng được tablet, popup normal/reduced motion | Chưa chạy | — |

## Ca bổ sung Phase 4

| Nhóm | Ca cần kiểm | Kết quả | Bằng chứng mới |
|---|---|---|---|
| D9 biên | paidAt tại start tính, tại end loại; ca chồng nhau hợp lệ | Chưa chạy | — |
| D9 số liệu | Empty/Invoice0đ/CASH/BANK_TRANSFER; total=hai phương thức, count đúng | Chưa chạy | — |
| D9 lập | Preview cũ; POST recompute, actor/time; actual0/âm/precision, reason optional/≤500 | Chưa chạy | — |
| D9 snapshot | Sau lập/confirm không sửa system/actual/reason/reconciledAt hoặc Invoice/movement | Chưa chạy | — |
| D9 race | Hai confirm: một thành công/một409, manager đúng request thắng | Chưa chạy | — |
| Reports | Tổng Invoice không nhân khi nhiều item; top món đúng paidAt/quantity/status/READY/snapshot | Chưa chạy | — |
| Reports kho | Tồn thấp/lô chú ý hiện tại/10 movements mới nhất dùng API cũ; không giả tồn lịch sử | Chưa chạy | — |
| UI/role | OWNER landing report; CASHIER lập/MANAGER confirm; sáu role/401 trên mọi API mới | Chưa chạy | — |
| Performance | Aggregate/fetch không N+1; giữ query count các list Phase3 | Chưa chạy | — |
| Seed/restart | Không nhân dữ liệu/refresh ngày; các gate hiện có bảo toàn | Chưa chạy | — |
| Browser | Chrome/Edge, desktop/tablet viewport; ghi rõ thiết bị thật hoặc mô phỏng | Chưa chạy | — |
| TR-09 | Hướng dẫn backup/restore, bằng chứng thực hiện hoặc nêu rõ chưa thực diễn; không restore main tùy tiện | Chưa chạy | — |
| Demo | Bán hàng đến đối soát/báo cáo; kho đến biến động; dữ liệu ngày demo đủ tươi | Chưa chạy | — |

## Ghi nhận khi chạy

- Ngày/giờ, branch/HEAD và working tree: **chưa ghi**.
- Môi trường/process/cổng, database và guard QA: **chưa ghi**.
- Before/after, fixture `[QA]`, giao dịch đã tạo/đóng và reset/restore nếu có: **chưa ghi**.
- Backend/frontend tests, build/lint; browser/API/service checks tách riêng: **chưa ghi**.
- Mục còn FAIL/CHƯA KIỂM và khác biệt so với spec: **chưa ghi**.
- Báo cáo thực thi `docs/phase_results/phase-4.md`: **chưa tạo**, chỉ tạo sau triển khai/QA.
