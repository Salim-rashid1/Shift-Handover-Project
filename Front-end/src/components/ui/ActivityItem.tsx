import type { AuditActivity } from '../../types'
import { formatDateTime } from '../../lib/utils'

export const ActivityItem = ({
  activity,
  actorName,
}: {
  activity: AuditActivity
  actorName: string
}) => {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-900">
        {actorName} · {activity.action.replaceAll('_', ' ')}
      </p>
      <p className="mt-1 text-sm text-slate-600">{activity.details}</p>
      <p className="mt-2 text-xs text-slate-500">{formatDateTime(activity.timestamp)}</p>
    </article>
  )
}
