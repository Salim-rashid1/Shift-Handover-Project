import { useState } from 'react'
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../hooks/queries'
import { NotificationItem } from '../components/notifications/NotificationItem'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State'
import { PageHeader } from '../components/ui/PageHeader'

type NotificationFilter = 'ALL' | 'UNREAD' | 'READ'

export const NotificationsPage = () => {
  const { data: notifications = [], isLoading, error, refetch } = useNotificationsQuery()
  const markAsReadMutation = useMarkNotificationReadMutation()
  const markAllReadMutation = useMarkAllNotificationsReadMutation()
  const [filter, setFilter] = useState<NotificationFilter>('ALL')

  const unreadCount = notifications.filter((item) => !item.isRead).length
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'ALL') return true
    if (filter === 'UNREAD') return !notification.isRead
    return notification.isRead
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description={`Unread: ${unreadCount}. Review and mark events as read.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!unreadCount || markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all as read
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === 'ALL' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('ALL')}>
          All
        </Button>
        <Button
          variant={filter === 'UNREAD' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('UNREAD')}
        >
          Unread
        </Button>
        <Button variant={filter === 'READ' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('READ')}>
          Read
        </Button>
      </div>

      {isLoading ? <LoadingState message="Loading notifications..." /> : null}
      {error ? <ErrorState message={error.message} onRetry={() => { void refetch() }} /> : null}
      {markAsReadMutation.error || markAllReadMutation.error ? <ErrorState message={(markAsReadMutation.error ?? markAllReadMutation.error)?.message ?? 'Could not update notifications.'} /> : null}

      {!isLoading && !error && !filteredNotifications.length ? (
        <EmptyState
          title="No notifications in this view"
          description="Operational alerts are generated from handover, task, and incident events."
        />
      ) : null}

      <div className="space-y-2">
        {filteredNotifications.map((notification) => (
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
  )
}
