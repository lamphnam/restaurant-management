# AGENTS.md

This file provides guidance to Codex (claude.ai/code) when working with code in this repository.

## Current override — 24/10/2026 KLTN issues

The user authorized all eight implementation issues across the requested phases. See
`docs/phase_results/kltn-issues-implementation.md` for current contracts and verification.
This supersedes historical D5/D8 and the reservation-edit scope cut below.
- D5: Start reserves a JSONB ingredient snapshot on OrderItem under Session → Item → Menu → Ingredient-ID locks;
  Complete consumes once from that snapshot; UNAVAILABLE releases reservations. No new domain table/status.
  All stock writers share Ingredient locks; disposal uses available stock, stocktake rejects actual < held.
  Never reset/mask historical negative stock. Legacy COOKING NULL snapshots are guarded at first processing.
- D8: PENDING/COOKING/READY block payment; SERVED/UNAVAILABLE/CANCELLED allow it; READY remains billable.
- Two independent badges on each table replace the serving sidebar. Four floor-plan roles may read;
  only WAITER serves/acknowledges. Ack metadata is persistent/idempotent without changing UNAVAILABLE.
- MANAGER may PUT CONFIRMED/unlinked reservations; table source/target locks ascending before Reservation.
- V2–V4 supplement V1 with snapshot/ack/code columns; names, IDs, historical ledger/invoices remain intact.
- The user explicitly authorized Java21 deployment on24/10/2026 after validation:
  `scripts/deploy-oracle-wsl.ps1 -UseWslSsh`. Release `20261024-191117-a3343614` is live at
  `https://dnrestaurant.dpdns.org/` (API `/api/*`); Flyway V2–V4 applied successfully.
  Production postchecks were read-only; invoice totals, stock and session/table states were unchanged.
  No mutating production QA/data repair is authorized by that deployment. The old main-QA permission
  below is historical. Integration tests opt in only to loopback `kltn_issues_test`, with isolated schemas.
- HEAD_CHEF recipe editing verified by real API tests and browser mocks; do not broaden menu permissions.

## Project status (Phase 0–4 baseline, historical)

This is a graduation-thesis (KLTN, UEH) prototype for a ~30–50 table dine-in restaurant.
Both table service/sales and ingredient inventory must demo end to end. Deadline: **2026-10-27**.
Last documentation update: **2026-10-24**, Asia/Ho_Chi_Minh.

Backend: `backend/restaurant-management/`, Java 21, Spring Boot 4.1.1, Maven wrapper;
root package `vn.ueh.kltn.restaurant`. Frontend: `frontend/`, React, TypeScript, Vite, **Bun**.
Schema is Flyway V1 plus V2–V4 with exactly 18 domain tables; JPA validates it. Database: existing Neon `main`.

**Phase 0–4, the UI review and all nine PR #4 fixes are implemented.**
Current documentation index: `docs/README.md`; latest QA: `docs/phase_results/phase-4-pr-review.md`.
Latest inspected code baseline (23/10/2026): branch `feat/phase-4-implement`, commit `67e1af2`,
which includes the PR #4 fixes. `1b3699f` was the pre-review baseline; the fixes are already committed.
This records local git state, not PR merge/push status. Check actual git status/HEAD before work and preserve all changes.
Do not commit, push, reset, stash or discard them without the user's instruction.

- Phase 1: accounts, menu/locked recipe diff, ingredient lookup, floor plan, reservations/opening.
  All seven PR #1 fixes remain, including retained inactive recipe ingredients and filtered reservation picker.
- Phase 2: session detail, order batches/cancel, kitchen/consumption, serving, SSE.
  All five item PATCH workflows lock ServiceSession → OrderItem and require ACTIVE before no-op.
  Orders accept 1–50 lines and 1–99 portions per line. SSE dispatch/send is isolated AFTER_COMMIT,
  on a dedicated four-worker executor/queue 256, never CallerRuns. Polling fallback: 30 seconds.
  Reduced-motion CSS uses `transition: none`; never restore global positive durations that interpolate popup left/top.
- Phase 3: locked payment, duplicate payment 409, snapshot billing, historical READY/zero-amount billing (D8, superseded above),
  CLOSED sessions/table release; invoice history; ingredient CRUD (D12), atomic receipts/lots,
  stock ledger, stocktakes, disposals, attention lots and movement history.
- PR #3 review: stocktake actual inputs start blank, only counted lines are sent, clearing omits a line,
  explicit zero is retained. Stocktakes reject duplicate/inactive ingredients and lock all Ingredient IDs
  ascending before SUM, sharing locks with disposal. Opening seed uses configured nonnegative actuals,
  runs before demo receipts through InventoryService helpers with an internal Account, no fake seed JWT.
  IngredientService/Impl were removed; InventoryService owns the lookup/workflows. Invoice/movement pages
  fetch to-one graphs; receipt/stocktake pages fetch details for the page IDs. FLOOR_PLAN also invalidates awaiting-service.

Implemented routes: `/accounts`, `/menu`, `/floor-plan`, `/reservations`, `/sessions/:id`,
`/kitchen`, `/awaiting-service`, `/payment`, `/invoices`, `/inventory`, `/inventory/receipts`,
`/inventory/stocktake`, `/reconciliation` (CASHIER/MANAGER), `/reports` (OWNER).

- Phase 4: ReconciliationService preview/create/list/locked confirm; PaymentService summary.
  Invoice-only revenue by paidAt `[startTime,endTime)` (D9), zero invoices count too.
  POST recomputes; JWT actor/Clock time; snapshots immutable. Confirm again returns 409 (§12.18).
  List optional `confirmed`, page0/size20 (max100), fetches cashier/manager; no own-cashier restriction.
  Summary uses independent aggregates and snapshot price; excludes CANCELLED/UNAVAILABLE, keeps READY.
  Report inventory is current, using existing APIs. No new schema/status/report service.
- Vite proxy closes interrupted `/api/events` via `dev/sseProxy.ts` so the client retries.
  Keep SSE AFTER_COMMIT executor isolation, polling30s and reduced-motion transition:none.

User UI review (23/10/2026) is implemented: OWNER accounts search name/phone (accent-insensitive),
role/status filters over the full fetched list; reports have month/day selection, daily amounts/counts,
all tied positive peak days and server-calculated averages. Summary has 3 aggregate SQL statements in
one read-only REPEATABLE_READ transaction. Sparse daily results are grouped in configured timezone;
calendar zero rows are generated for the visible frontend page only. Keep pickers as calendar dates
to avoid timezone-object endOf/DST errors in browsers outside Vietnam.
HEAD_CHEF stocktake has an explicit per-row match-stock button, disabled for negative stock;
copying preserves the displayed actual while backend still recomputes system stock under D7.

PR #4 review: preview/create reject endTime after Clock with400 INVALID_INPUT; never clamp shifts.
Cashier defaults to today midnight/current minute and disables future dates/times. DTO alone validates
actual/reason; service checks server revenue overflow with a specific message. Report calendarDays
stops at Clock's configured-zone today (future-only intervals:0 days/average); current month ends today.
Top10 is limited in SQL via Pageable with an Invoice join. OrderItemStatus.NON_BILLABLE is shared by
subtotal and reports; daily SQL receives PaymentMethod enum names. Reconciliation lists poll30s.
Evidence and live/mock limits: `docs/phase_results/phase-4-pr-review.md`.

Latest verification: **224 backend tests; 36 frontend tests / 111 assertions; both builds/lint PASS**.
These are recorded PR #4 QA results; documentation synchronization did not rerun QA or write to Neon.
PR #4: 75 read-only query checks; 9 guarded API rejection groups with 0 records created; 13 real read-only
browser/API groups. Per Chrome/Edge: 3 picker/polling mock groups (real 30s timers), 30 UI-review groups,
36 Phase 4 regression groups. Counts/ledger unchanged; keep each evidence set separate.
Previous UI review: 30 mock checks each Chrome/Edge; 70 read-only Neon query checks; 11 real API/browser
check groups with unchanged counts/ledger, no domain writes. Evidence: `docs/phase_results/phase-4-review.md`.
Phase 4: 152 API checks in one resumed fixture chain; 39 read-only query checks before QA;
60 query/held-transaction checks afterward (not additive); 36 mock UI checks each Chrome/Edge;
32 live browser observations including repeated login/guard checks; real restart/reconnect;
5 local HTTP proxy assertions. Old mock regressions: 7 picker / 16 stocktake / 59 popup checks.
Evidence: `docs/phase_results/phase-4.md`; historical test counts are not new acceptance.

Neon main after Phase 4: QA account9 LOCKED, menu23 DISCONTINUED, ingredient19 INACTIVE stock0kg;
review ingredient18 still INACTIVE stock8kg. Sessions13/14/15 CLOSED through payment,
invoices6/7/8, reconciliations1/2/3 confirmed; no reset/history edits. Before/after in the report.
Readiness snapshot at the last QA (23/10/2026): 5 free tables/7 ACTIVE; no confirmed booking for 27/10. Inspect again before
QA/demo writes. Physical tablet, multi-user load and actual backup/restore remain unverified.
Do not restore main merely to test documentation.

Phase 4 handoff/instructions/prompt are the historical starting contract. Use the Phase 4 result
and TRACEABILITY for current status. No next phase or cut feature is authorized automatically.

- `CODEX_MASTER_SPEC_KLTN_SPRING_REACT.md`: **the source of truth**, written in Vietnamese. Section numbers below (§N) refer to this file.
- `CODEX_MASTER_SPEC_KLTN_ASPNET_FINAL.md`: the superseded ASP.NET version, for reference only. When the two disagree, the Spring/React spec wins.

## Working rules from the spec

- **Work phase by phase (§22, §27).**
  - Before coding a phase: state the requirements/use cases, files, entities, business rules and checklist items involved.
  - After coding: run both builds and report changed files plus any deviation from the thesis.
  - **Never start the next phase on your own.**
- **When documents conflict (§0.1), the higher one wins:**
  1. BR/TR/FR/NFR
  2. TO-BE process
  3. Use cases
  4. Activity/Sequence diagrams
  5. ERD
  6. Class diagram
  7. This spec
  8. Your own guesses
  - Exception: implementation scope follows §1 of this spec.
- **Do not change** business rules, roles, tables, columns, relationships, statuses or scope without the user's approval.
  - Exactly **18 domain tables** (§7); never add a 19th.
  - The features cut in §1.3 stay out unless the user asks: forgot-password/OTP, profile edit, change password, area/table CRUD, per-lot stock. Reservation editing was authorized 24/10/2026.
- Keep it simple. §4.5 bans:
  - microservices, multi-module Maven, Clean/Hexagonal architecture, CQRS;
  - generic repositories / `BaseService<T>`;
  - MapStruct, Redis, message queues, GraphQL;
  - Redux, Next.js.
- The user writes in Vietnamese. Reply in the language they use.

## Commands (from §23)

Backend (`backend/restaurant-management/`, Spring Boot 4, Java 21, Maven wrapper, Windows PowerShell):

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"   # http://localhost:8080, Swagger at /swagger-ui.html
.\mvnw.cmd clean verify                                          # build + unit tests (must pass after every phase)
.\mvnw.cmd test "-Dtest=ReservationServiceImplTest#rejectsOverlap"   # single test class/method
```

Frontend (`frontend/`, React + Vite + TypeScript, **Bun**, not npm):

```powershell
bun install
bun run dev      # http://localhost:5173, Vite proxies /api -> http://localhost:8080
bun run build    # includes type-check; must pass after every phase
```

The database is **Neon Postgres** (no local DB, no Docker).
- Credentials come from `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` and `JWT_SECRET`. Set them as env vars or in the gitignored `backend/restaurant-management/application-local.yaml`. The `local` profile imports this external file relative to the backend working directory; keep it outside `src/main/resources` so secrets are not bundled in the JAR.
- Use Neon's **direct** endpoint (host without `-pooler`), because Flyway's advisory locks fail through PgBouncer.

Tests are JUnit 5 + Mockito unit tests that need no DB (§21.1).
- Delete the default `contextLoads()` test, because it needs a live DB.
- Everything else is verified with the manual checklist in §21.2.

## Architecture (big picture)

**Layout:** a monolith in one repo with three parts: `backend/`, `frontend/` and `docs/TRACEABILITY.md`. The traceability doc maps each FR/UC to code and gives its status.

**Backend layering (§4.3):** `controller → service (interface) → service/impl (*ServiceImpl) → repository`.
- **Controllers:** validate the request DTO (Java `record`) and authorize with `@PreAuthorize`. No logic, no repository calls.
- **ServiceImpl:** owns workflows, `@Transactional` boundaries, row locks and real-time event publishing.
- **Entities:** carry the class-diagram state-transition methods (e.g. `OrderItem.markReady()`, `Reservation.confirmSeated()`, §8). An invalid transition throws `BusinessException`.
- **Mapping:** entities are never returned from the API. They are mapped to response DTOs by hand.
- **Java style after the Phase 1 review:** explicit imports and explicit types for repository
  results, collections returned by methods, Optional and time values; keep `var` only where
  the right-hand side is an obvious `new X(...)`. Avoid inline fully qualified class names,
  wildcard imports and multiple statements per line. Phase 1 was formatted with
  google-java-format 1.28.0, AOSP mode (four-space indentation); do not add a project
  dependency just to format code.

**Schema:** owned by **Flyway** (`db/migration/V1__init_schema.sql`). JPA runs with `ddl-auto: validate`, so schema changes go into migrations, never into entity annotations alone.

**Data invariants spread across the schema and the services:**
- **Stock:** there is no stock-balance table. Stock = `SUM(stock_movement.quantity_change)` per ingredient (§11).
  - Each movement type (`RECEIPT`, `CONSUMPTION`, `STOCKTAKE_ADJUSTMENT`, `DISPOSAL`) has a fixed sign and a required source FK, enforced by a DB `CHECK`.
  - Movements are never edited or deleted.
- **Revenue:** comes only from `invoice`.
  - A "shift" is just the `[start_time, end_time)` window of a `revenue_reconciliation` row.
  - `manager_id IS NULL` means the reconciliation is not yet confirmed.
- **Prices:** the price is snapshotted into `order_item.unit_price_at_order` when the item is ordered.
- **Billing:** totals are always recomputed on the server. Items that are `CANCELLED` or `UNAVAILABLE` are not billed.
- **Concurrency (§16.3):** a pessimistic row lock on the parent row, plus partial unique indexes as a safety net, for example:
  - one `ACTIVE` session per table;
  - one invoice per session;
  - one `CONSUMPTION` movement per (order item, ingredient), so a dish completed twice does not deduct stock twice.
- **Idempotency:** a PATCH that requests the status an object already has returns success and does nothing.
- **History:** no hard deletes of historical data. FKs are `RESTRICT`.

**Auth:** stateless JWT (HS256).
- Tokens are issued with `NimbusJwtEncoder` and validated by Spring OAuth2 Resource Server.
- The `role` claim becomes the `ROLE_<role>` authority.
- D10 (owner approved 22/10/2026): locking an account or changing its role does not revoke an existing JWT. It retains its role until expiry (12 hours for the demo); `/api/auth/me` returns the role from that JWT, with the current name from the DB. Logging in again obtains the new role.
- There are six roles: `OWNER`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN_STAFF`, `HEAD_CHEF`. The per-role API matrix is in §13.
- The acting user always comes from the JWT, never from the request body.

**Demo seed (§20, owner approved 22/10/2026):** work on the existing Neon `main`, without an automatic reset. The base `DataSeeder` is `@Order(0)`, gated by `app.seed` and an empty account table. Future phase runners have their own ordered, transactional, table-specific gates; existing accounts must not block menu/ingredient/reservation seed. Never overwrite historical data to refresh relative demo dates; inspect freshness before the demo and create new records through the implemented workflows.

**Phase 1 QA override (owner approved 22/10/2026):** run QA directly on Neon `main`; do not create a QA branch. The owner explicitly permits resetting and initializing demo data again if errors require it. Normal startup still preserves existing rows. Use `[QA]` prefixes for test data, never print secrets, and record QA/reset actions in the phase report. Sessions opened during QA remain active until a later phase implements payment/closing.

The approval comes from the owner's instruction: “cứ làm trên branch main của Neon không cần tạo thêm gì nữa hết. Nếu lỗi cứ reset và init lại data”. It does not instruct scripts to reset automatically. Mutating Phase 1 QA scripts require `PHASE1_QA_ALLOW_WRITES=main` for that run; inspect readiness with the read-only `node scripts/phase1-demo-readiness.mjs` first.

**Recipe review policy (requested 22/10/2026):** new recipe lines require an ACTIVE ingredient; an existing line may remain or change quantity after its ingredient becomes INACTIVE. Serialize full replacements by locking MenuItem before reading recipe rows. The reservation picker uses optional `tableId` and `unexpired=true` filters; ordinary lists keep historical data by default.

**Real-time (§14):** Server-Sent Events, with SSE only as an invalidation signal.
- A `ServiceImpl` publishes a `RealtimeEvent`.
- `@TransactionalEventListener(AFTER_COMMIT)` hands it to `SseHub`, which enqueues `{type, sessionId}` sends on its dedicated executor for `GET /api/events`; dispatch/send errors cannot fail the committed HTTP request.
- On the frontend, the `useRealtime` hook (via `@microsoft/fetch-event-source`, so the JWT header can be sent) maps each event type (`FLOOR_PLAN`, `RESERVATION`, `ORDER`) to TanStack Query keys to invalidate.
- The data itself is always re-fetched over REST.
- Fallback: `refetchInterval` of 30s on the live screens.

**Frontend:**
- Ant Design (with `vi_VN` locale), TanStack Query for server state, React Router guarded by role, Axios with a JWT interceptor.
- Each role has a landing route (§5).
- Business rules live in the backend only.

## Naming (§4.6, Appendix A)

- **All code identifiers are English.** This covers entities, tables, columns, enums, URLs, routes, query keys and config keys.
  - Tables are `snake_case` and singular; the PK is `id`; FKs are `<x>_id`.
  - REST paths are kebab-case plural nouns, with a trailing verb for status changes (e.g. `/api/reservations/{id}/cancel`).
- **UI text, user-facing error messages and seed data stay in Vietnamese with diacritics.**
  - Enum labels shown in the UI come from one shared map (`frontend/src/utils/labels.ts`).
- The thesis ERD and class diagram use Vietnamese names (`DonDatBan`, `maPhienPhucVu`, `tinhTongTien()`…). **Appendix A** of the spec maps every one of them to its code name. Use it when the user refers to thesis terms.
  - Notable mappings: `Ban` → `DiningTable`, `DonGoiMon` → `FoodOrder` (avoids the SQL keywords `table`/`order`), `PhienPhucVu` → `ServiceSession`, `BienDongKho` → `StockMovement`.
