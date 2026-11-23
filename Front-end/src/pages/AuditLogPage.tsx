import { useActivityQuery } from '../hooks/queries'
import { formatDateTime } from '../lib/utils'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../components/ui/State'
import { Card } from '../components/ui/Card'

export const AuditLogPage = () => {
  const activityQuery = useActivityQuery()
  const { data: activity = [], isLoading } = activityQuery
  return (
    <div>
      <PageHeader title="Audit Log" description="Recent activity and accountability trail." />
      {isLoading ? <LoadingState /> : null}
      {activityQuery.error ? <ErrorState message={activityQuery.error.message} onRetry={() => { void activityQuery.refetch() }} /> : null}
      <div className="space-y-3">
        {activity.map((entry) => (
          <Card key={entry.id}>
            <p className="text-sm text-slate-900">
              <span className="font-medium">{entry.actorName}</span> ·{' '}
              {entry.action.replaceAll('_', ' ')}
            </p>
            <p className="mt-1 text-sm text-slate-600">{entry.details}</p>
            <p className="mt-2 text-xs text-slate-500">{formatDateTime(entry.timestamp)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
