# Sửa dropdown/popup không hiện khi bấm

Ngày kiểm: 23/10/2026. Phạm vi UI Phase 1–2 (NFR-10/11/12); chưa commit/push,
không triển khai Phase 3. Giữ nguyên các thay đổi của đợt review Critical đang có.

Sau lượt sửa, chủ dự án báo đã test tay lại và thấy ổn (23/10/2026), rồi yêu cầu chuẩn bị
[bàn giao Phase 3](../PHASE_3_HANDOFF.md). Xác nhận này không bổ sung số test tự động
hoặc xác nhận Edge/tablet vật lý, vì chủ dự án không nêu môi trường test tay.

## Nguyên nhân và sửa

Đã tái hiện trên trang tài khoản với `prefers-reduced-motion: reduce`:
Select có `aria-expanded=true`, options đã render nhưng popup lệch khỏi viewport.
Ở viewport 1440×1000, tọa độ đo được sau khi mở là `left=-14400, top=-10000`;
chế độ chuyển động bình thường đặt đúng `left=829, top=398`.

Quy tắc CSS chung dùng `transition-duration: .01ms !important` trên mọi phần tử.
Popup không khai báo danh sách thuộc tính transition nên cả left/top cũng bị nội suy.
Ant Design đặt lại left/top rồi đo vị trí đồng bộ để căn popup; transition cực ngắn
vẫn làm phép đo lấy tọa độ đang chuyển tiếp, gây lệch và giật vùng cuộn.

`frontend/src/index.css` đổi thành `transition: none !important` trong media query
giảm chuyển động. Giữ animation rất ngắn để vòng đời hiệu ứng vẫn kết thúc bình thường.
Không đổi z-index, popup container, API, quyền, query key, dữ liệu hay schema.
Việc chỉ gõ tìm ngay sau khi mở ở QA trước không kiểm được đầy đủ lỗi click-only này.

## Kiểm chứng

| Kiểm tra trong lượt sửa này | Kết quả |
|---|---|
| `bun run test` | 18 test / 47 assertions pass |
| `bun run build` | TypeScript và Vite production build pass |
| `bun run lint` | Pass |
| Chrome headless, API mock | 59 kiểm tra pass; 1440×900 và 768×900, mỗi kích thước có normal/reduced motion |
| Chrome headless, app/API/Neon thật chỉ đọc | 9 kiểm tra pass; normal/reduced motion |
| JavaScript error trong hai lượt browser hoàn chỉnh | 0 |

Không chạy lại backend test vì đợt này chỉ sửa CSS và thêm QA script/tài liệu.
150 test backend là kết quả riêng của [đợt sửa Critical](phase-2-review.md).
Không cộng các số kiểm tra của các đợt thành một lần chạy.

Lượt mock bao phủ toàn bộ loại popup đang dùng trên các màn đã triển khai:

- Tài khoản: Select role trong bảng, Modal tạo tài khoản và Select role bên trong.
- Thực đơn: Select lọc trạng thái, Modal thêm/sửa, Drawer định lượng và Select NVL.
- Đặt bàn: Select trạng thái, Select số dòng/trang, DatePicker lọc ngày,
  Popconfirm hủy, Drawer tạo đặt bàn và cả hai DatePicker có giờ.
- Sơ đồ bàn: Modal mở phiên, Select đặt bàn và Modal cảnh báo walk-in lồng bên trên.
- Phiên: Popconfirm hủy món, Modal gọi món, chọn bằng click không gõ tìm,
  thêm dòng/chọn món bằng tìm kiếm và bàn phím.
- Bếp: Modal không thể chế biến, validation và đóng.
- Điều hướng tablet: Drawer mở/chọn đường dẫn/đóng.

Script kiểm vị trí popup nằm trọn trong viewport, opacity, lớp hiển thị trên cùng,
trạng thái mở còn giữ sau hiệu ứng và không làm thay đổi vùng cuộn khi mở Select.
Kiểm chọn/đóng, Escape, click bên ngoài và ArrowDown/Enter ở các control liên quan.
Lượt API mock thử đổi role bằng PATCH giả lập, mọi `/api/` đều bị chặn tại browser.

Lượt thật dùng OWNER/WAITER: mở và giữ danh sách role, chọn role trong form tạo
tài khoản rồi đóng, chọn NVL trên dòng định lượng nháp rồi đóng, chọn món từ API
thật trong phiên QA ACTIVE đã xác minh rồi đóng. Không gửi form.
Browser chặn mọi request nghiệp vụ khác GET; có **0 request ghi bị thử gửi**.

## Dữ liệu và giới hạn

Readiness chỉ đọc trước QA ghi nhận 10 ACTIVE / 2 bàn trống lúc 11:00 giờ Việt Nam.
Đây là snapshot theo thời điểm, không phải cam kết trạng thái live.
Không tạo/sửa account, menu, recipe, reservation, session, order hay stock movement;
không reset/seed, không sửa ngày lịch sử. Đăng nhập và REST/SSE đọc là các truy cập thật.

Chưa kiểm Edge, tablet vật lý hoặc cấu hình trình duyệt riêng của người dùng.
Đã xác nhận lỗi và bản sửa bằng Chrome với preference giảm chuyển động được giả lập.

## Tái lập

Chạy frontend trên 5173. Lượt mock không cần backend; lượt thật cần backend 8080
và một phiên ACTIVE gắn reservation `[QA]` để lấy id qua API.

Từ gốc repo (Playwright đã có trong môi trường QA):

```powershell
node scripts/phase1-demo-readiness.mjs
$env:PLAYWRIGHT_MODULE = (Resolve-Path .cache/phase0/browser/node_modules/playwright/index.mjs).Path
try {
  node scripts/popup-browser-check.mjs
  node scripts/popup-live-browser-check.mjs
} finally {
  Remove-Item Env:PLAYWRIGHT_MODULE
}
```

Script thật chỉ login/đọc, không cần cờ cho phép ghi. Script mock không kết nối Neon.
Kết quả JSON và ảnh nằm trong `.cache/popup-qa/`; không lưu token vào output.
Hai script hỗ trợ `PLAYWRIGHT_MODULE`, `BROWSER_CHANNEL`, `FRONTEND_URL`;
lượt thật dùng thêm `API_URL` và `DEMO_PASSWORD` như các script QA hiện có.

File của lượt sửa: `frontend/src/index.css`, hai script popup, báo cáo này và các
link/ghi chú liên quan trong CLAUDE, README gốc/frontend/docs, TRACEABILITY và báo cáo review.
