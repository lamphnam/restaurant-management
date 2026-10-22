# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a graduation-thesis (KLTN, UEH) prototype: an internal web app for a ~30–50 table dine-in restaurant. It covers two business chains, **table service and sales** and **ingredient inventory**, and both must demo end to end. Hard deadline: **2026-10-27**.

The Git repository has been initialized. Backend scaffold is in
`backend/restaurant-management/` (Java 21, Boot 4.1.1); frontend scaffold is in
`frontend/` (React, TypeScript, Vite, Bun). Neon direct connectivity and both
builds have been verified. Phase 0 now includes the V1 migration (18 domain
tables), entities/repositories, JWT login and `/me`, frontend authentication,
role guards and navigation, shared status labels, and account/area/table seed.
Phase 0 is complete: both builds, 9 unit tests, live DB/API checks, and checklist
1–4 through Chrome headless passed. Phase 1 has not been started.
Business screens are role-gated placeholders for Phase 1–4. Verification details
are recorded in `docs/phase_results/phase-0.md`.
The Java root package is `vn.ueh.kltn.restaurant`.

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
  - The features cut in §1.3 stay out unless the user asks: forgot-password/OTP, profile edit, change password, area/table CRUD, editing reservations, per-lot stock.
- Keep it simple. §4.5 bans:
  - microservices, multi-module Maven, Clean/Hexagonal architecture, CQRS;
  - generic repositories / `BaseService<T>`;
  - MapStruct, Redis, message queues, GraphQL;
  - Redux, Next.js.
- The user writes in Vietnamese. Reply in the language they use.

## Commands (from §23, once scaffolded)

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

**Real-time (§14):** Server-Sent Events, with SSE only as an invalidation signal.
- A `ServiceImpl` publishes a `RealtimeEvent`.
- `@TransactionalEventListener(AFTER_COMMIT)` hands it to `SseHub`, which broadcasts `{type, sessionId}` to `GET /api/events`.
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
