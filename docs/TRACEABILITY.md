# TRACEABILITY — Requirement → Use Case → Code

Nguồn: `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` (§1, §2, §19).
Tên Việt (khóa luận) ↔ tên code: xem Phụ lục A của spec.

**Phạm vi theo §19 (khi hoàn tất):** `Đã làm` / `Đơn giản hóa` (phần cắt theo §1.2) / `Chưa hiện thực` (cắt, §1.3). Cột Phạm vi mô tả mục tiêu bàn giao, không phải tiến độ hiện tại. Cột Hiện trạng là theo dõi tiến độ riêng: `Chưa làm`, `Đang làm (Phase 0)`, `Đã làm`; khi chốt báo cáo Phase 4 phải đối chiếu kết quả thực tế với ba giá trị §19.
Cột *Phase* là phase dự kiến hiện thực (docs/phase_instructions). Cập nhật cột *Hiện trạng* khi xong từng phase.

## 1. Functional Requirements

| FR | Use Case | Phạm vi | Phase | Controller | Service | Entity | Hiện trạng |
|---|---|---|---|---|---|---|---|
| FR-01 | UC1.1, UC4 (UC1.2, UC12 chưa hiện thực) | Đơn giản hóa | 0, 1 | Auth, Account | AuthService, AccountService | Account | Đã làm |
| FR-02 | UC5, UC3 (UC3 chưa hiện thực — dữ liệu từ seed) | Đơn giản hóa | 1 | Menu, Table | MenuService, TableService | MenuItem, DiningArea, DiningTable | Đã làm |
| FR-03 | UC7 (không sửa đặt bàn) | Đơn giản hóa | 1 | Table | ReservationService | Reservation, DiningTable | Đã làm |
| FR-04 | UC8.1, UC11.1 | Đã làm (đầy đủ) | 1, 3 | ServiceSession, Payment | ServiceSessionService, PaymentService | DiningTable, ServiceSession | Đang làm (Phase 1) |
| FR-05 | UC8.2 | Đã làm (đầy đủ) | 2 | ServiceSession | ServiceSessionService | FoodOrder, OrderItem | Chưa làm |
| FR-06 | UC8.2, UC9 (chỉ hủy khi `PENDING`) | Đơn giản hóa | 2 | ServiceSession, Kitchen | ServiceSessionService, KitchenService | OrderItem | Chưa làm |
| FR-07 | UC9 | Đã làm (đầy đủ) | 2 | Kitchen | KitchenService | OrderItem | Chưa làm |
| FR-08 | UC8.3 | Đã làm (đầy đủ) | 2 | ServiceSession | ServiceSessionService | OrderItem | Chưa làm |
| FR-09 | UC11.1 | Đã làm (đầy đủ) | 3 | Payment | PaymentService | Invoice, ServiceSession | Chưa làm |
| FR-10 | UC11.2 | Đã làm (đầy đủ) | 4 | Payment | ReconciliationService | Invoice, RevenueReconciliation | Chưa làm |
| FR-11 | UC2 | Đã làm (đầy đủ) | 3 | Inventory | InventoryService | Ingredient | Chưa làm |
| FR-12 | UC10.3 | Đã làm (đầy đủ) | 3 | Inventory | InventoryService | StockReceipt, StockReceiptItem, IngredientLot, StockMovement | Chưa làm |
| FR-13 | UC6.2 (không tồn theo lô) | Đơn giản hóa | 3 | Inventory | InventoryService | Ingredient, IngredientLot, StockMovement | Chưa làm |
| FR-14 | UC10.1 (kiểm kê theo NVL) | Đơn giản hóa | 3 | Inventory | InventoryService | Stocktake, StocktakeItem, StockMovement | Chưa làm |
| FR-15 | UC10.2 | Đã làm (đầy đủ) | 3 | Inventory | InventoryService | StockMovement | Chưa làm |
| FR-16 | UC6.3 + lịch sử hóa đơn/đặt bàn | Đơn giản hóa | 1, 3 | Inventory, Payment, Table | InventoryService, PaymentService, ReservationService | nhiều bảng | Chưa làm |
| FR-17 | UC6.1 (1 trang báo cáo) | Đơn giản hóa | 4 | Payment, Inventory | PaymentService, InventoryService | Invoice, OrderItem, StockMovement | Chưa làm |
| FR-18 | Định lượng + UC9 | Đã làm (đầy đủ) | 1, 2 | Menu, Kitchen | MenuService, KitchenService | RecipeItem, StockMovement | Đang làm (Phase 1) |

## 2. Use Case chưa hiện thực (hướng phát triển)

| UC | Nội dung | Lý do |
|---|---|---|
| UC1.2 | Quên mật khẩu (OTP) | Cắt giảm theo hạn nộp 27/10 |
| UC12.1 | Sửa thông tin cá nhân | Như trên |
| UC12.2 | Đổi mật khẩu | Như trên (ưu tiên số 1 nếu còn thời gian) |
| UC3 | Thêm/sửa/ngừng khu vực và bàn | Dữ liệu lấy từ seed |
| UC7 (phần sửa) | Sửa đặt bàn | Hủy rồi tạo lại |
| FR-13/14 (phần lô) | Tồn, tiêu hao, kiểm kê theo từng lô; FEFO | Chỉ ghi lô/HSD khi nhập |

## 3. Business Requirements

| BR | Nội dung | Đáp ứng bởi | Hiện trạng |
|---|---|---|---|
| BR-01 | Tập trung dữ liệu một nền tảng | 18 bảng trên một PostgreSQL | Đang làm (Phase 1) |
| BR-02 | Số hóa quy trình đặt/bố trí bàn → thanh toán | FR-03, FR-04, FR-05, FR-09 | Đang làm (Phase 1) |
| BR-03 | Chia sẻ trạng thái món phục vụ ↔ bếp | FR-07, FR-08, SSE | Chưa làm |
| BR-04 | Các lần gọi món cùng phiên | `FoodOrder` nhiều/`ServiceSession` | Chưa làm |
| BR-05 | Doanh thu, đối soát theo ca | FR-09, FR-10 | Chưa làm |
| BR-06 | Số hóa nhập, tồn, kiểm kê | FR-12, FR-13, FR-14 | Chưa làm |
| BR-07 | Quản lý lô và HSD | FR-13 (lô ghi khi nhập, cảnh báo HSD) | Chưa làm |
| BR-08 | Thông tin tổng hợp | FR-17 | Chưa làm |
| BR-09 | Truy xuất giao dịch | FR-16 | Chưa làm |
| BR-10 | Quyền theo vai trò | FR-01, `@PreAuthorize` | Đang làm (Phase 1) |
| BR-11 | Món → định lượng → tiêu hao → biến động tồn | FR-18, `StockMovement` | Chưa làm |
| BR-12 | Quản lý tập trung đặt bàn | FR-03 | Đã làm |

## 4. Technical / Non-functional Requirements

| ID | Cách đáp ứng | Hiện trạng |
|---|---|---|
| TR-01 | React SPA + REST API Spring Boot | Đã làm |
| TR-02, TR-03 | PostgreSQL (Neon), Flyway | Đã làm |
| TR-04 | PK `BIGINT` identity, trừ `RecipeItem` dùng PK kép | Đã làm |
| TR-05, TR-06 | Cột thời gian và `*_by_id` theo ERD | Đang làm (Phase 1) |
| TR-07, NFR-04 | JWT + `@PreAuthorize` | Đang làm (Phase 1) |
| TR-08, NFR-03 | `@Transactional` + khóa dòng + unique/CHECK (§16.3) | Đang làm (Phase 1) |
| TR-09 | Neon restore/branch + `pg_dump` (README) | Chưa làm |
| TR-10, NFR-07 | Ant Design, ưu tiên tablet cho Bếp/Phục vụ/Sơ đồ bàn | Đang làm (Phase 1) |
| TR-11, NFR-02 | SSE + TanStack Query invalidation | Chưa làm |
| NFR-01, NFR-09 | Projection, index, phân trang (§18) | Chưa làm |
| NFR-05 | BCrypt | Đã làm |
| NFR-06 | Lưu người/thời điểm trên giao dịch | Đang làm (Phase 1) |
| NFR-08 | Dữ liệu commit trong PostgreSQL | Đang làm (Phase 1) |
| NFR-10 | Trình duyệt phổ biến (Chrome/Edge) | Đang làm (Phase 1) |
| NFR-11 | Phân lớp controller → service → impl → repository | Đang làm (Phase 1) |
| NFR-12 | Nhãn trạng thái dùng chung `labels.ts` (§6) | Đang làm (Phase 1) |

## 5. Ghi chú cho báo cáo khóa luận

- Chương công nghệ/hiện thực cập nhật sang Spring Boot + React + Neon.
- Các UC "Chưa hiện thực" trình bày là phạm vi prototype / hướng phát triển.
- Đối chiếu tên ERD/Class Diagram ↔ code: Phụ lục A của spec.
- Cần xác nhận lại với hình ERD: bội số `StockReceiptItem` – `StockMovement` (spec §9, ghi chú `(*)`).

## 6. Phần đã hiện thực ở Phase 0

Ghi nhận tại thời điểm kết thúc Phase 0; tiến độ hiện tại đã bổ sung ở mục 7.

- FR-01: UC1.1 đăng nhập/đăng xuất và xác định tài khoản hiện tại đã làm. UC4
  (quản lý tài khoản) chờ Phase 1. Không đánh dấu toàn bộ FR-01 đã hoàn thành.
- BR-10 / TR-07 / NFR-04: có JWT, role authority, `@EnableMethodSecurity`,
  `@PreAuthorize`, route guard và menu. Namespace `/api/accounts/**` dành cho
  OWNER đã được bảo vệ; controller nghiệp vụ và ma trận quyền còn lại sẽ được
  bổ sung đúng phase tương ứng.
- TR-05/06/08 và NFR-03: đã có cột, constraint, index, repository khóa dòng và
  transaction cho seed/auth; các workflow nghiệp vụ chưa được hiện thực.
- Toàn bộ 18 entity/repository là nền tảng dữ liệu; sự hiện diện của chúng không
  có nghĩa các FR bán hàng/kho đã hoàn thành.
- NFR-11: mới kiểm chứng phân lớp cho auth, chờ các workflow nghiệp vụ.
- NFR-12: có `labels.ts`/`StatusTag`, chưa có màn nghiệp vụ dùng nhãn trạng thái;
  chỉ hoàn thành nền tảng, chưa nghiệm thu tính nhất quán toàn hệ thống.
- Báo cáo kiểm tra, danh sách file và khác biệt kỹ thuật:
  [Phase 0](phase_results/phase-0.md).

## 7. Phần đã hiện thực ở Phase 1

- FR-01: UC1.1 và UC4 trong phạm vi giữ lại đã xong. Tạo, khóa/mở và đổi role có kiểm quyền OWNER, chặn sửa chính mình; D10 vẫn giữ role JWT cũ tối đa 12h. UC1.2/UC12 vẫn cắt theo §1.
- FR-02: UC5 đã có tạo/sửa giá, ngừng/kinh doanh lại và tra cứu. Sơ đồ bàn đọc dữ liệu seed; không làm UC3 CRUD khu vực/bàn. Không coi CRUD NVL Phase 3 đã làm.
- FR-03/BR-12: UC7 tạo/tra cứu/hủy có kiểm sức chứa, trùng lịch, chạm biên, phân trang và lịch sử hủy. Không thêm API sửa đặt bàn.
- FR-04: chỉ UC8.1 mở phiên walk-in/gắn reservation đã xong; thanh toán/đóng phiên UC11.1 chờ Phase 3. Chưa có GET chi tiết phiên (Phase 2).
- FR-18: chỉ phần GET/PUT định lượng bằng diff đã xong. Tiêu hao/StockMovement vẫn chờ Phase 2; không đánh dấu toàn FR-18 hoàn tất.
- TR-05/06/08, NFR-03/06/08: audit người/thời điểm và transaction/khóa dòng đã dùng trong đặt bàn/mở phiên; race trên Neon đúng một thành công. Các workflow kho/thanh toán vẫn chưa được hiện thực.
- BR-10/TR-07/NFR-04: @PreAuthorize trên 19 endpoint Phase 1 đã kiểm ma trận 6 vai trò bằng test controller và API thật. Rule URL account đã gỡ; các endpoint phase sau chưa có.
- TR-10/NFR-07/NFR-10: Chrome headless đã kiểm 4 màn Phase 1 và sơ đồ bàn tablet/mobile. Chưa nghiệm thu Edge hoặc màn Bếp/Phục vụ tương lai.
- NFR-11/12: sáu service mới dùng phân lớp; các màn Phase 1 dùng StatusTag/MoneyText và nhãn chung. Chưa nghiệm thu toàn hệ thống.
- Bằng chứng, giới hạn và lệnh tái lập: [Phase 1](phase_results/phase-1.md).
