import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Breadcrumbs } from '../components/shell/Breadcrumbs'
import { SidebarNavigation } from '../components/shell/SidebarNavigation'
import { TopNavigation } from '../components/shell/TopNavigation'
import { useAuth } from '../hooks/useAuth'
import { AttendanceAutoCheckIn } from '../pages/AttendancePage'

export const DashboardLayout = () => {
  const { user: currentUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-72 border-r border-slate-200 bg-white p-4 lg:block">
        <Link to="/dashboard" className="mb-5 block border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Operations</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Shift Handover</p>
        </Link>
        {currentUser ? <SidebarNavigation permissions={currentUser.permissions} /> : null}
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close mobile navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white p-4 transition-transform lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/dashboard" className="mb-5 block border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Operations</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Shift Handover</p>
        </Link>
        <SidebarNavigation
          permissions={currentUser?.permissions ?? []}
          mobile
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="min-w-0 flex-1">
        <AttendanceAutoCheckIn />
        <TopNavigation onOpenMobileNav={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
