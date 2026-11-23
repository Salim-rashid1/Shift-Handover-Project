import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useIncidentQuery, useDirectoryQuery, useShiftsQuery, useUpdateIncidentMutation } from '../hooks/queries'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/State'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDateTime, cn } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import type { IncidentStatus } from '../types'

const incidentStatuses: IncidentStatus[] = ['REPORTED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED']

export const IncidentDetailPage = () => {
  const { id = '' } = useParams()
  const incidentQuery = useIncidentQuery(id)
  const incident = incidentQuery.data
  const { data: users = [] } = useDirectoryQuery()
  const { data: shifts = [] } = useShiftsQuery()
  const updateMutation = useUpdateIncidentMutation()
  const { user } = useAuth()
  const [status, setStatus] = useState<IncidentStatus>('REPORTED')
  const [resolution, setResolution] = useState('')

  useEffect(() => {
    if (incident) { setStatus(incident.status); setResolution(incident.resolution ?? '') }
  }, [incident])

  if (incidentQuery.isLoading) {
    return <LoadingState message="Loading incident details..." />
  }
  if (incidentQuery.error) return <ErrorState message={incidentQuery.error.message} onRetry={() => { void incidentQuery.refetch() }} />

  if (!incident) {
    return <Card>Incident not found.</Card>
  }

  const reporter = users.find((user) => user.id === incident.reportedById)
  const shift = shifts.find((item) => item.id === incident.shiftId)
  const isCriticalOrHigh = incident.severity === 'CRITICAL' || incident.severity === 'HIGH'
  const canUpdate = user?.permissions.includes('incidents.manage') ?? false

  return (
    <div className="space-y-4">
      <PageHeader title={incident.title} description={incident.category} />

      <Card
        className={cn(
          isCriticalOrHigh &&
            'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50/30 to-white',
        )}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={incident.status} />
          <SeverityBadge severity={incident.severity} />
        </div>

        <p className="mt-4 text-sm text-slate-700">{incident.description}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Category:</span> {incident.category}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Reported by:</span> {reporter?.fullName}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Shift:</span> {shift?.name}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">Date:</span> {formatDateTime(incident.createdAt)}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resolution</p>
          <p className="mt-1 text-sm text-slate-700">{incident.resolution ?? 'Pending resolution'}</p>
        </div>
        {canUpdate ? <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <Select aria-label="Incident status" value={status} onChange={(event) => setStatus(event.target.value as IncidentStatus)}>
            {incidentStatuses.map((item) => <option key={item} disabled={incident.status === 'CLOSED' && item !== 'CLOSED'}>{item}</option>)}
          </Select>
          <Textarea aria-label="Resolution notes" placeholder="Resolution notes" value={resolution} onChange={(event) => setResolution(event.target.value)} />
          <Button className="sm:col-span-2 sm:justify-self-start" disabled={updateMutation.isPending} onClick={() => { void updateMutation.mutateAsync({ id: incident.id, updates: { status, resolution } }).catch(() => {}) }}>{updateMutation.isPending ? 'Saving…' : 'Save incident update'}</Button>
          {updateMutation.error ? <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{updateMutation.error.message}</p> : null}
        </div> : null}
      </Card>
    </div>
  )
}
