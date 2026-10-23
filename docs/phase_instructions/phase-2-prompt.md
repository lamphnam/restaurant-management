# Prompt triển khai Phase 2

> Nguồn yêu cầu lịch sử: Phase 2 đã triển khai và sửa review/popup. Snapshot trong prompt
> là mốc trước Phase 2. Phase 3/review cũng đã triển khai. Công việc tiếp theo xem
> [bàn giao Phase 4](../PHASE_4_HANDOFF.md) và [prompt Phase 4](phase-4-prompt.md);
> không chạy lại Phase 2/3 hoặc tự bắt đầu code Phase 4.

Chỉ giao prompt này khi chủ dự án yêu cầu bắt đầu Phase 2. Việc chuẩn bị file không khởi động phase.

```text
Triển khai Phase 2 của KLTN theo CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md và docs/phase_instructions/phase-2.md.
Chỉ làm Phase 2. Không commit/push và không bắt đầu Phase 3 cho tới khi tôi yêu cầu.

1. ĐỌC TRƯỚC
- CLAUDE.md, docs/PHASE_2_HANDOFF.md, docs/phase_results/phase-1-review.md, docs/TRACEABILITY.md và hướng dẫn Phase 2.
- Master §1, §4–§9, §10.2 (D4/D5/D10/D11), §11, §12.9–12.11, §13.1/13.5/13.6/13.10, §14–18, §20–21, Phụ lục A.
- Code Phase 1 và guard/test có sẵn. Kiểm git status, giữ các sửa review đang có; không reset/stash/ghi đè thay đổi của tôi.
- TRƯỚC KHI CODE: báo requirement/UC, entity/table, business rule, file dự kiến, checklist sẽ kiểm. Mâu thuẫn spec hoặc nhu cầu schema mới phải nêu và hỏi trước phần phụ thuộc.

2. GIỮ QUYẾT ĐỊNH ĐÃ CHỐT
- Không sửa V1, thêm bảng/cột/migration, role/trạng thái hoặc chức năng đã cắt. Controller → Service interface → ServiceImpl → Repository; DTO record, mapper thủ công, @PreAuthorize trên mọi handler.
- Giữ import/kiểu tường minh, đặc biệt kết quả repository/Optional; var chỉ khi new X hiển nhiên. Không wildcard/FQN inline hoặc nhiều lệnh một dòng.
- D10: JWT cũ giữ role claim tối đa 12h sau khóa/đổi role, /me role từ token. Không revoke hay nạp role DB mỗi request.
- Seed có gate riêng từng bảng, không làm mới ngày hoặc ghi đè dữ liệu cũ.
- Recipe PUT khóa MenuItem trước diff, dòng mới ACTIVE nhưng giữ/sửa được NVL inactive đã có. Complete đọc các dòng recipe hiện tại, không tự loại inactive; không thêm snapshot recipe.
- Giữ tableId/unexpired, query key prefix và walk-in không phụ thuộc query đặt bàn. Không đổi response POST sessions đang dùng sessionId.

3. BACKEND PHASE 2
- Mở rộng ServiceSessionController/ServiceSessionService: GET /api/sessions/{id}; POST /{id}/orders tạo FoodOrder mới mỗi đợt; PATCH /items/{orderItemId}/cancel và /serve; GET /items/awaiting-service.
- Thêm KitchenController/KitchenService: GET queue, PATCH items/{id}/start, /unavailable {reason}, /complete. API/role đúng bảng ở hướng dẫn Phase 2 và master §13.
- GET session cho WAITER/MANAGER/CASHIER; gọi/hủy WAITER/MANAGER; serve/awaiting-service chỉ WAITER; bếp KITCHEN_STAFF/HEAD_CHEF.
- Chỉ gọi món ON_SALE, quantity từ 1–99, items từ 1–50 dòng (chủ dự án chốt review 23/10/2026), note/reason tối đa 500; phiên phải ACTIVE; giá snapshot khi tạo OrderItem. Người/thời điểm từ CurrentUser/Clock. Tạm tính loại CANCELLED/UNAVAILABLE và dùng snapshot.
- Mọi chuyển trạng thái lấy sessionId bằng query scalar, khóa Session → OrderItem và kiểm ACTIVE trước cả no-op. Complete cùng transaction: READY/SERVED → no-op trong phiên ACTIVE; khác COOKING → 409; mỗi recipe line tạo CONSUMPTION âm = -(quantityPerServing × quantity), lotId null, orderItemId/người/thời điểm đúng, rồi markReady. Recipe rỗng vẫn hoàn thành, tồn âm cho phép. Lặp/song song không trừ kho hai lần; rollback không lưu một phần.
- UNAVAILABLE bắt buộc lý do và không tiêu hao; hủy chỉ PENDING; serve chỉ READY; PATCH cùng đích 200/no-op. Không phát event cho no-op.
- Thêm EventController GET /api/events, SseHub, RealtimeEvent, listener AFTER_COMMIT, heartbeat 20s, SseEmitter timeout 30 phút. Broadcast/heartbeat enqueue executor riêng, không gửi trên thread HTTP; bắt Exception cho từng send và dispatch, không CallerRuns khi queue đầy. SSE chỉ payload type/sessionId theo §14.
- Nối publish tại create/cancel reservation và open session hiện có; hủy reservation đã CANCELLED không phát thêm. Rollback không broadcast. Giữ handler client SSE ngắt chỉ debug, không ghi JSON vào stream.
- Query session/queue/awaiting-service tránh N+1; mapping trong transaction đọc, OSIV=false. Không lộ entity/passwordHash/SQL.

4. FRONTEND PHASE 2
- Thay placeholder /sessions/:id, /kitchen, /awaiting-service; lazy-load, Ant Design và mẫu api/types/pages hiện có. Session route vẫn WAITER/MANAGER theo §15; không tự mở route cho CASHIER chỉ vì API GET cho phép role này.
- Gọi món/gọi thêm từ menu ON_SALE; hủy có Popconfirm; nút serve chỉ WAITER. Bếp 2 cột, chữ lớn/tablet; hiện unavailable kèm lý do cho phục vụ.
- Giữ StatusTag/labels.ts, MoneyText, thời gian giờ Việt Nam, useApiFeedback/fieldErrors, loading/disable, cơ chế 401/403 và không retry 4xx.
- useRealtime gắn một lần trong AppLayout sau login: fetch-event-source với bearer header, openWhenHidden true, cleanup theo phiên đăng nhập; không token trong URL. Event → invalidate prefix đúng §14.2, giữ payment key cho Phase 3, chuẩn hóa sessionId. Reconnect refetch tất cả key liên quan; fallback refetchInterval 30_000/refetchOnWindowFocus cho floor-plan/kitchen/awaiting-service.
- Không làm thanh toán/đóng phiên/trả bàn, nhập/kiểm kê/loại bỏ, tồn kho đầy đủ hoặc báo cáo.

5. TEST VÀ QA
- Thêm unit test tổng tiền/snapshot, gọi thêm/món ngừng/phiên đóng, OrderItem guard/no-op, complete đúng movement/recipe rỗng/inactive/tồn âm/lặp, unavailable không tiêu hao; quyền 6 role, annotation coverage, event/no-op/rollback.
- Kiểm cổng 8080/5173 trước chạy; không dừng nhầm tiến trình. QA trực tiếp Neon main theo duyệt cũ, không yêu cầu tạo branch. Đọc readiness trước; snapshot gần nhất 9 ACTIVE sessions/3 bàn trống, chưa có đóng phiên. Có thể dùng lại phiên QA phù hợp sau xác minh; lấy id từ API, không hard-code.
- Script ghi có guard tương đương PHASE1_QA_ALLOW_WRITES=main, dữ liệu [QA], không tự reset. Quyền reset/init khi lỗi cần đã được cấp; nếu sử dụng phải ghi tác động vào report. Không sửa lịch sử/seed dates hoặc in secret/token.
- Checklist thật: 14, hoàn thiện 15–16 phần giá snapshot/món ngừng, 17–22 và 35; phần Phase 2 của 36. Thử complete 2 request song song → chỉ một bộ movement. Hai browser context WAITER + KITCHEN_STAFF thấy cập nhật 1–2 giây không F5; reconnect/logout/polling/tablet. Phân biệt rõ test mock và app/Neon thật.

6. BÁO CÁO KHI XONG
- Backend cwd backend/restaurant-management: .\mvnw.cmd clean verify, nêu số test. Frontend cwd frontend: bun run test, bun run build, bun run lint sạch. Giữ test baseline Phase 0–1 và guard QA.
- Tạo docs/phase_results/phase-2.md: checklist từng mục, bằng chứng/lệnh tái lập, file đổi, tác động DB/reset nếu có, khác biệt spec và phần chưa xác minh.
- Cập nhật TRACEABILITY đúng phần đã làm, CLAUDE Project status và README. FR-04 còn chờ đóng phiên Phase 3; StockMovement Phase 2 không đồng nghĩa kho đầy đủ đã hoàn thành.
- Không commit/push; không tự sang Phase 3.
```
