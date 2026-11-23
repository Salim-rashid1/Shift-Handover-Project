import { BellRing } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../../lib/utils'
import type { Notification } from '../../types'
import { cn } from '../../lib/utils'

export const NotificationItem = ({
  notification,
  onClick,
}: {
  notification: Notification
  onClick?: () => void
}) => {
  const routeBase = ({ HANDOVER: '/handovers', TASK: '/tasks', INCIDENT: '/incidents', SHIFT: '/shifts' } as const)[notification.type as 'HANDOVER' | 'TASK' | 'INCIDENT' | 'SHIFT']
  const className = cn(
      'w-full rounded-lg border p-3 text-left transition hover:bg-slate-50',
      notification.isRead
        ? 'border-slate-200 bg-white'
        : 'border-blue-200 bg-blue-50/40',
    )
  const content = (
    <div className="flex items-start gap-2">
      <BellRing className="mt-0.5 size-4 text-slate-500" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{notification.title}</p>
        <p className="mt-1 text-xs text-slate-600">{notification.message}</p>
        <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
      </div>
    </div>
  )
  return notification.relatedEntityId && routeBase ? (
    <Link to={`${routeBase}/${notification.relatedEntityId}`} onClick={onClick} className={className}>{content}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{content}</button>
  )
}
