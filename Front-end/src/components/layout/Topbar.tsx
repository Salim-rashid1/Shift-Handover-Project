import { useState } from 'react'
import { Bell, Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../../hooks/queries'
import { getInitials } from '../../lib/utils'
import { NotificationItem } from '../notifications/NotificationItem'
import { Button } from '../ui/Button'

export const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const { data: notifications = [] } = useNotificationsQuery()
  const markAsReadMutation = useMarkNotificationReadMutation()
  const unreadCount = notifications.filter((item) => !item.isRead).length

  const crumbs = location.pathname.split('/').filter(Boolean)

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link to="/dashboard">Home</Link>
              {crumbs.map((crumb) => (
                <span key={crumb}>/ {crumb}</span>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-900">Shift Handover Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">{user?.role?.replaceAll('_', ' ')}</span>
          <div className="relative">
            <button
              type="button"
              className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              onClick={() => setDropdownOpen((value) => !value)}
            >
              <span className="inline-flex items-center gap-2">
                <Bell className="size-4" />
                Notifications
              </span>
              {unreadCount ? (
                <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            {dropdownOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <Link
                    to="/notifications"
                    className="text-xs text-slate-500 underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-2">
                  {notifications.slice(0, 4).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsReadMutation.mutate(notification.id)
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
            {getInitials(user?.fullName ?? 'N/A')}
          </div>
        </div>
      </div>
    </header>
  )
}
