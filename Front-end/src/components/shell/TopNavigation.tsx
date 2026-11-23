import { Bell, ChevronDown, Menu } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInitials } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useAuth } from '../../hooks/useAuth'
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../../hooks/queries'
import { NotificationItem } from '../notifications/NotificationItem'
import { Input } from '../ui/Input'
import { api } from '../../services/api'

export const TopNavigation = ({ onOpenMobileNav }: { onOpenMobileNav: () => void }) => {
  const { user: currentUser, logout } = useAuth()
  const { data: notifications = [] } = useNotificationsQuery()
  const markReadMutation = useMarkNotificationReadMutation()
  const markAllMutation = useMarkAllNotificationsReadMutation()
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)

  const myNotifications = useMemo(
    () => notifications.filter((item) => item.userId === currentUser?.id).slice(0, 5),
    [currentUser?.id, notifications],
  )
  const canAccessAdminArea = currentUser?.permissions.includes('audit.view') ?? false
  const unreadCount = myNotifications.filter((item) => !item.isRead).length

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={onOpenMobileNav}>
            <Menu className="size-4" />
          </Button>
          <div>
            <p className="text-xs text-slate-500">Shift Handover Management System</p>
            <p className="text-sm font-medium text-slate-900">Operations Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNotificationOpen((value) => !value)
                setProfileOpen(false)
              }}
            >
              <Bell className="mr-1.5 size-4" />
              Alerts
              {unreadCount ? (
                <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Button>
            {notificationOpen ? (
              <Card className="absolute right-0 mt-2 w-80 p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <div className="flex items-center gap-2">
                    {unreadCount ? (
                      <button
                        type="button"
                        className="text-xs text-slate-500 underline"
                        onClick={() => markAllMutation.mutate()}
                      >
                        Mark all read
                      </button>
                    ) : null}
                    <Link to="/notifications" className="text-xs text-slate-500 underline">
                      View all
                    </Link>
                  </div>
                </div>
                <div className="space-y-2">
                  {myNotifications.length ? (
                    myNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => {
                          if (!notification.isRead) {
                            markReadMutation.mutate(notification.id)
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div
                      className="rounded-md border border-slate-200 p-3 text-xs text-slate-600"
                    >
                      No notifications.
                    </div>
                  )}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProfileOpen((value) => !value)
                setNotificationOpen(false)
              }}
              className="gap-2"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                {getInitials(currentUser?.fullName ?? 'User')}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium text-slate-900">{currentUser?.fullName}</span>
                <span className="block text-[11px] text-slate-500">{currentUser?.role}</span>
              </span>
              <ChevronDown className="size-4" />
            </Button>

            {profileOpen ? (
              <Card className="absolute right-0 mt-2 w-60 p-3 shadow-lg">
                <p className="text-sm font-semibold text-slate-900">{currentUser?.fullName}</p>
                <p className="text-xs text-slate-500">{currentUser?.email}</p>
                <p className="mt-1 text-xs text-slate-500">Role: {currentUser?.role}</p>
                <div className="mt-3 space-y-2">
                  <form className="space-y-2 border-t border-slate-200 pt-3" onSubmit={async (event) => {
                    event.preventDefault(); setPasswordMessage(''); setPasswordError(''); setPasswordBusy(true)
                    try { await api.auth.changePassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); setPasswordMessage('Password updated.') }
                    catch (error) { setPasswordError(error instanceof Error ? error.message : 'Password update failed.') }
                    finally { setPasswordBusy(false) }
                  }}>
                    <p className="text-xs font-semibold text-slate-700">Change password</p>
                    <Input aria-label="Current password" type="password" autoComplete="current-password" placeholder="Current password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                    <Input aria-label="New password" type="password" autoComplete="new-password" placeholder="New password (12+ characters)" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                    {passwordMessage ? <p role="status" className="text-xs text-emerald-700">{passwordMessage}</p> : null}
                    {passwordError ? <p role="alert" className="text-xs text-rose-700">{passwordError}</p> : null}
                    <Button type="submit" size="sm" disabled={passwordBusy || newPassword.length < 12}>{passwordBusy ? 'Updating…' : 'Update password'}</Button>
                  </form>
                  {canAccessAdminArea ? <Link to="/users" className="block text-sm text-slate-700 hover:text-slate-900">User management</Link> : null}
                  <button
                    type="button"
                    onClick={() => { void logout() }}
                    className="block text-sm text-rose-600 hover:text-rose-700"
                  >
                    Sign out
                  </button>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
