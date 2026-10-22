# Frontend — Quản lý quán ăn

React + TypeScript + Vite, sử dụng Bun. Các thư viện đã cài: Ant Design,
TanStack Query, React Router, Axios, dayjs, `@microsoft/fetch-event-source`.

```powershell
bun install
bun run dev
```

Mở http://localhost:5173. Vite proxy `/api` tới http://localhost:8080.
Ant Design và dayjs dùng locale tiếng Việt.

```powershell
bun run build
bun run lint
bun run preview
```

`build` gồm kiểm tra TypeScript. Commit `bun.lock` để dùng cùng phiên bản
dependencies. Không đưa thông tin kết nối database hoặc JWT secret vào frontend.

Đây là scaffold; màn hình nghiệp vụ, đăng nhập và phân quyền được triển khai
theo từng phase trong `../docs/phase_instructions/`.
