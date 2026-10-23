# TRACEABILITY — Requirement → Use Case → Code

Nguồn: `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md` (§1, §2, §19).
Tên Việt (khóa luận) ↔ tên code: xem Phụ lục A của spec.

**Phạm vi theo §19 (khi hoàn tất):** `Đã làm` / `Đơn giản hóa` (phần cắt theo §1.2) / `Chưa hiện thực` (cắt, §1.3). Cột Phạm vi mô tả mục tiêu bàn giao, không phải tiến độ hiện tại. Cột Hiện trạng theo dõi riêng bằng `Chưa làm`, `Đang làm (Phase N)` hoặc `Đã làm`; khi chốt báo cáo Phase 4 phải đối chiếu kết quả thực tế với ba giá trị §19. `Đang làm` nghĩa đã hiện thực một phần, không có nghĩa agent đang triển khai phase đó.
Cột *Phase* là phase dự kiến hiện thực (docs/phase_instructions). Cập nhật cột *Hiện trạng* khi xong từng phase.

Mốc 23/10/2026: Phase 3 đã triển khai, kiểm thử và nghiệm thu hoàn tất.
Hệ thống đã có đầy đủ chuỗi thanh toán, hóa đơn, giải phóng bàn, quản lý danh mục NVL,
nhập kho, kiểm kê D7, xuất hủy, lô chú ý, lịch sử biến động và D8/D12 rules.
Xem [Báo cáo Phase 3](phase_results/phase-3.md). Chỉ còn FR-10 (đối soát ca) và FR-17 (báo cáo) cho Phase 4.

## 1. Functional Requirements

| FR | Use Case | Phạm vi | Phase | Controller | Service | Entity | Hiện trạng |
|---|---|---|---|---|---|---|---|
| FR-01 | UC1.1, UC4 (UC1.2, UC12 chưa hiện thực) | Đơn giản hóa | 0, 1 | Auth, Account | AuthService, AccountService | Account | Đã làm |
| FR-02 | UC5, UC3 (UC3 chưa hiện thực — dữ liệu từ seed) | Đơn giản hóa | 1 | Menu, Table | MenuService, TableService | MenuItem, DiningArea, DiningTable | Đã làm |
| FR-03 | UC7 (không sửa đặt bàn) | Đơn giản hóa | 1 | Table | ReservationService | Reservation, DiningTable | Đã làm |
| FR-04 | UC8.1, UC11.1 | Đã làm (đầy đủ) | 1, 3 | ServiceSession, Payment | ServiceSessionService, PaymentService | DiningTable, ServiceSession | Đã làm |
| FR-05 | UC8.2 | Đã làm (đầy đủ) | 2 | ServiceSession | ServiceSessionService | FoodOrder, OrderItem | Đã làm |
| FR-06 | UC8.2, UC9 (chỉ hủy khi `PENDING`) | Đơn giản hóa | 2 | ServiceSession, Kitchen | ServiceSessionService, KitchenService | OrderItem | Đã làm |
| FR-07 | UC9 | Đã làm (đầy đủ) | 2 | Kitchen | KitchenService | OrderItem | Đã làm |
| FR-08 | UC8.3 | Đã làm (đầy đủ) | 2 | ServiceSession | ServiceSessionService | OrderItem | Đã làm |
| FR-09 | UC11.1 | Đã làm (đầy đủ) | 3 | Payment | PaymentService | Invoice, ServiceSession | Đã làm |
| FR-10 | UC11.2 | Đã làm (đầy đủ) | 4 | Payment | ReconciliationService | Invoice, RevenueReconciliation | Chưa làm |
| FR-11 | UC2 | Đã làm (đầy đủ) | 3 | Inventory | InventoryService | Ingredient | Đã làm |
| FR-12 | UC10.3 | Đã làm (đầy đủ) | 3 | Inventory | InventoryService | StockReceipt, StockReceiptItem, IngredientLot, StockMovement | Đã làm |
| FR-13 | UC6.2 (không tồn theo lô) | Đơn giản hóa | 3 | Inventory | InventoryService | Ingredient, IngredientLot, StockMovement | Đã làm |
| FR-14 | UC10.1 (kiểm kê theo NVL) | Đơn giản hóa | 3 | Inventory | InventoryService | Stocktake, StocktakeItem, StockMovement | Đã làm |
| FR-15 | UC10.2 | Đã làm (đầy đủ) | 3 | Inventory | InventoryService | StockMovement | Đã làm |
| FR-16 | UC6.3 + lịch sử hóa đơn/đặt bàn | Đơn giản hóa | 1, 3 | Inventory, Payment, Table | InventoryService, PaymentService, ReservationService | nhiều bảng | Đã làm |
| FR-17 | UC6.1 (1 trang báo cáo) | Đơn giản hóa | 4 | Payment, Inventory | PaymentService, InventoryService | Invoice, OrderItem, StockMovement | Chưa làm |
| FR-18 | Định lượng + UC9 | Đã làm (đầy đủ) | 1, 2 | Menu, Kitchen | MenuService, KitchenService | RecipeItem, StockMovement | Đã làm |

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
| BR-01 | Tập trung dữ liệu một nền tảng | 18 bảng trên một PostgreSQL | Đã làm |
| BR-02 | Số hóa quy trình đặt/bố trí bàn → thanh toán | FR-03, FR-04, FR-05, FR-09 | Đã làm |
| BR-03 | Chia sẻ trạng thái món phục vụ ↔ bếp | FR-07, FR-08, SSE | Đã làm |
| BR-04 | Các lần gọi món cùng phiên | `FoodOrder` nhiều/`ServiceSession` | Đã làm |
| BR-05 | Doanh thu, đối soát theo ca | FR-09, FR-10 | Đang làm (Phase 3) |
| BR-06 | Số hóa nhập, tồn, kiểm kê | FR-12, FR-13, FR-14 | Đã làm |
| BR-07 | Quản lý lô và HSD | FR-13 (lô ghi khi nhập, cảnh báo HSD) | Đã làm |
| BR-08 | Thông tin tổng hợp | FR-17 | Chưa làm |
| BR-09 | Truy xuất giao dịch | FR-16 | Đã làm |
| BR-10 | Quyền theo vai trò | FR-01, `@PreAuthorize` | Đang làm (Phase 3) |
| BR-11 | Món → định lượng → tiêu hao → biến động tồn | FR-18, `StockMovement` | Đã làm |
| BR-12 | Quản lý tập trung đặt bàn | FR-03 | Đã làm |

## 4. Technical / Non-functional Requirements

| ID | Cách đáp ứng | Hiện trạng |
|---|---|---|
| TR-01 | React SPA + REST API Spring Boot | Đã làm |
| TR-02, TR-03 | PostgreSQL (Neon), Flyway | Đã làm |
| TR-04 | PK `BIGINT` identity, trừ `RecipeItem` dùng PK kép | Đã làm |
| TR-05, TR-06 | Cột thời gian và `*_by_id` theo ERD | Đã làm |
| TR-07, NFR-04 | JWT + `@PreAuthorize` | Đang làm (Phase 3) |
| TR-08, NFR-03 | `@Transactional` + khóa dòng + unique/CHECK (§16.3) | Đã làm |
| TR-09 | Neon restore/branch + `pg_dump` (README) | Chưa làm |
| TR-10, NFR-07 | Ant Design, ưu tiên tablet cho Bếp/Phục vụ/Sơ đồ bàn | Đã làm |
| TR-11, NFR-02 | SSE sau commit + invalidation/reconnect/polling | Đã làm |
| NFR-01, NFR-09 | Projection, index, phân trang (§18) | Đang làm (Phase 3) |
| NFR-05 | BCrypt | Đã làm |
| NFR-06 | Lưu người/thời điểm trên giao dịch | Đã làm |
| NFR-08 | Dữ liệu commit trong PostgreSQL | Đã làm |
| NFR-10 | Trình duyệt phổ biến (Chrome/Edge) | Đã làm |
| NFR-11 | Phân lớp controller → service → impl → repository | Đã làm |
| NFR-12 | Nhãn trạng thái dùng chung `labels.ts` (§6) | Đã làm |

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
- FR-16/BR-09: chỉ tra cứu/lịch sử đặt bàn, giữ cả đơn CANCELLED; lịch sử hóa đơn và biến động kho chưa làm. BR-11 mới có món/định lượng, chưa có tiêu hao.
- Review Phase 1 (22/10/2026): PUT định lượng khóa MenuItem và cho giữ dòng NVL đã ngừng; bộ chọn đặt bàn lọc theo bàn/chưa hết giờ, walk-in độc lập query đặt bàn. Test và giới hạn kiểm chứng xem [phase-1-review.md](phase_results/phase-1-review.md). Không mở rộng hiện trạng sang nghiệp vụ Phase 2.
- TR-05/06/08, NFR-03/06/08: audit người/thời điểm và transaction/khóa dòng đã dùng trong đặt bàn/mở phiên; race trên Neon đúng một thành công. Các workflow kho/thanh toán vẫn chưa được hiện thực.
- BR-10/TR-07/NFR-04: @PreAuthorize trên 19 endpoint Phase 1 đã kiểm ma trận 6 vai trò bằng test controller và API thật. Rule URL account đã gỡ; các endpoint phase sau chưa có.
- TR-10/NFR-07/NFR-10: Chrome headless đã kiểm 4 màn Phase 1 và sơ đồ bàn tablet/mobile. Chưa nghiệm thu Edge hoặc màn Bếp/Phục vụ tương lai.
- NFR-11/12: sáu service mới dùng phân lớp; các màn Phase 1 dùng StatusTag/MoneyText và nhãn chung. Chưa nghiệm thu toàn hệ thống.
- NFR-01/09: có index, phân trang đặt bàn và đo floor-plan 3 SQL; chưa nghiệm thu hiệu năng queue/session/kho/báo cáo hoặc benchmark toàn hệ thống.
- Bằng chứng, giới hạn và lệnh tái lập: [Phase 1](phase_results/phase-1.md).

## 8. Mốc bàn giao sang Phase 2

Mốc lịch sử trước triển khai: Phase 1 đã sửa 7 mục review. Phase 2 nay đã triển khai;
xem mục 9 và [báo cáo Phase 2](phase_results/phase-2.md). Bản bàn giao trước đó:
[PHASE_2_HANDOFF](PHASE_2_HANDOFF.md). Kết quả kiểm sau sửa review xem
[phase-1-review.md](phase_results/phase-1-review.md); không coi đây là nghiệm thu Phase 2.

| Phần Phase 2 dự kiến | Chỉ cập nhật khi có code và bằng chứng |
|---|---|
| FR-05/UC8.2, BR-04 | Gọi món/gọi thêm, FoodOrder theo phiên, giá snapshot và tạm tính |
| FR-06/UC8.2/UC9 | Hủy PENDING; trạng thái/không thể chế biến đúng quyền và guard |
| FR-07/UC9, FR-08/UC8.3, BR-03 | Bếp, món chờ phục vụ, xác nhận phục vụ |
| FR-18/BR-11 | Complete sinh CONSUMPTION đúng một lần, không sửa lịch sử |
| TR-11/NFR-02 | SSE sau commit, invalidation/fallback, kiểm 2 browser thật |

FR-04 vẫn chờ UC11.1/đóng phiên Phase 3. FR-11–17 phần kho/thanh toán/báo cáo vẫn theo phase
dự kiến; không suy ra đã xong từ các entity hoặc ledger được dùng trong Phase 2.

## 9. Phần đã hiện thực ở Phase 2 (23/10/2026)

Ba mục review Critical được sửa tiếp tại [phase-2-review.md](phase_results/phase-2-review.md):
giới hạn 99 phần/dòng và 50 dòng/đợt do chủ dự án chốt; mọi PATCH món khóa Session → OrderItem,
kiểm phiên ACTIVE trước cả no-op; SSE send chạy executor riêng sau commit, lỗi dispatch/send
không làm HTTP request đã commit thất bại. Không triển khai Phase 3 hoặc đổi schema.

- FR-05/BR-04/UC8.2: `ServiceSessionServiceImpl.detail/order` và query fetch phục vụ chi tiết phiên;
  mỗi lần gửi tạo FoodOrder mới, kiểm ACTIVE/ON_SALE, snapshot giá và tính tạm tính trên server.
- FR-06: `cancel` chỉ PENDING; KitchenService báo UNAVAILABLE có lý do và không tiêu hao.
  Không mở lại chức năng sửa số lượng/ghi chú đã gửi bếp.
- FR-07/UC9: `KitchenServiceImpl.queue/start/unavailable/complete`, query theo phiên ACTIVE.
  Mọi chuyển trạng thái khóa OrderItem; invalid transition trả 409, cùng đích là no-op.
- FR-08/UC8.3: `awaitingService/serve`; READY và UNAVAILABLE tách riêng trên giao diện;
  chỉ WAITER được serve/awaiting-service. MANAGER chỉ gọi/hủy; GET session cho CASHIER
  phục vụ Phase 3, route `/sessions/:id` vẫn chỉ WAITER/MANAGER.
- FR-18/BR-11: complete đọc recipe hiện tại gồm NVL inactive được giữ, ghi CONSUMPTION âm,
  nguồn/người/thời gian và lot null trong một transaction. Song song/lặp không ghi hai lần;
  ca DB lỗi thật rollback cả trạng thái lẫn movement, không phát event. Tồn âm cho phép.
- TR-11/NFR-02: EventController, SseHub/heartbeat, RealtimeEventListener AFTER_COMMIT;
  nối event đặt bàn/mở phiên Phase 1; `useRealtime` dùng bearer header, invalidate prefix,
  refetch khi reconnect và polling 30 giây. Payment key được giữ, UI thanh toán vẫn chưa làm.
- TR-08/NFR-03/06/08: unit test không cần DB; kiểm API/ledger và browser dùng Neon thật.
  Không đổi V1/schema, seed gate, D10, recipe PUT lock/diff hoặc picker walk-in sau review.
- NFR-01/09: probe thực tế đo detail 2 SQL, queue/awaiting-service mỗi endpoint 1 SQL;
  chưa benchmark tải nhiều user hoặc toàn hệ thống.
- NFR-10/11/12: các màn Phase 2 dùng Ant Design, nhãn StatusTag, MoneyText, giờ Việt Nam;
  kiểm Chrome headless/tablet viewport. Chưa nghiệm thu Edge hoặc thiết bị tablet thật.
  Đã sửa CSS reduced motion làm sai vị trí popup; 59 kiểm tra popup dùng API mock và
  9 kiểm tra app/API thật chỉ đọc pass, xem [báo cáo popup](phase_results/phase-2-popup-fix.md).
- Bằng chứng từng checklist, số test, tác động Neon và giới hạn:
  [phase-2.md](phase_results/phase-2.md). FR-04 và phần kho/thanh toán/báo cáo vẫn chờ Phase 3–4.

## 10. Phần đã hiện thực ở Phase 3 (23/10/2026)

Phase 3 đã triển khai đầy đủ và nghiệm thu 100% mục tiêu:
- **FR-04, FR-09 / UC11.1 (Thanh toán & Hóa đơn):** `PaymentServiceImpl.listOpenSessions/previewSession/pay/listInvoices`.
  Màn hình thanh toán trực tiếp, Drawer xem trước hóa đơn tính lại tổng trên server, loại bỏ món CANCELLED/UNAVAILABLE,
  phát hiện món PENDING/COOKING chặn thanh toán. Thanh toán khóa bi quan ServiceSession, kiểm tra ACTIVE, kiểm tra chưa có hóa đơn,
  tính lại tổng từ chi tiết món, tạo Invoice, đóng phiên phục vụ, giải phóng bàn ăn (DiningTable -> AVAILABLE), phát tín hiệu SSE `FLOOR_PLAN`.
  Quy tắc D8: thanh toán thành công phiên 0đ và món READY được tính tiền. Chặn thanh toán trùng trả về 409 `SESSION_ALREADY_PAID`.
- **FR-11 / UC2 (Danh mục NVL):** OWNER thêm mới, cập nhật tên/ngưỡng tồn tối thiểu, bật/tắt trạng thái.
  Quy tắc D12: chặn thay đổi đơn vị tính của NVL đã có biến động kho (trả 409 `UNIT_CHANGE_BLOCKED`).
- **FR-12 / UC10.3 (Nhập kho & Lô):** HEAD_CHEF tạo phiếu nhập nhiều dòng, tự động tạo lô `IngredientLot` và biến động kho `RECEIPT`
  trong một transaction `@Transactional`. Ràng buộc bắt buộc nhập HSD với NVL có `trackExpiry = true`.
- **FR-13 / UC6.2 (Tồn kho, Cảnh báo & Lô chú ý):** Tồn kho tính từ `SUM(stock_movement.quantity_change)` (không có bảng balance).
  Cảnh báo tồn thấp khi `currentStock <= minStock`, hiển thị thẻ đỏ khi tồn âm (D5). Endpoint lô chú ý lọc lô hết hạn hoặc sắp hết hạn trong 3 ngày theo múi giờ Việt Nam.
- **FR-14 / UC10.1 (Kiểm kê kho):** Mẫu kiểm kê tự động điền tồn hệ thống. Quy tắc D7: tính lại tổng biến động sổ sách tại thời điểm POST
  để tính chênh lệch `difference = actualQuantity - systemQuantity`. Sinh biến động `STOCKTAKE_ADJUSTMENT` khi chênh lệch khác 0.
- **FR-15 / UC10.2 (Xuất hủy NVL):** Khóa dòng `Ingredient`, kiểm tra số lượng hủy không vượt quá tồn kho (nếu vượt trả 400 `INSUFFICIENT_STOCK`),
  ghi nhận biến động `DISPOSAL` với `quantityChange = -quantity`.
- **FR-16 / UC6.3 (Lịch sử biến động & Hóa đơn):** Tra cứu biến động kho đủ 4 loại (`RECEIPT`, `CONSUMPTION`, `STOCKTAKE_ADJUSTMENT`, `DISPOSAL`)
  kèm nguồn (phiên, đợt gọi món, phiếu nhập, phiếu kiểm kê). Tra cứu lịch sử hóa đơn phân trang, lọc theo phương thức thanh toán và khoảng ngày.
- **Frontend:** Thay thế hoàn toàn 5 placeholder cũ bằng các màn hình hoàn chỉnh: `/payment`, `/invoices`, `/inventory`, `/inventory/receipts`, `/inventory/stocktake`.
- **Bằng chứng & Kiểm thử:**
  - Backend: `mvnw clean verify` đạt **176 tests PASS** (0 failures, 0 errors, 0 skipped, +26 unit tests Phase 3).
  - Frontend: `bun test tests` đạt **25 tests PASS** (76 assertions); `bun run lint` (oxlint) sạch lỗi; `bun run build` thành công trong <1s.
  - End-to-end API QA (`scripts/phase3-api-check.mjs`): **111/111 checks PASS** trên Neon main thật.
  - Checklist §21.2: Các mục 23–32 đã nghiệm thu đầy đủ. Chi tiết xem [Báo cáo Phase 3](phase_results/phase-3.md).

## 11. Chuẩn bị Phase 4 — chưa triển khai

Nội dung còn lại của hệ thống:
- **FR-10 / UC11.2:** Đối soát doanh thu cuối ca (`/api/reconciliations/**`).
- **FR-17 / UC6.1:** Màn hình Báo cáo tổng hợp quản trị (`/api/payments/summary`).
- Chạy lại toàn bộ bộ kiểm thử checklist tổng thể từ 1–36.
- Cập nhật tài liệu cuối khóa luận (`README.md`, `TRACEABILITY.md`).
- **Không tự ý bắt đầu Phase 4 khi chưa có yêu cầu từ người dùng.**
