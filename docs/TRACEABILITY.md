# TRACEABILITY — Requirement → Use Case → Code

Nguồn: `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` (§1, §2, §19).
Tên Việt (khóa luận) ↔ tên code: xem Phụ lục A của spec.

**Trạng thái:** `Chưa làm` → `Đã làm` / `Đơn giản hóa` (làm một phần theo phạm vi §1.2) / `Chưa hiện thực` (cắt, §1.3).
Cột *Phase* là phase dự kiến hiện thực (docs/phase_instructions). Cập nhật cột *Hiện trạng* khi xong từng phase.

## 1. Functional Requirements

| FR | Use Case | Phạm vi | Phase | Controller | Service | Entity | Hiện trạng |
|---|---|---|---|---|---|---|---|
| FR-01 | UC1.1, UC4 (UC1.2, UC12 chưa hiện thực) | Đơn giản hóa | 0, 1 | Auth, Account | AuthService, AccountService | Account | Đơn giản hóa |
| FR-02 | UC5, UC3 (UC3 chưa hiện thực — dữ liệu từ seed) | Đơn giản hóa | 1 | Menu, Table | MenuService, TableService | MenuItem, DiningArea, DiningTable | Chưa làm |
| FR-03 | UC7 (không sửa đặt bàn) | Đơn giản hóa | 1 | Table | ReservationService | Reservation, DiningTable | Chưa làm |
| FR-04 | UC8.1, UC11.1 | Đã làm (đầy đủ) | 1, 3 | ServiceSession, Payment | ServiceSessionService, PaymentService | DiningTable, ServiceSession | Chưa làm |
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
| FR-18 | Định lượng + UC9 | Đã làm (đầy đủ) | 1, 2 | Menu, Kitchen | MenuService, KitchenService | RecipeItem, StockMovement | Chưa làm |

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
| BR-01 | Tập trung dữ liệu một nền tảng | 18 bảng trên một PostgreSQL | Chưa làm |
| BR-02 | Số hóa quy trình đặt/bố trí bàn → thanh toán | FR-03, FR-04, FR-05, FR-09 | Chưa làm |
| BR-03 | Chia sẻ trạng thái món phục vụ ↔ bếp | FR-07, FR-08, SSE | Chưa làm |
| BR-04 | Các lần gọi món cùng phiên | `FoodOrder` nhiều/`ServiceSession` | Chưa làm |
| BR-05 | Doanh thu, đối soát theo ca | FR-09, FR-10 | Chưa làm |
| BR-06 | Số hóa nhập, tồn, kiểm kê | FR-12, FR-13, FR-14 | Chưa làm |
| BR-07 | Quản lý lô và HSD | FR-13 (lô ghi khi nhập, cảnh báo HSD) | Chưa làm |
| BR-08 | Thông tin tổng hợp | FR-17 | Chưa làm |
| BR-09 | Truy xuất giao dịch | FR-16 | Chưa làm |
| BR-10 | Quyền theo vai trò | FR-01, `@PreAuthorize` | Đơn giản hóa |
| BR-11 | Món → định lượng → tiêu hao → biến động tồn | FR-18, `StockMovement` | Chưa làm |
| BR-12 | Quản lý tập trung đặt bàn | FR-03 | Chưa làm |

## 4. Technical / Non-functional Requirements

| ID | Cách đáp ứng | Hiện trạng |
|---|---|---|
| TR-01 | React SPA + REST API Spring Boot | Đã làm |
| TR-02, TR-03 | PostgreSQL (Neon), Flyway | Đã làm |
| TR-04 | PK `BIGINT` identity, trừ `RecipeItem` dùng PK kép | Đã làm |
| TR-05, TR-06 | Cột thời gian và `*_by_id` theo ERD | Đơn giản hóa |
| TR-07, NFR-04 | JWT + `@PreAuthorize` | Đơn giản hóa |
| TR-08, NFR-03 | `@Transactional` + khóa dòng + unique/CHECK (§16.3) | Đơn giản hóa |
| TR-09 | Neon restore/branch + `pg_dump` (README) | Chưa làm |
| TR-10, NFR-07 | Ant Design, ưu tiên tablet cho Bếp/Phục vụ/Sơ đồ bàn | Chưa làm |
| TR-11, NFR-02 | SSE + TanStack Query invalidation | Chưa làm |
| NFR-01, NFR-09 | Projection, index, phân trang (§18) | Chưa làm |
| NFR-05 | BCrypt | Đã làm |
| NFR-06 | Lưu người/thời điểm trên giao dịch | Chưa làm |
| NFR-08 | Dữ liệu commit trong PostgreSQL | Chưa làm |
| NFR-10 | Trình duyệt phổ biến (Chrome/Edge) | Chưa làm |
| NFR-11 | Phân lớp controller → service → impl → repository | Đã làm |
| NFR-12 | Nhãn trạng thái dùng chung `labels.ts` (§6) | Đã làm |

## 5. Ghi chú cho báo cáo khóa luận

- Chương công nghệ/hiện thực cập nhật sang Spring Boot + React + Neon.
- Các UC "Chưa hiện thực" trình bày là phạm vi prototype / hướng phát triển.
- Đối chiếu tên ERD/Class Diagram ↔ code: Phụ lục A của spec.
- Cần xác nhận lại với hình ERD: bội số `StockReceiptItem` – `StockMovement` (spec §9, ghi chú `(*)`).

## 6. Phần đã hiện thực ở Phase 0

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
- Báo cáo kiểm tra, danh sách file và khác biệt kỹ thuật:
  [Phase 0](phase_results/phase-0.md).
