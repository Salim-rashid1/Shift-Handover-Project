import {
  AlertOctagon,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Siren,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useActivityQuery, useDashboardQuery, useHandoversQuery, useIncidentsQuery, useShiftsQuery, useTasksQuery, useDirectoryQuery } from '../hooks/queries'
import { formatDateTime } from '../lib/utils'
import { ActivityItem } from '../components/ui/ActivityItem'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../components/ui/State'

const taskStatusesToTrack = ['PENDING', 'IN_PROGRESS', 'OVERDUE', 'CARRIED_FORWARD'] as const

const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export const DashboardPage = () => {
  const dashboardQuery = useDashboardQuery()
  const handoversQuery = useHandoversQuery()
  const incidentsQuery = useIncidentsQuery()
  const shiftsQuery = useShiftsQuery()
  const tasksQuery = useTasksQuery()
  const usersQuery = useDirectoryQuery()
  const activityQuery = useActivityQuery()
  const handovers = handoversQuery.data ?? []
  const incidents = incidentsQuery.data ?? []
  const shifts = shiftsQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const users = usersQuery.data ?? []
  const activity = activityQuery.data ?? []
  const queries = [dashboardQuery, handoversQuery, incidentsQuery, shiftsQuery, tasksQuery, usersQuery, activityQuery]
  const loading = queries.some((query) => query.isLoading)
  const failed = queries.find((query) => query.error)

  if (loading) return <LoadingState message="Loading operational dashboard..." />
  if (failed) return <ErrorState message={failed.error?.message ?? 'Could not load dashboard data.'} onRetry={() => { void Promise.all(queries.map((query) => query.refetch())) }} />
  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))
  const shiftMap = Object.fromEntries(shifts.map((shift) => [shift.id, shift.name]))

  const activeShifts = shifts.filter((shift) => shift.status === 'ACTIVE')
  const currentShift = activeShifts[0]

  const recentHandovers = [...handovers]
    .sort((a, b) => (a.submittedAt ?? a.date < (b.submittedAt ?? b.date) ? 1 : -1))
    .slice(0, 5)

  const priorityTasks = [...tasks]
    .filter((task) => ['HIGH', 'CRITICAL'].includes(task.priority))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 5)

  const recentIncidents = [...incidents].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5)

  const recentActivity = [...activity].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 6)
  const metrics = dashboardQuery.data?.metrics

  const taskStatusChartData = taskStatusesToTrack.map((status) => ({
    status: status.replaceAll('_', ' '),
    count: tasks.filter((task) => task.status === status).length,
  }))

  const incidentSeverityChartData = severityLevels
    .map((severity) => ({
      name: severity,
      value: incidents.filter((incident) => incident.severity === severity).length,
    }))
    .filter((item) => item.value > 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Operational Dashboard"
        description="Real-time snapshot of shift continuity, operational risk, and accountability."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active Shifts"
          value={metrics?.activeShifts ?? 0}
          icon={Clock3}
          hint="Currently in progress"
        />
        <StatCard
          label="Pending Handovers"
          value={metrics?.pendingHandovers ?? 0}
          icon={ClipboardCheck}
          hint="Require transfer completion"
        />
        <StatCard
          label="Open Tasks"
          value={metrics?.openTasks ?? 0}
          icon={ClipboardList}
          hint="Pending, in progress or blocked"
        />
        <StatCard
          label="Overdue Tasks"
          value={metrics?.overdueTasks ?? 0}
          icon={AlertOctagon}
          hint="Need immediate follow-up"
        />
        <StatCard
          label="Critical Incidents"
          value={metrics?.criticalIncidents ?? 0}
          icon={Siren}
          hint="Unresolved critical events"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Task pressure by status</h2>
                <p className="mt-1 text-xs text-slate-500">Tracks workload from records visible to your account.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f172a" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Incident severity mix</h2>
          <p className="mt-1 text-xs text-slate-500">Shows risk concentration by incident severity.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incidentSeverityChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Current shift</h2>
          {currentShift ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{currentShift.name}</p>
              <p>Team: {currentShift.team}</p>
              <p>
                Window: {currentShift.startTime} - {currentShift.endTime}
              </p>
              <p>Supervisor: {userMap[currentShift.supervisorId]}</p>
              <StatusBadge status={currentShift.status} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No active shift found.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Recent handovers</h2>
          <div className="mt-3 space-y-2">
            {!recentHandovers.length ? <p className="text-sm text-slate-500">No handovers are currently visible.</p> : null}
            {recentHandovers.map((handover) => (
              <Link
                key={handover.id}
                to={`/handovers/${handover.id}`}
                className="block rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm font-medium text-slate-900">{shiftMap[handover.shiftId]}</p>
                <p className="mt-1 text-xs text-slate-600">{handover.summary}</p>
                <div className="mt-2 flex items-center justify-between">
                  <PriorityBadge priority={handover.priority} />
                  <StatusBadge status={handover.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Priority tasks</h2>
          <div className="mt-3 space-y-2">
            {!priorityTasks.length ? <p className="text-sm text-slate-500">No high priority tasks are currently visible.</p> : null}
            {priorityTasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="block rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm font-medium text-slate-900">{task.title}</p>
                <p className="mt-1 text-xs text-slate-500">Due {formatDateTime(task.dueDate)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Recent incidents</h2>
          <div className="mt-3 space-y-2">
            {!recentIncidents.length ? <p className="text-sm text-slate-500">No incidents are currently visible.</p> : null}
            {recentIncidents.map((incident) => (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className="block rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm font-medium text-slate-900">{incident.title}</p>
                <p className="mt-1 text-xs text-slate-600">{incident.category}</p>
                <div className="mt-2 flex items-center justify-between">
                  <StatusBadge status={incident.status} />
                  <span className="text-xs text-slate-500">{incident.severity}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Activity feed</h2>
          <div className="mt-3 space-y-2">
            {!recentActivity.length ? <p className="text-sm text-slate-500">No activity is currently available.</p> : null}
            {recentActivity.map((entry) => (
              <ActivityItem
                key={entry.id}
                activity={entry}
                actorName={entry.actorName}
              />
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
