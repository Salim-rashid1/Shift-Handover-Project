import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { DashboardPage } from '../pages/DashboardPage'
import { HandoverCreatePage } from '../pages/HandoverCreatePage'
import { HandoverDetailPage } from '../pages/HandoverDetailPage'
import { HandoversPage } from '../pages/HandoversPage'
import { IncidentDetailPage } from '../pages/IncidentDetailPage'
import { IncidentsPage } from '../pages/IncidentsPage'
import { LoginPage } from '../pages/LoginPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { TaskDetailPage } from '../pages/TaskDetailPage'
import { TasksPage } from '../pages/TasksPage'
import { ShiftsPage } from '../pages/ShiftsPage'
import { ShiftDetailPage } from '../pages/ShiftDetailPage'
import { UsersPage } from '../pages/UsersPage'
import { AuditLogPage } from '../pages/AuditLogPage'
import { LandingPage } from '../pages/LandingPage'
import { RegisterPage } from '../pages/RegisterPage'
import { AttendancePage } from '../pages/AttendancePage'
import { LoadingState, ErrorState } from '../components/ui/State'
import { ApiError } from '../services/api'

const ProtectedShell = () => {
  const { isAuthenticated, isLoading, error, retryAuth, isSessionExpired } = useAuth()
  const location = useLocation()

  if (isSessionExpired) {
    return <Navigate to="/login" state={{ from: location, reason: 'session-expired' }} replace />
  }

  if (isLoading) return <LoadingState message="Restoring your session…" />

  if (error && (!(error instanceof ApiError) || error.status !== 401)) {
    return <ErrorState message={error.message} onRetry={() => { void retryAuth() }} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <DashboardLayout />
}

const PermissionOnly = ({ permission }: { permission: string }) => {
  const { user } = useAuth()
  if (user?.permissions.includes(permission)) return <Outlet />
  return <Navigate to="/dashboard" replace />
}

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedShell />}>
        <Route element={<PermissionOnly permission="attendance.view" />}>
          <Route path="/attendance" element={<AttendancePage />} />
        </Route>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-shift" element={<Navigate to="/shifts" replace />} />
        <Route
          path="/handovers"
          element={<HandoversPage />}
        />
        <Route path="/handovers/create" element={<HandoverCreatePage />} />
        <Route
          path="/handovers/:id"
          element={<HandoverDetailPage />}
        />
        <Route
          path="/tasks"
          element={<TasksPage />}
        />
        <Route
          path="/tasks/:id"
          element={<TaskDetailPage />}
        />
        <Route
          path="/incidents"
          element={<IncidentsPage />}
        />
        <Route
          path="/incidents/:id"
          element={<IncidentDetailPage />}
        />
        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/shifts/:id" element={<ShiftDetailPage />} />
        <Route element={<PermissionOnly permission="users.view" />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
        <Route element={<PermissionOnly permission="audit.view" />}>
          <Route path="/audit-log" element={<AuditLogPage />} />
        </Route>
        <Route element={<PermissionOnly permission="reports.view" />}>
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
        <Route element={<PermissionOnly permission="settings.view" />}>
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
