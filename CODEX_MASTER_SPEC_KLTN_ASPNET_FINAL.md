# MASTER SPEC CHO CODEX — KLTN QUẢN LÝ QUÁN ĂN PHỤC VỤ TẠI BÀN
## Bản rà soát theo khóa luận mới nhất
### Stack chốt: C# + .NET 10 + ASP.NET Core MVC + Razor Views + Bootstrap + Vanilla JavaScript + EF Core + PostgreSQL

> **Mục tiêu của file này:** Đây là đặc tả dùng để Codex hiện thực prototype Web cho khóa luận **“Phân tích, tái thiết kế quy trình nghiệp vụ và xây dựng hệ thống thông tin hỗ trợ vận hành bán hàng và quản lý nguyên vật liệu cho quán ăn phục vụ tại bàn”**.
>
> Ưu tiên cao nhất là **code đúng nghiệp vụ và đúng những gì khóa luận mô tả**, không phải xây hệ thống nhiều công nghệ nhất. Hệ thống phải đơn giản vừa đủ, chạy ổn định, dễ đọc, dễ sửa và có khả năng truy vết từ Requirement → Use Case → workflow → dữ liệu → code.

---

# 0. NGUYÊN TẮC BẮT BUỘC KHI CODEX LÀM VIỆC

Codex phải đọc toàn bộ file này trước khi code.

Không tự thêm, xóa hoặc đổi:
- nghiệp vụ;
- actor/vai trò;
- bảng/thực thể;
- thuộc tính ERD;
- quan hệ chính;
- trạng thái nghiệp vụ;
- chức năng ngoài phạm vi;

nếu chưa nêu rõ lý do và được người dùng chấp thuận.

## 0.1 Thứ tự ưu tiên khi tài liệu có điểm chưa hoàn toàn đồng nhất

Nếu các phần của khóa luận có khác biệt nhỏ, áp dụng thứ tự sau:

1. **BR/TR/FR/NFR trong Chương 3**
2. **Quy trình TO-BE trong Chương 3**
3. **Đặc tả Use Case trong Chương 4**
4. **Activity Diagram và Sequence Diagram**
5. **ERD**
6. **Class Diagram**
7. Chi tiết kỹ thuật trong file này
8. Suy đoán của Codex

Không được lấy chi tiết implementation để thay đổi nghiệp vụ khóa luận.

## 0.2 Mỗi lần bắt đầu một Phase

Trước khi sửa code, Codex phải báo ngắn gọn:
1. Requirement/Use Case đang hiện thực.
2. File dự kiến tạo/sửa.
3. Entity/table liên quan.
4. Business rule cần bảo toàn.
5. Test case chính sau khi hoàn thành.

Sau khi hoàn thành:
- chạy `dotnet build`;
- chạy test/check cần thiết;
- báo file đã sửa;
- báo business rule đã xử lý;
- nêu rõ nếu code có điểm nào chưa khớp luận văn.

---

# 1. MỤC TIÊU VÀ PHẠM VI HỆ THỐNG

Hệ thống là Web Application phục vụ người dùng nội bộ tại một quán ăn phục vụ tại bàn quy mô khoảng 30–50 bàn.

Hệ thống tập trung vào hai chuỗi nghiệp vụ.

## 1.1 Vận hành bán hàng và phục vụ tại bàn

Bao gồm:
- tiếp nhận và quản lý đặt bàn;
- quản lý khu vực và bàn;
- tiếp nhận khách;
- mở phiên phục vụ;
- ghi nhận đơn gọi món;
- ghi nhận các lần gọi thêm trong cùng phiên;
- chuyển thông tin món đến bếp;
- cập nhật trạng thái chế biến;
- xử lý món không thể chế biến;
- xác nhận món đã phục vụ;
- thanh toán;
- ghi nhận doanh thu;
- đối soát doanh thu cuối ca;
- tra cứu lịch sử và thông tin tổng hợp.

## 1.2 Quản lý nguyên vật liệu

Bao gồm:
- danh mục nguyên vật liệu;
- đơn vị tính;
- ngưỡng tồn tối thiểu;
- quản lý theo lô/HSD khi áp dụng;
- định lượng nguyên vật liệu theo món;
- ghi nhận tiêu hao dự kiến khi món hoàn thành;
- ghi nhận nhập nguyên vật liệu;
- theo dõi tồn;
- cảnh báo tồn thấp;
- cảnh báo gần hết hạn/hết hạn;
- kiểm kê;
- điều chỉnh chênh lệch;
- loại bỏ nguyên vật liệu;
- lịch sử biến động kho.

## 1.3 Ngoài phạm vi

Không xây:
- đặt bàn tự phục vụ cho khách trên Internet;
- khách tự gọi món;
- giao hàng;
- CRM/loyalty;
- quản lý nhà cung cấp đầy đủ;
- yêu cầu mua hàng/PO;
- báo giá;
- công nợ nhà cung cấp;
- thanh toán nhà cung cấp;
- HR/payroll/chấm công;
- kế toán đầy đủ;
- hóa đơn điện tử/thuế;
- multi-branch;
- mobile app riêng;
- AI;
- microservices.

---

# 2. REQUIREMENT LÀ NGUỒN CHÍNH CỦA CODE

## 2.1 Business Requirements

Hệ thống phải đáp ứng:

- **BR-01:** Tập trung dữ liệu bán hàng, thanh toán, doanh thu và nguyên vật liệu trên một nền tảng.
- **BR-02:** Số hóa xuyên suốt quy trình bán hàng tại bàn từ đặt/bố trí bàn đến thanh toán.
- **BR-03:** Chia sẻ thống nhất thông tin gọi món và trạng thái món giữa phục vụ và bếp.
- **BR-04:** Các lần gọi món trong cùng một phiên phải liên kết cùng phiên/bàn để theo dõi và thanh toán.
- **BR-05:** Ghi nhận giao dịch, tổng hợp doanh thu và hỗ trợ đối soát theo ca/ngày.
- **BR-06:** Số hóa nhập hàng, tồn, kiểm kê và các biến động chính của nguyên vật liệu.
- **BR-07:** Quản lý lô và hạn sử dụng.
- **BR-08:** Cung cấp thông tin tổng hợp về bán hàng, doanh thu và nguyên vật liệu.
- **BR-09:** Có khả năng truy xuất giao dịch và nghiệp vụ quan trọng.
- **BR-10:** Quyền sử dụng phải phù hợp vai trò.
- **BR-11:** Liên kết món bán → định lượng → tiêu hao → biến động tồn.
- **BR-12:** Quản lý tập trung yêu cầu đặt bàn và cung cấp thông tin cho phục vụ khi khách đến.

## 2.2 Technical Requirements

- **TR-01:** Web Application.
- **TR-02:** CSDL tập trung.
- **TR-03:** CSDL quan hệ.
- **TR-04:** Thực thể nghiệp vụ quan trọng có mã định danh duy nhất.
- **TR-05:** Nghiệp vụ quan trọng lưu thời gian tạo/cập nhật/xác nhận phù hợp.
- **TR-06:** Nghiệp vụ quan trọng lưu người thực hiện khi ERD hỗ trợ.
- **TR-07:** Xác thực + phân quyền theo vai trò.
- **TR-08:** Thanh toán, nhập kho, điều chỉnh tồn và các thao tác nhiều bảng phải bảo đảm tính toàn vẹn giao dịch.
- **TR-09:** Có cách backup/restore PostgreSQL.
- **TR-10:** Responsive cho máy tính và màn hình nhỏ.
- **TR-11:** Thay đổi về đặt bàn, trạng thái bàn, đơn gọi món và trạng thái món phải được người dùng liên quan nhìn thấy trong thời gian ngắn mà không nhập lại dữ liệu.

## 2.3 Functional Requirements

- **FR-01:** Đăng nhập, tài khoản, phân quyền.
- **FR-02:** Quản lý bàn, thực đơn, giá và trạng thái kinh doanh món.
- **FR-03:** Quản lý đặt bàn.
- **FR-04:** Trạng thái bàn + phiên phục vụ.
- **FR-05:** Đơn gọi món + gọi thêm.
- **FR-06:** Điều chỉnh/hủy món; bếp chỉ báo “Không thể chế biến”; Quản lý có thể can thiệp khi cần.
- **FR-07:** Chuyển đơn đến bếp + cập nhật trạng thái xử lý.
- **FR-08:** Phục vụ theo dõi và xác nhận món đã phục vụ.
- **FR-09:** Tổng hợp món, tính tiền và xác nhận thanh toán.
- **FR-10:** Doanh thu + đối soát cuối ca.
- **FR-11:** Quản lý danh mục nguyên vật liệu.
- **FR-12:** Ghi nhận nhập nguyên vật liệu.
- **FR-13:** Theo dõi tồn, lô, HSD và cảnh báo.
- **FR-14:** Kiểm kê + điều chỉnh chênh lệch.
- **FR-15:** Loại bỏ nguyên vật liệu.
- **FR-16:** Tra cứu lịch sử nghiệp vụ.
- **FR-17:** Thông tin quản trị tổng hợp.
- **FR-18:** Định lượng + tiêu hao nguyên vật liệu theo món.

## 2.4 Non-Functional Requirements

- **NFR-01:** Các thao tác thường xuyên phải phản hồi phù hợp.
- **NFR-02:** Trạng thái bàn/đơn/món được cập nhật kịp thời.
- **NFR-03:** Tính chính xác của đặt bàn, trạng thái, tiền, doanh thu, nhập, tiêu hao, kiểm kê và tồn.
- **NFR-04:** Phân quyền truy cập.
- **NFR-05:** Mật khẩu không lưu plaintext.
- **NFR-06:** Có khả năng truy vết người/thời điểm/nội dung cần thiết.
- **NFR-07:** UI rõ ràng, ít thao tác thừa.
- **NFR-08:** Dữ liệu commit thành công không mất khi reload/login lại.
- **NFR-09:** Đủ cho khoảng 30–50 bàn và nhiều user nội bộ.
- **NFR-10:** Trình duyệt web phổ biến.
- **NFR-11:** Code tổ chức dễ bảo trì.
- **NFR-12:** Thuật ngữ/trạng thái/UI nhất quán.

---

# 3. STACK KỸ THUẬT CHỐT

## 3.1 Backend

- C#
- .NET 10 LTS
- ASP.NET Core MVC
- Entity Framework Core
- Npgsql PostgreSQL provider
- ASP.NET Core Cookie Authentication
- Claims/Role Authorization
- ASP.NET Core Session cho OTP demo
- `PasswordHasher<TaiKhoan>` hoặc API hashing chuẩn của ASP.NET Core

## 3.2 Frontend

- Razor Views
- HTML5
- CSS3
- Bootstrap 5
- Vanilla JavaScript
- Fetch API/AJAX

Không dùng React/Vue.

## 3.3 Database

- PostgreSQL local trong giai đoạn phát triển/demo.
- EF Core Migrations.
- Có thể đổi PostgreSQL host sang Neon/Supabase sau này chỉ bằng connection string.
- Không dùng Supabase Auth/RLS/Realtime làm backend chính.

## 3.4 Đồng bộ gần thời gian thực

Bản đầu dùng polling đơn giản:
- màn hình khu vực/bàn: khoảng 3–5 giây khi cần;
- màn hình bếp: khoảng 2–3 giây;
- màn hình phục vụ theo dõi món: khoảng 2–3 giây.

Không bắt buộc SignalR ở bản đầu.

Nếu polling đã ổn định và người dùng yêu cầu nâng cấp thì mới cân nhắc SignalR.

---

# 4. KIẾN TRÚC CODE — ĐƠN GIẢN, KHÔNG OVER-ENGINEER

Một ASP.NET Core MVC project chính.

```text
RestaurantManagement/
├── Controllers/
├── Services/
├── Models/
│   ├── Entities/
│   └── Enums/
├── Data/
│   ├── AppDbContext.cs
│   ├── Configurations/
│   ├── Migrations/
│   └── SeedData.cs
├── ViewModels/
├── Views/
├── wwwroot/
│   ├── css/
│   └── js/
├── database/
├── scripts/
├── docs/
├── Program.cs
├── appsettings.json
└── RestaurantManagement.csproj
```

## 4.1 Quy tắc phân lớp

**Controller**
- nhận HTTP request;
- kiểm tra authorization;
- bind/validate ViewModel;
- gọi Service;
- trả View/Redirect/JSON.

**Service**
- chứa workflow và business rule cần nhiều entity/query;
- transaction;
- kiểm tra trạng thái;
- tính toán nghiệp vụ.

**Entity**
- ánh xạ 18 class nghiệp vụ/18 thực thể ERD;
- có thể chứa hành vi đơn giản của chính object.

**ViewModel**
- dữ liệu nhập/xuất UI;
- không dùng entity trực tiếp cho mọi form nếu form cần validation/aggregation.

**View/JavaScript**
- hiển thị;
- tương tác;
- polling;
- không quyết định business rule quan trọng.

## 4.2 Không coi Service/Controller là lớp trong Class Diagram khóa luận

Class Diagram của khóa luận hiện tại gồm **18 lớp nghiệp vụ**, không có stereotype Entity/Control/Boundary.

Các Service/Controller dưới đây chỉ là chi tiết implementation của ASP.NET Core.

Không sửa Class Diagram luận văn để thêm:
- Controller;
- Service;
- Repository;
- DbContext;
- ViewModel.

## 4.3 Không dùng

- Clean Architecture 4 project nếu không cần;
- Generic Repository;
- custom UnitOfWork;
- MediatR;
- CQRS;
- microservices;
- Redis;
- Kafka/RabbitMQ;
- AutoMapper nếu mapping ít;
- Docker bắt buộc.

`DbContext` + Service + transaction của EF Core là đủ.

---

# 5. VAI TRÒ VÀ PHÂN QUYỀN

Có 6 vai trò nội bộ:

1. `CHU_QUAN`
2. `QUAN_LY`
3. `THU_NGAN`
4. `NHAN_VIEN_PHUC_VU`
5. `NHAN_VIEN_BEP`
6. `BEP_TRUONG`

## 5.1 Quyền chính

### CHU_QUAN
- quản lý nguyên vật liệu;
- khu vực;
- bàn;
- tài khoản;
- phân quyền;
- thực đơn;
- giá bán;
- ngừng kinh doanh món;
- phối hợp quản lý định lượng;
- xem bán hàng/doanh thu;
- xem tồn/lô/HSD/cảnh báo;
- xem biến động;
- xem kiểm kê/loại bỏ/nhập;
- xem dashboard tổng hợp.

### QUAN_LY
- tạo/sửa/hủy đặt bàn;
- tra cứu đặt bàn;
- hỗ trợ mở phiên/gọi món khi cần theo UC/FR;
- can thiệp điều chỉnh đơn khi cần theo FR-06;
- kiểm tra/xác nhận đối soát cuối ca.

### THU_NGAN
- xem phiên cần thanh toán;
- kiểm tra tổng tiền;
- chọn phương thức;
- xác nhận thanh toán;
- lập đối soát cuối ca;
- nhập tiền thực nhận;
- xem lịch sử thanh toán được phép.

### NHAN_VIEN_PHUC_VU
- xem khu vực/bàn;
- tra cứu đặt bàn;
- bố trí khách;
- mở phiên phục vụ;
- ghi nhận đơn gọi món;
- gọi thêm;
- điều chỉnh/hủy món khi trạng thái cho phép;
- theo dõi trạng thái món;
- xác nhận đã phục vụ.

### NHAN_VIEN_BEP
- xem món chờ;
- bắt đầu chế biến;
- báo không thể chế biến + lý do;
- xác nhận hoàn thành món.

### BEP_TRUONG
- các chức năng xử lý món của bếp;
- xem tồn/lô/HSD/cảnh báo;
- quản lý định lượng cùng Chủ quán;
- kiểm kê;
- ghi nhận nhập;
- loại bỏ nguyên vật liệu.

### Tất cả người dùng nội bộ
- đăng nhập;
- quên mật khẩu;
- sửa thông tin cá nhân;
- đổi mật khẩu.

## 5.2 Quy tắc authorization

- Backend là nơi quyết định quyền.
- Không dựa vào việc “ẩn nút” để bảo mật.
- Một `TaiKhoan` có đúng một `vaiTro`.
- Người dùng không được tự đổi vai trò.
- Chỉ `CHU_QUAN` quản lý role/account nhân viên.

---

# 6. TRẠNG THÁI NGHIỆP VỤ CHỐT CHO CODE

UI hiển thị tiếng Việt có dấu.
Enum/code dùng tiếng Việt không dấu để bám thuật ngữ khóa luận.

## 6.1 TaiKhoan

```text
HOAT_DONG
BI_KHOA
```

## 6.2 KhuVucBan

```text
HOAT_DONG
NGUNG_SU_DUNG
```

## 6.3 Ban

```text
TRONG
DANG_PHUC_VU
NGUNG_SU_DUNG
```

Thông tin “có đặt trước” là **thông tin lịch đặt**, không bắt buộc lưu thành trạng thái cố định của bàn.

UI có thể hiển thị thêm badge:
```text
CO_DAT_TRUOC
```
nhưng badge này được suy ra từ `DonDatBan`, không thêm enum/persistent status nếu không cần.

Khi mở phiên:
```text
TRONG -> DANG_PHUC_VU
```

Khi thanh toán/kết thúc phiên:
```text
DANG_PHUC_VU -> TRONG
```

Không cho ngừng sử dụng bàn khi:
- đang có phiên phục vụ;
- còn đặt bàn hiệu lực trong khoảng thời gian liên quan.

## 6.4 DonDatBan

```text
DA_XAC_NHAN
DA_NHAN_BAN
DA_HUY
```

Không hard delete booking.

## 6.5 PhienPhucVu

```text
DANG_HOAT_DONG
DA_KET_THUC
```

## 6.6 ChiTietDonGoiMon

```text
CHO_CHE_BIEN
DANG_CHE_BIEN
HOAN_THANH
DA_PHUC_VU
KHONG_THE_CHE_BIEN
DA_HUY
```

Luồng chính:

```text
CHO_CHE_BIEN -> DANG_CHE_BIEN -> HOAN_THANH -> DA_PHUC_VU
```

Nhánh lỗi:

```text
CHO_CHE_BIEN/DANG_CHE_BIEN -> KHONG_THE_CHE_BIEN
```

Việc `DA_HUY` do phục vụ/quản lý thực hiện khi nghiệp vụ cho phép, không do bếp tự hủy.

## 6.7 MonAn

```text
DANG_KINH_DOANH
NGUNG_KINH_DOANH
```

## 6.8 NguyenVatLieu

```text
DANG_SU_DUNG
NGUNG_SU_DUNG
```

## 6.9 BienDongKho

```text
NHAP
TIEU_HAO
DIEU_CHINH_KIEM_KE
LOAI_BO
```

## 6.10 PhuongThuc thanh toan

```text
TIEN_MAT
CHUYEN_KHOAN
```

---

# 7. 18 BẢNG/ENTITY — PHẢI KHỚP ERD MỚI NHẤT

Database domain chính có **đúng 18 bảng**.

Không tự thêm bảng domain thứ 19.

---

## 7.1 KhuVucBan

```text
maKhuVuc          PK
tenKhuVuc
trangThai
```

C#:
```text
MaKhuVuc: int
TenKhuVuc: string
TrangThai: enum/string
```

---

## 7.2 Ban

```text
maBan              PK
maKhuVuc           FK -> KhuVucBan
tenBan
sucChua
trangThai
```

Ràng buộc:
- `sucChua > 0`;
- `maBan` là định danh duy nhất;
- bàn thuộc một khu vực.

---

## 7.3 DonDatBan

```text
maDonDatBan        PK
maBan              FK -> Ban
maNguoiTao         FK -> TaiKhoan
tenKhach
soDienThoaiKhach
soLuongKhach
thoiGianBatDau
thoiGianKetThuc
ghiChu              NULL
trangThai
ngayTao
```

Ràng buộc:
- số lượng khách > 0;
- `thoiGianBatDau < thoiGianKetThuc`;
- bàn đủ sức chứa;
- không xung đột booking còn hiệu lực.

Công thức overlap:

```text
newStart < existingEnd
AND
newEnd > existingStart
```

Khi sửa, bỏ qua chính booking đang sửa.

---

## 7.4 PhienPhucVu

**Tên FK phải bám ERD mới nhất: `maDatBan`.**

```text
maPhienPhucVu      PK
maBan              FK -> Ban
maDatBan           FK -> DonDatBan, NULL
maNguoiTao         FK -> TaiKhoan
thoiGianMo
thoiGianDong       NULL
trangThai
```

Quy tắc:
- walk-in: `maDatBan = NULL`;
- khách đặt trước: liên kết booking;
- một bàn tối đa một phiên `DANG_HOAT_DONG`.

---

## 7.5 DonGoiMon

```text
maDonGoiMon        PK
maPhienPhucVu      FK -> PhienPhucVu
maNguoiTao         FK -> TaiKhoan
thoiGianTao
```

Mỗi lần khách gọi thêm:
- tạo một `DonGoiMon` mới;
- vẫn cùng `PhienPhucVu`.

---

## 7.6 ChiTietDonGoiMon

```text
maChiTietDon           PK
maDonGoiMon            FK -> DonGoiMon
maMonAn                FK -> MonAn
soLuong
ghiChu                  NULL
trangThai
lyDoKhongTheCheBien    NULL
donGiaTaiThoiDiem
```

**Lưu ý quan trọng:** hình ERD hiện tại lặp `ghiChu` hai lần, trong khi Class Diagram chỉ có một `ghiChu`. Database chỉ triển khai **một cột `ghiChu`**. Xem việc lặp lại trên hình ERD là lỗi trình bày, không tạo hai cột trùng tên.

Quy tắc:
- `soLuong > 0`;
- snapshot giá bán vào `donGiaTaiThoiDiem` khi gọi món;
- đổi giá món về sau không làm thay đổi giá lịch sử.

---

## 7.7 MonAn

```text
maMonAn            PK
tenMon
giaBan
trangThai
```

Rule:
```text
giaBan >= 0
```

Món `NGUNG_KINH_DOANH` không được thêm vào đơn mới nhưng dữ liệu lịch sử giữ nguyên.

---

## 7.8 DinhLuongMonAn

```text
maMonAn            FK -> MonAn
maNguyenVatLieu    FK -> NguyenVatLieu
soLuongDinhMuc
```

Dùng khóa chính kép:

```text
(maMonAn, maNguyenVatLieu)
```

Rule:

```text
soLuongDinhMuc > 0
```

---

## 7.9 NguyenVatLieu

```text
maNguyenVatLieu    PK
tenNguyenVatLieu
donViTinh
nguongTonToiThieu
theoDoiLo
theoDoiHSD
trangThai
```

Rule:
```text
nguongTonToiThieu >= 0
```

Nếu đã có lịch sử biến động, không cho sửa đơn vị tính theo cách làm sai lịch sử.

---

## 7.10 LoNguyenVatLieu

```text
maLo               PK
maNguyenVatLieu    FK -> NguyenVatLieu
soLo               NULL
hanSuDung           NULL
```

Nếu NVL không theo dõi lô:
- không bắt buộc tạo LoNguyenVatLieu.

Nếu theo dõi HSD:
- yêu cầu HSD ở lần nhập phù hợp.

---

## 7.11 PhieuNhap

```text
maPhieuNhap        PK
maNguoiTao         FK -> TaiKhoan
ngayTao
```

---

## 7.12 ChiTietPhieuNhap

```text
maChiTietNhap      PK
maPhieuNhap        FK -> PhieuNhap
maNguyenVatLieu    FK -> NguyenVatLieu
maLo               FK -> LoNguyenVatLieu, NULL
soLuongNhap
```

Rule:
```text
soLuongNhap > 0
```

---

## 7.13 PhieuKiemKe

```text
maPhieuKiemKe      PK
maNguoiTao         FK -> TaiKhoan
thoiGianTao
```

---

## 7.14 ChiTietKiemKe

```text
maChiTietKiemKe    PK
maPhieuKiemKe      FK -> PhieuKiemKe
maNguyenVatLieu    FK -> NguyenVatLieu
maLo               FK -> LoNguyenVatLieu, NULL
soLuongHeThong
soLuongThucTe
ghiChu             NULL
```

Rule:

```text
chenhLech = soLuongThucTe - soLuongHeThong
```

`soLuongThucTe >= 0`.

---

## 7.15 BienDongKho

```text
maBienDong          PK
maNguyenVatLieu     FK -> NguyenVatLieu
maLo                FK -> LoNguyenVatLieu, NULL
maChiTietNhap       FK -> ChiTietPhieuNhap, NULL
maChiTietDon        FK -> ChiTietDonGoiMon, NULL
maChiTietKiemKe     FK -> ChiTietKiemKe, NULL
maNguoiThucHien     FK -> TaiKhoan
loaiBienDong
soLuongThayDoi
lyDo                NULL
thoiGian
```

`BienDongKho` là ledger trung tâm để giải thích tăng/giảm tồn.

Không tạo bảng `TonKho`.

---

## 7.16 HoaDon

```text
maHoaDon            PK
maPhienPhucVu       FK -> PhienPhucVu
maThuNgan           FK -> TaiKhoan
phuongThuc
soTien
thoiGianThanhToan
```

Ràng buộc quan trọng:

```text
UNIQUE(maPhienPhucVu)
```

Một phiên chỉ thanh toán một lần.

---

## 7.17 DoiSoatDoanhThu

```text
maDoiSoat           PK
maThuNgan           FK -> TaiKhoan
maQuanLy            FK -> TaiKhoan, NULL trước khi xác nhận
thoiGianBatDau
thoiGianKetThuc
doanhThuHeThong
soTienThucNhan
lyDoChenhLech       NULL
thoiGianDoiSoat
```

Không thêm cột `trangThai` nếu chưa sửa ERD.

Quy ước:
- `maQuanLy == NULL` → chưa được Quản lý xác nhận;
- `maQuanLy != NULL` → đã được xác nhận.

---

# 8. CLASS DIAGRAM — 18 LỚP NGHIỆP VỤ

Class Diagram là mô hình trực quan, không phải API code bắt buộc.

Code phải bảo toàn **ý nghĩa** của các thuộc tính/phương thức sau.

## 8.1 KhuVucBan

Thuộc tính:
```text
maKhuVuc
tenKhuVuc
trangThai
```

Hành vi:
```text
capNhatThongTin()
kichHoat()
ngungSuDung()
```

## 8.2 Ban

Thuộc tính:
```text
maBan
tenBan
sucChua
trangThai
```

Hành vi:
```text
capNhatThongTin()
kiemTraSucChua()
kichHoat()
ngungSuDung()
```

## 8.3 DonDatBan

Thuộc tính:
```text
maDonDatBan
tenKhach
soDienThoaiKhach
soLuongKhach
thoiGianBatDau
thoiGianKetThuc
ghiChu
trangThai
ngayTao
```

Hành vi:
```text
capNhatThongTin()
kiemTraTrungLich()
huy()
xacNhanNhanBan()
```

## 8.4 TaiKhoan

Thuộc tính:
```text
maTaiKhoan
hoTen
soDienThoai
matKhau
vaiTro
trangThai
```

Hành vi:
```text
xacThucMatKhau()
capNhatThongTin()
doiMatKhau()
khoa()
moKhoa()
thayDoiVaiTro()
```

## 8.5 PhienPhucVu

Thuộc tính:
```text
maPhienPhucVu
thoiGianMo
thoiGianDong
trangThai
```

Hành vi:
```text
tinhTongTien()
kiemTraDieuKienThanhToan()
ketThuc()
```

## 8.6 DonGoiMon

Thuộc tính:
```text
maDonGoiMon
thoiGianTao
```

Hành vi:
```text
themChiTietMon()
tinhTongTien()
```

## 8.7 ChiTietDonGoiMon

Thuộc tính:
```text
maChiTietDon
soLuong
ghiChu
trangThai
lyDoKhongTheCheBien
donGiaTaiThoiDiem
```

Hành vi:
```text
tinhThanhTien()
batDauCheBien()
baoKhongTheCheBien()
hoanThanh()
huy()
xacNhanDaPhucVu()
```

## 8.8 MonAn

Thuộc tính:
```text
maMonAn
tenMon
giaBan
trangThai
```

Hành vi:
```text
capNhatThongTin()
thayDoiGia()
kichHoat()
ngungKinhDoanh()
```

## 8.9 DinhLuongMonAn

Thuộc tính:
```text
soLuongDinhMuc
```

Hành vi:
```text
tinhLuongTieuHao()
```

## 8.10 NguyenVatLieu

Thuộc tính:
```text
maNguyenVatLieu
tenNguyenVatLieu
donViTinh
nguongTonToiThieu
theoDoiLo
theoDoiHSD
trangThai
```

Hành vi:
```text
capNhatThongTin()
kiemTraDuoiNguong()
kichHoat()
ngungSuDung()
```

## 8.11 LoNguyenVatLieu

Thuộc tính:
```text
maLo
soLo
hanSuDung
```

Hành vi:
```text
kiemTraHetHan()
kiemTraSapHetHan()
```

## 8.12 PhieuNhap

Thuộc tính:
```text
maPhieuNhap
ngayTao
```

Hành vi:
```text
themChiTietNhap()
```

## 8.13 ChiTietPhieuNhap

Thuộc tính:
```text
maChiTietNhap
soLuongNhap
```

Không bắt buộc phương thức riêng.

## 8.14 PhieuKiemKe

Thuộc tính:
```text
maPhieuKiemKe
thoiGianTao
```

Hành vi:
```text
themChiTietKiemKe()
```

## 8.15 ChiTietKiemKe

Thuộc tính:
```text
maChiTietKiemKe
soLuongHeThong
soLuongThucTe
ghiChu
```

Hành vi:
```text
tinhChenhLech()
```

## 8.16 BienDongKho

Thuộc tính:
```text
maBienDong
loaiBienDong
soLuongThayDoi
lyDo
thoiGian
```

Hành vi:
```text
laTangKho()
laGiamKho()
```

## 8.17 HoaDon

Thuộc tính:
```text
maHoaDon
phuongThuc
soTien
thoiGianThanhToan
```

Không bắt buộc phương thức riêng.

## 8.18 DoiSoatDoanhThu

Thuộc tính:
```text
maDoiSoat
thoiGianBatDau
thoiGianKetThuc
doanhThuHeThong
soTienThucNhan
lyDoChenhLech
thoiGianDoiSoat
```

Hành vi:
```text
tinhChenhLech()
xacNhan()
```

---

# 9. QUAN HỆ DỮ LIỆU/CLASS CHÍNH

Giữ các quan hệ sau:

```text
KhuVucBan 1 ---- * Ban

Ban 1 ---- * DonDatBan
TaiKhoan 1 ---- * DonDatBan

Ban 1 ---- * PhienPhucVu
DonDatBan 0..1 ---- 0..1 PhienPhucVu
TaiKhoan 1 ---- * PhienPhucVu

PhienPhucVu 1 ---- * DonGoiMon
TaiKhoan 1 ---- * DonGoiMon

DonGoiMon 1 ---- * ChiTietDonGoiMon
MonAn 1 ---- * ChiTietDonGoiMon

MonAn 1 ---- * DinhLuongMonAn
NguyenVatLieu 1 ---- * DinhLuongMonAn

NguyenVatLieu 1 ---- * LoNguyenVatLieu

PhieuNhap 1 ---- * ChiTietPhieuNhap
NguyenVatLieu 1 ---- * ChiTietPhieuNhap
LoNguyenVatLieu 0..1 ---- * ChiTietPhieuNhap
TaiKhoan 1 ---- * PhieuNhap

PhieuKiemKe 1 ---- * ChiTietKiemKe
NguyenVatLieu 1 ---- * ChiTietKiemKe
LoNguyenVatLieu 0..1 ---- * ChiTietKiemKe
TaiKhoan 1 ---- * PhieuKiemKe

NguyenVatLieu 1 ---- * BienDongKho
LoNguyenVatLieu 0..1 ---- * BienDongKho
ChiTietPhieuNhap 0..1 ---- BienDongKho
ChiTietKiemKe 0..1 ---- 0..1 BienDongKho
ChiTietDonGoiMon 0..1 ---- * BienDongKho
TaiKhoan 1 ---- * BienDongKho

PhienPhucVu 1 ---- 0..1 HoaDon
TaiKhoan 1 ---- * HoaDon

TaiKhoan 1 ---- * DoiSoatDoanhThu (vai trò Thu ngân)
TaiKhoan 0..1 ---- * DoiSoatDoanhThu (vai trò Quản lý xác nhận)
```

## 9.1 Composition trong Class Diagram

Ba quan hệ Composition về mặt mô hình:

```text
DonGoiMon ◆---- ChiTietDonGoiMon
PhieuNhap ◆---- ChiTietPhieuNhap
PhieuKiemKe ◆---- ChiTietKiemKe
```

Điều này **không có nghĩa** database phải hard-delete cascade dữ liệu lịch sử.

Trong DB ưu tiên `Restrict/NoAction` cho dữ liệu nghiệp vụ lịch sử.

---

# 10. CÁC ĐIỂM MÂU THUẪN NHỎ ĐƯỢC GIẢI QUYẾT CHO IMPLEMENTATION

Phần này rất quan trọng. Codex phải làm theo đây nếu gặp đúng mâu thuẫn.

## 10.1 “Ca làm việc” trong FR-10/UC11.2 nhưng ERD không có CaLamViec

Không tạo bảng `CaLamViec`.

Trong prototype:
- “ca” được biểu diễn bằng **khoảng thời gian bắt đầu/kết thúc** của `DoiSoatDoanhThu`;
- Thu ngân chọn hoặc nhập thời gian bắt đầu/kết thúc của ca cần đối soát;
- hóa đơn thuộc ca nếu:

```text
HoaDon.thoiGianThanhToan >= DoiSoat.thoiGianBatDau
AND
HoaDon.thoiGianThanhToan < DoiSoat.thoiGianKetThuc
```

- UI vẫn được phép gọi nghiệp vụ là “Đối soát cuối ca”.
- Không thêm FK `maCa` vào `HoaDon`.

Cách này đáp ứng nghiệp vụ cuối ca nhưng vẫn giữ đúng ERD 18 bảng.

## 10.2 Trạng thái bàn

TO-BE và UC11.1 yêu cầu:
- mở phiên → “Đang phục vụ”;
- thanh toán → “Trống”.

Do đó `Ban.trangThai` triển khai các trạng thái vận hành/lifecycle như mục 6.3.

Đặt bàn tương lai không bắt buộc đổi persistent state thành “Đã đặt”; UI đọc `DonDatBan` để hiển thị thông tin đặt trước.

## 10.3 ERD lặp ghiChu trong ChiTietDonGoiMon

Chỉ tạo **một** `ghiChu`.

## 10.4 Class Diagram không có Service/Controller

Service/Controller là implementation detail và không được tính là class nghiệp vụ của luận văn.

## 10.5 Tồn ban đầu

TO-BE nói Bếp trưởng kiểm kê ban đầu và ghi nhận tồn.

Không thêm loại biến động `TON_DAU`.

Cách triển khai:
- thực hiện một `PhieuKiemKe` khởi tạo;
- `soLuongHeThong = 0`;
- `soLuongThucTe = tồn ban đầu`;
- tạo `DIEU_CHINH_KIEM_KE` tương ứng sau xác nhận.

## 10.6 UC6.3 chưa liệt kê tiêu hao nhưng BR-11/FR-18 có tiêu hao

Màn hình “Biến động nguyên vật liệu” phải cho phép xem **tất cả** movement:
- NHAP;
- TIEU_HAO;
- DIEU_CHINH_KIEM_KE;
- LOAI_BO.

Điều này cần thiết để BR-11 và FR-18 có khả năng truy vết.

## 10.7 Lô tiêu hao

Khóa luận yêu cầu quản lý lô/HSD nhưng không đặc tả thao tác lựa chọn lô khi món hoàn thành.

**Không tự áp đặt FEFO tự động trong bản đầu.**

- `maLo` của movement `TIEU_HAO` có thể NULL nếu không có thông tin lô được ghi nhận.
- Tồn tổng theo `NguyenVatLieu` là số liệu chính.
- Các movement có nguồn lô rõ (NHAP, LOAI_BO, kiểm kê theo lô) phải gắn `maLo`.
- Không hiển thị một “tồn theo lô chính xác tuyệt đối” nếu tiêu hao chưa được phân bổ lô.
- Nếu sau này cần quản lý tiêu hao chi tiết theo lô, phải nâng cấp nghiệp vụ sau khi được chấp thuận.

---

# 11. BIENDONGKHO — LEDGER TRUNG TÂM CỦA TỒN KHO

Không tạo bảng `TonKho`.

Tồn hiện tại của nguyên vật liệu:

```text
TonHienTai =
SUM(BienDongKho.soLuongThayDoi)
```

Theo `maNguyenVatLieu`.

Quy ước dấu:

```text
NHAP                   số dương
TIEU_HAO                số âm
DIEU_CHINH_KIEM_KE      dương hoặc âm
LOAI_BO                 số âm
```

Nguồn:

```text
NHAP
-> maChiTietNhap

TIEU_HAO
-> maChiTietDon

DIEU_CHINH_KIEM_KE
-> maChiTietKiemKe

LOAI_BO
-> không có bảng phiếu loại bỏ riêng;
   lưu NVL/lô/người/lý do/thời gian trực tiếp tại BienDongKho
```

Không xóa movement đã phát sinh.

---

# 12. LUỒNG NGHIỆP VỤ CẦN CODE

## 12.1 UC1.1 — Đăng nhập

1. Nhập số điện thoại + mật khẩu.
2. Validate format.
3. Tìm `TaiKhoan`.
4. Kiểm tra `BI_KHOA`.
5. Verify password hash.
6. Tạo authentication cookie.
7. Claims:
   - User ID;
   - Họ tên;
   - Role.
8. Redirect theo role.

Không trả lỗi phân biệt “số điện thoại tồn tại nhưng sai mật khẩu” quá chi tiết.

## 12.2 UC1.2 — Quên mật khẩu

Luận văn có bước gửi OTP SMS.

Prototype local:
- nhập số điện thoại;
- tìm đúng một tài khoản;
- tạo OTP;
- lưu OTP + expiration trong Session;
- gọi `OtpSender` dạng development/mock;
- ở môi trường Development có thể ghi OTP ra console/log hoặc màn hình debug rõ ràng;
- không cần tích hợp SMS trả phí;
- xác thực OTP;
- cho đặt mật khẩu mới;
- hash và cập nhật.

Không tạo bảng OTP.

## 12.3 UC2 — Quản lý nguyên vật liệu

CHU_QUAN:
- thêm;
- sửa;
- ngừng sử dụng.

Validation:
- tên bắt buộc;
- đơn vị tính bắt buộc;
- ngưỡng >= 0;
- nếu NVL đã có movement, thay đổi đơn vị tính phải bị giới hạn nếu gây sai lịch sử.

Không hard delete.

## 12.4 UC3 — Quản lý khu vực và bàn

CHU_QUAN:
- thêm/sửa/ngừng khu vực;
- thêm/sửa/ngừng bàn.

Khi ngừng khu vực:
- kiểm tra các bàn trực thuộc.

Khi ngừng bàn:
- không có phiên đang hoạt động;
- không có đặt bàn còn hiệu lực gây xung đột.

## 12.5 UC4 — Quản lý tài khoản

CHU_QUAN:
- tạo tài khoản;
- khóa/mở;
- thay đổi vai trò.

Business rule:
- `SoDienThoai` unique;
- đúng một role;
- password hash;
- role bắt buộc.

Không dùng schema ASP.NET Identity vì ERD có `TaiKhoan` riêng.

## 12.6 UC5 — Quản lý thực đơn

CHU_QUAN:
- thêm món;
- sửa món;
- đổi giá;
- ngừng kinh doanh.

Giá lịch sử:
- `ChiTietDonGoiMon.donGiaTaiThoiDiem` không đổi khi `MonAn.giaBan` đổi.

## 12.7 FR-18 — Quản lý định lượng

CHU_QUAN và BEP_TRUONG:
- xem định lượng của món;
- thêm/cập nhật/xóa dòng định lượng trước khi sử dụng;
- `soLuongDinhMuc > 0`;
- không hard-delete lịch sử order; thay đổi định lượng chỉ áp dụng cho các lần tiêu hao sau thời điểm thay đổi.

## 12.8 UC6.1 — Xem bán hàng/doanh thu

CHU_QUAN:
- chọn khoảng thời gian;
- tổng hợp từ `HoaDon`;
- số hóa đơn;
- doanh thu;
- món bán có thể tổng hợp từ các chi tiết hợp lệ;
- bộ lọc;
- trạng thái không có dữ liệu.

Không tạo bảng `DoanhThu`.

## 12.9 UC6.2 — Xem tồn kho

CHU_QUAN/BEP_TRUONG:
- danh sách NVL;
- tồn tổng;
- ngưỡng;
- badge tồn thấp;
- lô/HSD;
- cảnh báo gần hết hạn/hết hạn;
- filter/search.

Số ngày cảnh báo HSD có thể cấu hình appsettings, ví dụ mặc định 3 ngày.

## 12.10 UC6.3 — Xem biến động nguyên vật liệu

CHU_QUAN:
- filter theo NVL;
- thời gian;
- loại movement;
- xem nguồn liên quan;
- hiển thị NHAP/TIEU_HAO/DIEU_CHINH_KIEM_KE/LOAI_BO.

## 12.11 UC7 — Quản lý đặt bàn

QUAN_LY là actor chính.

### Tạo
- nhập khách;
- SĐT;
- số khách;
- bắt đầu;
- kết thúc;
- ghi chú;
- chọn bàn;
- kiểm tra sức chứa;
- kiểm tra overlap;
- lưu `DA_XAC_NHAN`.

### Sửa
- kiểm tra overlap lại;
- bỏ qua chính booking đang sửa.

### Hủy
- không DELETE;
- chuyển `DA_HUY`;
- chỉ khi booking chưa chuyển thành phiên.

PHUC_VU:
- được xem/tra cứu booking để bố trí khách.

## 12.12 UC8.1 — Mở phiên phục vụ

NHAN_VIEN_PHUC_VU là actor chính; QUAN_LY được phép hỗ trợ.

1. Chọn bàn.
2. Kiểm tra bàn không `NGUNG_SU_DUNG`.
3. Kiểm tra không có phiên `DANG_HOAT_DONG`.
4. Nếu khách có booking:
   - xác nhận booking phù hợp;
   - gắn `maDatBan`;
   - booking -> `DA_NHAN_BAN`.
5. Tạo `PhienPhucVu`.
6. `Ban.trangThai -> DANG_PHUC_VU`.

Transaction cho bước 4–6.

## 12.13 UC8.2 — Ghi nhận đơn gọi món

NHAN_VIEN_PHUC_VU; QUAN_LY có thể hỗ trợ.

Mỗi lần xác nhận một đợt gọi món:
1. tạo `DonGoiMon`;
2. thêm 1..n `ChiTietDonGoiMon`;
3. snapshot giá;
4. status `CHO_CHE_BIEN`.

Gọi thêm:
- tạo `DonGoiMon` mới;
- cùng `PhienPhucVu`.

Chỉ món `DANG_KINH_DOANH` được chọn cho đơn mới.

### Điều chỉnh/hủy món

- phục vụ/quản lý thực hiện;
- không cho sửa/hủy tự do sau khi món đã `HOAN_THANH` hoặc `DA_PHUC_VU`;
- bếp không hủy thay khách;
- bếp chỉ báo `KHONG_THE_CHE_BIEN` + lý do.

## 12.14 UC8.3 — Theo dõi và xác nhận phục vụ

PHUC_VU:
- xem món `HOAN_THANH`;
- nhận món;
- xác nhận phục vụ;
- `HOAN_THANH -> DA_PHUC_VU`.

Chỉ `HOAN_THANH` mới được chuyển `DA_PHUC_VU`.

## 12.15 UC9 — Cập nhật trạng thái chế biến

NHAN_VIEN_BEP/BEP_TRUONG.

```text
CHO_CHE_BIEN -> DANG_CHE_BIEN
DANG_CHE_BIEN -> HOAN_THANH
CHO_CHE_BIEN/DANG_CHE_BIEN -> KHONG_THE_CHE_BIEN
```

Khi `KHONG_THE_CHE_BIEN`:
- lý do bắt buộc;
- không phát sinh tiêu hao;
- phục vụ nhìn thấy để xử lý với khách.

Khi `HOAN_THANH`:
- chỉ được thực hiện một lần;
- đọc định lượng;
- tính tiêu hao:

```text
soLuongTieuHao =
soLuongDinhMuc * soLuongMon
```

- tạo `BienDongKho` loại `TIEU_HAO`;
- movement âm;
- `maChiTietDon` liên kết nguồn;
- cập nhật trạng thái item.

Toàn bộ cập nhật trạng thái + movements trong một transaction.

Nếu thao tác hoàn thành bị gửi lại:
- không tạo tiêu hao lần hai.

Không ép một rule “tự động FEFO” nếu không được yêu cầu.

## 12.16 UC10.1 — Kiểm kê

BEP_TRUONG.

1. Hiển thị tồn hệ thống tại thời điểm kiểm kê.
2. Nhập số thực tế.
3. Tính:
   `chenhLech = thucTe - heThong`.
4. Cho ghi chú/nguyên nhân nếu có.
5. Xác nhận.
6. Tạo `PhieuKiemKe`.
7. Tạo `ChiTietKiemKe`.
8. Nếu chênh lệch != 0:
   - tạo movement `DIEU_CHINH_KIEM_KE`.
9. Commit.

Nếu chênh lệch = 0:
- vẫn lưu phiếu/chi tiết kiểm kê;
- không cần movement.

## 12.17 UC10.2 — Loại bỏ

BEP_TRUONG.

Input:
- NVL;
- lô nếu áp dụng;
- số lượng;
- lý do.

Validation:
- số lượng > 0;
- không vượt tồn hiện có;
- lý do bắt buộc.

Tạo:
```text
BienDongKho
LoaiBienDong = LOAI_BO
SoLuongThayDoi = -soLuong
```

Không tạo `PhieuLoaiBo`.

## 12.18 UC10.3 — Nhập nguyên vật liệu

BEP_TRUONG.

Chỉ hàng đã kiểm tra/chấp nhận mới ghi nhận.

Transaction:
1. tạo `PhieuNhap`;
2. tạo các `ChiTietPhieuNhap`;
3. tạo/gắn lô khi áp dụng;
4. mỗi detail tạo movement `NHAP` dương;
5. commit.

Không quản lý NCC/PO/công nợ.

## 12.19 UC11.1 — Thanh toán

THU_NGAN.

1. Chọn bàn/phiên đang hoạt động.
2. Tải tất cả đợt gọi món trong phiên.
3. Loại món `DA_HUY`, `KHONG_THE_CHE_BIEN`.
4. Tính tổng từ:
   `soLuong * donGiaTaiThoiDiem`.
5. Thu ngân kiểm tra.
6. Chọn phương thức.
7. Xác nhận đã nhận tiền/chuyển khoản.
8. Transaction:
   - tạo `HoaDon`;
   - đóng `PhienPhucVu`;
   - set `thoiGianDong`;
   - `Ban.trangThai -> TRONG`.
9. Commit.

Business rule:
- một phiên chỉ thanh toán một lần;
- invoice existence = giao dịch đã thành công;
- không tạo bảng doanh thu;
- doanh thu lấy từ HoaDon.

Nếu còn món `CHO_CHE_BIEN`/`DANG_CHE_BIEN`, cảnh báo và không thanh toán cho tới khi xử lý xong.

## 12.20 UC11.2 — Đối soát cuối ca

THU_NGAN + QUAN_LY.

1. Thu ngân chọn khoảng thời gian của ca.
2. Hệ thống lấy HoaDon thành công trong khoảng đó.
3. Tổng hợp theo:
   - tổng;
   - tiền mặt;
   - chuyển khoản.
4. Thu ngân nhập `soTienThucNhan`.
5. Tính chênh lệch.
6. Nếu có chênh lệch, nhập `lyDoChenhLech` khi xác định được.
7. Tạo `DoiSoatDoanhThu`, `maQuanLy = NULL`.
8. Quản lý kiểm tra.
9. Khi Quản lý xác nhận:
   - gán `maQuanLy`;
   - cập nhật `thoiGianDoiSoat` nếu cần theo flow.
10. Không ghi doanh thu lần 2.

## 12.21 UC12.1 — Sửa thông tin cá nhân

Tất cả internal user:
- chỉ sửa tài khoản của chính mình;
- họ tên;
- số điện thoại nếu không trùng;
- không sửa role;
- không sửa trạng thái tài khoản.

## 12.22 UC12.2 — Đổi mật khẩu

- nhập mật khẩu hiện tại;
- xác thực;
- nhập mật khẩu mới + xác nhận;
- hai giá trị trùng nhau;
- hash mới;
- lưu.

---

# 13. SERVICE ĐỀ XUẤT — CHỈ LÀ IMPLEMENTATION DETAIL

Có thể dùng:

```text
AuthService
TaiKhoanService
BanService
DatBanService
ThucDonService
PhienPhucVuService
BepService
TonKhoService
ThanhToanService
DoiSoatDoanhThuService
BaoCaoService
```

Không bắt buộc tạo interface cho từng Service.

Service không phải Class Diagram của khóa luận.

---

# 14. CONTROLLER/MÀN HÌNH ĐỀ XUẤT

## 14.1 AuthController
- Login
- Logout
- ForgotPassword
- VerifyOtp
- ResetPassword

## 14.2 TaiKhoanController
- danh sách tài khoản
- tạo
- khóa/mở
- đổi role
- profile
- đổi mật khẩu

## 14.3 BanController
- khu vực
- bàn
- trạng thái
- sơ đồ bàn

## 14.4 DatBanController
- danh sách
- tạo
- sửa
- hủy

## 14.5 ThucDonController
- món
- giá
- trạng thái kinh doanh
- định lượng

## 14.6 PhienPhucVuController
- sơ đồ bàn
- mở phiên
- chi tiết phiên
- gọi món
- gọi thêm
- điều chỉnh/hủy món
- món cần phục vụ
- xác nhận đã phục vụ

## 14.7 BepController
- màn hình bếp
- danh sách món chờ/đang làm
- bắt đầu
- không thể chế biến
- hoàn thành

## 14.8 TonKhoController
- tồn
- lô/HSD
- nhập
- kiểm kê
- loại bỏ
- movements

## 14.9 ThanhToanController
- xem chi tiết cần thanh toán
- xác nhận thanh toán
- lịch sử

## 14.10 DoiSoatController
- tạo đối soát
- danh sách
- chi tiết
- Quản lý xác nhận

## 14.11 DashboardController
- bán hàng/doanh thu
- tồn/cảnh báo
- lịch sử tổng hợp phù hợp quyền

---

# 15. UI TỐI THIỂU

## 15.1 Layout theo role

Menu hiển thị theo role nhưng backend vẫn authorize.

## 15.2 Sơ đồ bàn

Grid theo khu vực.

Mỗi card bàn:
- tên bàn;
- sức chứa;
- trạng thái;
- booking gần/đang hiệu lực nếu có;
- nút mở phiên nếu đủ điều kiện;
- nút xem phiên nếu đang phục vụ.

## 15.3 Màn hình phiên phục vụ

Hiển thị:
- bàn;
- booking nếu có;
- thời gian mở;
- các `DonGoiMon` theo từng đợt;
- từng item + status;
- nút gọi thêm;
- điều chỉnh/hủy khi hợp lệ.

## 15.4 Màn hình bếp

Tối ưu thao tác:
- bàn;
- món;
- số lượng;
- ghi chú;
- thời gian tạo;
- trạng thái;
- Bắt đầu chế biến;
- Không thể chế biến;
- Hoàn thành.

## 15.5 Tồn kho

- NVL;
- đơn vị;
- tồn hiện tại;
- ngưỡng;
- cảnh báo;
- lô/HSD khi có;
- filter/search.

## 15.6 Dashboard

Không cần thư viện chart phức tạp.

Tối thiểu:
- doanh thu theo khoảng;
- số hóa đơn;
- món bán;
- tồn thấp;
- lô sắp hết hạn;
- movement gần đây.

---

# 16. DATABASE CONFIGURATION VÀ CONSTRAINT

## 16.1 Index/unique quan trọng

Bắt buộc:
```text
TaiKhoan.soDienThoai UNIQUE
HoaDon.maPhienPhucVu UNIQUE
```

Index:
```text
DonDatBan(maBan, thoiGianBatDau, thoiGianKetThuc, trangThai)
PhienPhucVu(maBan, trangThai)
DonGoiMon(maPhienPhucVu, thoiGianTao)
ChiTietDonGoiMon(maDonGoiMon, trangThai)
BienDongKho(maNguyenVatLieu, maLo, thoiGian)
HoaDon(thoiGianThanhToan)
DoiSoatDoanhThu(thoiGianBatDau, thoiGianKetThuc)
```

Có thể index các FK còn lại theo nhu cầu.

## 16.2 Delete behavior

Không hard-delete dữ liệu lịch sử.

Với quan hệ lịch sử:
```text
DeleteBehavior.Restrict / NoAction
```

Master data dùng trạng thái ngừng sử dụng.

## 16.3 Transaction bắt buộc

- mở phiên với booking + cập nhật bàn;
- hoàn thành món + tiêu hao;
- nhập hàng + movement;
- kiểm kê + adjustment movement;
- thanh toán + HoaDon + đóng phiên + trạng thái bàn;
- các thao tác nhiều bảng khác nếu có nguy cơ cập nhật nửa chừng.

---

# 17. SECURITY

- Password hash.
- Cookie HttpOnly.
- Secure khi HTTPS.
- SameSite phù hợp.
- Anti-forgery cho POST form.
- AJAX thay đổi dữ liệu phải gửi antiforgery token.
- Authorization backend.
- Không tin role từ client.
- Không tin tổng tiền từ client.
- Không đưa connection string/DB password ra JavaScript.
- Không log plaintext password/OTP.
- Không hiển thị stack trace production.
- Validate server-side.

---

# 18. NFR VÀ TỐI ƯU VỪA ĐỦ

- Async database I/O.
- `AsNoTracking()` cho read-only.
- Projection vào ViewModel.
- Không `Include()` toàn bộ graph vô ích.
- Tránh N+1.
- Phân trang cho history lớn.
- Index đúng.
- Polling endpoint chỉ trả dữ liệu cần thiết.
- Không cache state nghiệp vụ quan trọng ở browser.
- Sau commit mới trả success.
- UX phải dùng thuật ngữ giống luận văn.

Không tối ưu cho hàng triệu user.
Mục tiêu chỉ là hệ thống nội bộ khoảng 30–50 bàn.

---

# 19. TRUY VẾT REQUIREMENT → CODE

Codex phải tạo:

```text
docs/TRACEABILITY.md
```

Tối thiểu:

| Requirement | Use Case | Module | Entity/Table | Controller/Service |
|---|---|---|---|---|
| FR-01 | UC1, UC4, UC12 | Auth/TaiKhoan | TaiKhoan | AuthController/TaiKhoanService |
| FR-02 | UC3, UC5 | Ban/ThucDon | KhuVucBan, Ban, MonAn | BanController/ThucDonController |
| FR-03 | UC7 | DatBan | DonDatBan, Ban | DatBanController/DatBanService |
| FR-04 | UC8.1, UC11.1 | PhienPhucVu | Ban, PhienPhucVu | PhienPhucVu/ThanhToan |
| FR-05 | UC8.2 | DonGoiMon | DonGoiMon, ChiTietDonGoiMon | PhienPhucVuService |
| FR-06 | UC8.2, UC9 | DieuChinhMon | ChiTietDonGoiMon | PhienPhucVu/Bep |
| FR-07 | UC9 | Bep | ChiTietDonGoiMon | BepController/BepService |
| FR-08 | UC8.3 | PhucVu | ChiTietDonGoiMon | PhienPhucVuController |
| FR-09 | UC11.1 | ThanhToan | HoaDon, PhienPhucVu | ThanhToanService |
| FR-10 | UC11.2 | DoiSoat | HoaDon, DoiSoatDoanhThu | DoiSoatService |
| FR-11 | UC2 | NguyenVatLieu | NguyenVatLieu | TonKhoService |
| FR-12 | UC10.3 | Nhap | PhieuNhap, ChiTietPhieuNhap, BienDongKho | TonKhoService |
| FR-13 | UC6.2 | TonKho | NguyenVatLieu, LoNguyenVatLieu, BienDongKho | TonKhoService |
| FR-14 | UC10.1 | KiemKe | PhieuKiemKe, ChiTietKiemKe, BienDongKho | TonKhoService |
| FR-15 | UC10.2 | LoaiBo | BienDongKho | TonKhoService |
| FR-16 | UC6 | History | nhiều bảng | Dashboard/TonKho/ThanhToan |
| FR-17 | UC6 | Dashboard | HoaDon, BienDongKho, order tables | BaoCaoService |
| FR-18 | UC9 + quản lý định lượng | DinhLuong/TieuHao | DinhLuongMonAn, BienDongKho | ThucDon/Bep |

Không cần ép tên controller/service giống bảng trên nếu code tổ chức tốt hơn, nhưng traceability phải rõ.

---

# 20. SEED DATA CHO DEMO

Seed Development:

- 6 tài khoản, mỗi role 1 tài khoản;
- password hash;
- 2–3 khu vực;
- khoảng 10–15 bàn;
- vài booking tương lai;
- khoảng 8–12 món;
- khoảng 8–12 NVL;
- định lượng cho ít nhất 5 món;
- vài lô/HSD;
- dữ liệu tồn ban đầu thông qua kiểm kê khởi tạo/adjustment;
- một số dữ liệu demo lịch sử nếu cần.

Không seed password plaintext vào DB.

README có thể ghi password demo.

---

# 21. ACCEPTANCE TEST — PHẢI KIỂM TRA

## Auth/account
1. Login đúng.
2. Login sai.
3. Tài khoản khóa không login.
4. Sai role bị 403.
5. Phone duplicate bị chặn.
6. User không tự đổi role.
7. Đổi mật khẩu phải xác thực mật khẩu cũ.
8. OTP sai/hết hạn không reset.

## Bàn/đặt bàn
9. Tạo bàn sức chứa <= 0 bị chặn.
10. Booking vượt sức chứa bị chặn.
11. Booking overlap bị chặn.
12. Sửa booking kiểm tra overlap và không tự xung đột chính nó.
13. Hủy booking chuyển trạng thái, không delete.
14. Không ngừng bàn đang có phiên/booking hiệu lực.

## Phiên/order
15. Walk-in mở phiên được.
16. Booking mở phiên được liên kết.
17. Booking -> DA_NHAN_BAN.
18. Không mở 2 phiên active cùng bàn.
19. Gọi thêm tạo DonGoiMon mới cùng phiên.
20. Giá order cũ không thay đổi khi giá món đổi.
21. Món ngừng kinh doanh không gọi mới.
22. Món hoàn thành/đã phục vụ không bị chỉnh sửa tùy ý.

## Bếp
23. CHO_CHE_BIEN -> DANG_CHE_BIEN.
24. KHONG_THE_CHE_BIEN lưu lý do.
25. KHONG_THE_CHE_BIEN không tạo tiêu hao.
26. HOAN_THANH tạo tiêu hao đúng định lượng.
27. Gửi hoàn thành 2 lần không trừ kho 2 lần.
28. Phục vụ chỉ xác nhận `HOAN_THANH -> DA_PHUC_VU`.

## Kho
29. Nhập hàng tạo PhieuNhap + detail + NHAP trong transaction.
30. Kiểm kê tính chênh lệch đúng.
31. Chênh lệch 0 không tạo movement điều chỉnh.
32. Chênh lệch != 0 tạo adjustment sau xác nhận.
33. Loại bỏ <= 0 bị chặn.
34. Loại bỏ > tồn bị chặn.
35. Loại bỏ thiếu lý do bị chặn.
36. Tồn tổng = SUM movement.
37. Cảnh báo tồn thấp đúng.
38. Cảnh báo HSD đúng.

## Thanh toán/đối soát
39. Hủy/không thể chế biến không tính tiền.
40. Tổng tiền dùng `donGiaTaiThoiDiem`.
41. Một phiên chỉ có một HoaDon.
42. Double submit không tạo hóa đơn thứ hai.
43. Thanh toán thành công đóng phiên và bàn -> TRONG.
44. Doanh thu lấy từ HoaDon.
45. Đối soát chỉ lấy HoaDon trong khoảng ca.
46. Đối soát không ghi doanh thu lần hai.
47. Chưa có `maQuanLy` = chưa xác nhận.
48. Quản lý xác nhận thì cập nhật `maQuanLy`.

## Persistence/NFR
49. Reload không mất dữ liệu đã commit.
50. Polling bếp thấy món mới.
51. Polling phục vụ thấy trạng thái mới.
52. Giao diện responsive cơ bản.
53. History có thể lọc/tra cứu.
54. Backup/restore có hướng dẫn và script.

---

# 22. PHASE TRIỂN KHAI

## Phase 0 — Scaffold
- ASP.NET Core MVC .NET 10.
- PostgreSQL package.
- EF Core.
- Bootstrap layout.
- error handling.
- Session.
- authentication placeholder.
- `dotnet build`.

## Phase 1 — 18 Entity + ERD
- tạo đủ 18 entity;
- enum;
- AppDbContext;
- Fluent configuration;
- constraints/index;
- migration;
- schema.sql;
- seed;
- kiểm tra đúng ERD.

## Phase 2 — Auth + TaiKhoan
- UC1;
- UC4;
- UC12;
- cookie auth;
- role claims;
- OTP mock/dev;
- profile.

## Phase 3 — Master Data
- UC2;
- UC3;
- UC5;
- FR18 định lượng.

## Phase 4 — Reservation + Table Map
- UC7;
- booking overlap;
- sức chứa;
- sơ đồ bàn;
- polling trạng thái nếu cần.

## Phase 5 — PhienPhucVu + DonGoiMon
- UC8.1;
- UC8.2;
- gọi thêm;
- điều chỉnh/hủy.

## Phase 6 — Bếp + Phục vụ + Tiêu hao
- UC9;
- UC8.3;
- polling;
- movement TIEU_HAO;
- transaction/idempotency.

## Phase 7 — Inventory
- UC6.2/6.3;
- UC10.1/10.2/10.3;
- tồn;
- lô/HSD;
- cảnh báo;
- nhập;
- kiểm kê;
- loại bỏ.

## Phase 8 — Payment + Reconciliation
- UC11.1;
- UC11.2;
- HoaDon;
- DoiSoat;
- ca = time window.

## Phase 9 — Dashboard + History
- UC6.1;
- FR16;
- FR17.

## Phase 10 — QA/Polish
- acceptance test;
- authorization review;
- transaction review;
- performance query review;
- backup/restore;
- README;
- TRACEABILITY.

Không sang phase sau nếu phase hiện tại không build.

---

# 23. LỆNH/MÔI TRƯỜNG

Cài:
- .NET 10 SDK
- PostgreSQL
- VS Code hoặc Visual Studio
- Git

Package chính:
```text
Microsoft.EntityFrameworkCore
Microsoft.EntityFrameworkCore.Design
Npgsql.EntityFrameworkCore.PostgreSQL
```

Migration:
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet ef migrations script -o database/schema.sql
```

Run:
```bash
dotnet restore
dotnet build
dotnet run
```

Không hard-code password DB trong repo.

Development nên dùng:
- User Secrets;
hoặc
- appsettings.Development.json đã gitignore/secrets-safe.

---

# 24. BACKUP/RESTORE

Tạo:
```text
scripts/backup_db.ps1
scripts/restore_db.ps1
```

Dùng:
```text
pg_dump
pg_restore
```

README hướng dẫn:
- tạo database;
- connection string;
- migrations;
- seed;
- run;
- backup;
- restore;
- demo accounts.

---

# 25. DEFINITION OF DONE

Chỉ xem là hoàn thành khi:

- `dotnet build` sạch lỗi.
- Có đúng 18 domain table.
- Schema khớp ERD sau các reconciliation đã ghi rõ ở mục 10.
- 6 role login và authorization đúng.
- Có demo xuyên suốt:
  - booking/walk-in;
  - mở phiên;
  - gọi món;
  - gọi thêm;
  - bếp;
  - tiêu hao;
  - phục vụ;
  - thanh toán;
  - đóng phiên;
  - đối soát.
- Có demo kho:
  - nhập;
  - tồn;
  - kiểm kê;
  - điều chỉnh;
  - loại bỏ;
  - history.
- BR/TR/FR/NFR Must đã được trace.
- Không hard delete lịch sử.
- Không business rule cốt lõi nằm trong JavaScript.
- Không tự thêm domain/bảng ngoài luận văn.
- README đầy đủ.
- TRACEABILITY.md đầy đủ.
- schema.sql sinh từ migration.
- backup/restore.
- UI responsive và đủ rõ để bảo vệ khóa luận.

---

# 26. PROMPT KHỞI ĐẦU CHO CODEX

Dùng nguyên văn:

```text
Bạn là coding agent chịu trách nhiệm xây dựng hệ thống khóa luận theo file CODEX_MASTER_SPEC_KLTN_ASPNET_FINAL.md trong workspace.

Đây là source of truth cho phần hiện thực.

Trước khi viết code:
1. Đọc toàn bộ file.
2. Tóm tắt BR/TR/FR/NFR quan trọng.
3. Liệt kê 18 entity đúng theo ERD.
4. Tóm tắt 6 vai trò và quyền.
5. Tóm tắt workflow:
   - đặt bàn;
   - phiên phục vụ;
   - gọi món/gọi thêm;
   - bếp;
   - tiêu hao;
   - kiểm kê;
   - nhập;
   - loại bỏ;
   - thanh toán;
   - đối soát.
6. Chỉ ra các reconciliation đã được định nghĩa trong mục 10.
7. Chưa tạo/sửa/xóa code.

Không tự thay đổi schema, nghiệp vụ hoặc thêm framework/pattern.

Sau khi tôi xác nhận, chỉ triển khai Phase 0.
```

---

# 27. PROMPT CHO MỖI PHASE

```text
Triển khai Phase <N> theo CODEX_MASTER_SPEC_KLTN_ASPNET_FINAL.md.

Trước khi code:
- liệt kê Requirement/Use Case của phase;
- liệt kê entity/table;
- business rule;
- file dự kiến sửa.

Trong khi code:
- giữ đúng ERD;
- giữ đúng authorization;
- business logic ở backend/service;
- dùng transaction khi cần;
- không thêm bảng ngoài spec;
- không over-engineer.

Sau khi code:
1. chạy dotnet build;
2. chạy/check migration nếu phase liên quan DB;
3. test các acceptance case của phase;
4. báo file đã thay đổi;
5. báo Requirement/Use Case đã hoàn thành;
6. báo bất kỳ khác biệt nào với spec.

Không tự bắt đầu phase tiếp theo.
```

---

# 28. PROMPT REVIEW SAU PHASE

```text
Review phase vừa hoàn thành theo CODEX_MASTER_SPEC_KLTN_ASPNET_FINAL.md.

Kiểm tra:
1. Có bám Requirement không?
2. Actor/role có đúng không?
3. Workflow có đúng Activity/Sequence/Use Case không?
4. Entity/relationship có đúng ERD không?
5. Hành vi có đúng Class Diagram về mặt ý nghĩa không?
6. Có thêm bảng/cột/domain ngoài spec không?
7. Authorization có ở backend không?
8. Transaction có thiếu không?
9. Có double-submit/idempotency issue không?
10. Có business logic nằm sai ở Controller/View/JavaScript không?
11. Có N+1/query thừa không?
12. UI terminology/status có nhất quán với luận văn không?
13. dotnet build có sạch không?
14. acceptance tests liên quan có pass không?

Nếu phát hiện lệch khóa luận, đề xuất cách sửa nhưng không tự thay đổi mô hình nếu thay đổi ảnh hưởng ERD/Requirement.
```

---

# 29. GHI NHỚ CUỐI CÙNG

Mục tiêu của prototype là:

```text
Đúng nghiệp vụ
> đúng Requirement
> đúng dữ liệu
> ổn định
> dễ demo
> dễ giải thích
> dễ bảo trì
> công nghệ vừa đủ
```

Không đánh giá chất lượng hệ thống bằng số lượng framework/pattern.

Khi có lựa chọn giữa:
- cách đơn giản, rõ ràng, đúng luận văn;
- cách phức tạp nhưng “enterprise” hơn;

**luôn chọn cách đơn giản, rõ ràng, đúng luận văn.**
