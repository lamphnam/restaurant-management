import { Button, Result } from 'antd'
import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { landingRoutes, navigation } from './auth/roles'
import { AppLayout } from './layouts/AppLayout'

const LoginPage = lazy(() => import('./pages/login/LoginPage'))
const WorkspacePage = lazy(() => import('./pages/workspace/WorkspacePage'))
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage'))
const MenuPage = lazy(() => import('./pages/menu/MenuPage'))
const FloorPlanPage = lazy(() => import('./pages/floor-plan/FloorPlanPage'))
const ReservationsPage = lazy(() => import('./pages/reservations/ReservationsPage'))
const SessionPage = lazy(() => import('./pages/sessions/SessionPage'))
const KitchenPage = lazy(() => import('./pages/kitchen/KitchenPage'))
const AwaitingServicePage = lazy(() => import('./pages/awaiting-service/AwaitingServicePage'))

const businessPages: Record<string, React.ReactNode> = {
  '/accounts': <AccountsPage />, '/menu': <MenuPage />, '/floor-plan': <FloorPlanPage />, '/reservations': <ReservationsPage />,
  '/kitchen': <KitchenPage />, '/awaiting-service': <AwaitingServicePage />,
}

function LandingRedirect() {
  const { account } = useAuth()
  return <Navigate to={account ? landingRoutes[account.role] : '/login'} replace />
}

export function AppRouter() {
  return <Suspense fallback={<div className="page-loading" role="status">Đang tải…</div>}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route index element={<LandingRedirect />} />
        {navigation.map((entry) => <Route key={entry.path} element={<RequireRole roles={entry.roles} />}>
          <Route path={entry.path} element={businessPages[entry.path] ?? <WorkspacePage title={entry.label} description={entry.description} />} />
        </Route>)}
        <Route element={<RequireRole roles={['WAITER', 'MANAGER']} />}>
          <Route path="/sessions/:id" element={<SessionPage />} />
        </Route>
        <Route path="*" element={<Result status="404" title="Không tìm thấy trang"
          extra={<Link to="/"><Button type="primary">Về trang chính</Button></Link>} />} />
      </Route>
    </Route>
  </Routes></Suspense>
}
