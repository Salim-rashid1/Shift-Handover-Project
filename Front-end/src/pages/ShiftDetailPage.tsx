import { Link, useParams } from 'react-router-dom'
import {
  useHandoversQuery,
  useIncidentsQuery,
  useShiftQuery,
  useTasksQuery,
  useDirectoryQuery,
} from '../hooks/queries'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State'

export const ShiftDetailPage = () => {
  const { id = '' } = useParams()
  const shiftQuery = useShiftQuery(id)
  const usersQuery = useDirectoryQuery()
  const tasksQuery = useTasksQuery()
  const incidentsQuery = useIncidentsQuery()
  const handoversQuery = useHandoversQuery()
  const { data: shift } = shiftQuery
  const { data: users = [] } = usersQuery
  const { data: tasks = [] } = tasksQuery
  const { data: incidents = [] } = incidentsQuery
  const { data: handovers = [] } = handoversQuery
  const queries = [shiftQuery, usersQuery, tasksQuery, incidentsQuery, handoversQuery]
  const loading = queries.some((query) => query.isLoading)
  const error = queries.find((query) => query.error)?.error

  if (loading) return <LoadingState message="Loading shift details..." />
  if (error) return <ErrorState message={error.message} onRetry={() => { void Promise.all(queries.map((query) => query.refetch())) }} />
  if (!shift) return <EmptyState title="Shift not found" description="This shift is unavailable or you do not have permission to view it." />

  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))
  const relatedTasks = tasks.filter((task) => task.shiftId === shift.id)
  const relatedIncidents = incidents.filter((incident) => incident.shiftId === shift.id)
  const relatedHandovers = handovers.filter((handover) => handover.shiftId === shift.id)

  return (
    <div>
      <PageHeader title={shift.name} description={`${shift.startTime} - ${shift.endTime} · ${shift.team}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-2">
            <StatusBadge status={shift.status} />
          </div>
          <p className="mt-4 text-sm text-slate-600">Supervisor: {userMap[shift.supervisorId]}</p>
          <p className="text-sm text-slate-600">Outgoing: {userMap[shift.outgoingStaffId]}</p>
          <p className="text-sm text-slate-600">Incoming: {userMap[shift.incomingStaffId]}</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Related handovers</h2>
          <div className="mt-3 space-y-2">
            {!relatedHandovers.length ? <p className="text-sm text-slate-500">No handovers are linked to this shift.</p> : null}
            {relatedHandovers.map((handover) => (
              <Link key={handover.id} to={`/handovers/${handover.id}`} className="block rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={handover.priority} />
                  <StatusBadge status={handover.status} />
                </div>
                <p className="mt-2 text-sm text-slate-700">{handover.summary}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
          <div className="mt-3 space-y-2">
            {!relatedTasks.length ? <p className="text-sm text-slate-500">No tasks are linked to this shift.</p> : null}
            {relatedTasks.map((task) => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="block rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{task.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Incidents</h2>
          <div className="mt-3 space-y-2">
            {!relatedIncidents.length ? <p className="text-sm text-slate-500">No incidents are linked to this shift.</p> : null}
            {relatedIncidents.map((incident) => (
              <Link key={incident.id} to={`/incidents/${incident.id}`} className="block rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{incident.title}</p>
                <StatusBadge status={incident.status} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
