import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useIncidentsQuery,
  useReportIncidentMutation,
  useShiftsQuery,
  useDirectoryQuery,
} from '../hooks/queries'
import type { IncidentSeverity, IncidentStatus } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Table, TableContainer } from '../components/ui/Table'
import { Textarea } from '../components/ui/Textarea'
import { formatDateTime } from '../lib/utils'
import { cn } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'

const severities: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const statuses: IncidentStatus[] = ['REPORTED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED']
type DateFilter = 'ALL' | 'TODAY' | 'LAST_24_HOURS' | 'LAST_7_DAYS'

export const IncidentsPage = () => {
  const incidentsQuery = useIncidentsQuery()
  const { data: incidents = [], isLoading: incidentsLoading } = incidentsQuery
  const shiftsQuery = useShiftsQuery()
  const { data: shifts = [], isLoading: shiftsLoading } = shiftsQuery
  const usersQuery = useDirectoryQuery()
  const { data: users = [], isLoading: usersLoading } = usersQuery
  const reportIncidentMutation = useReportIncidentMutation()
  const { user } = useAuth()
  const isLoading = incidentsLoading || shiftsLoading || usersLoading

  const shiftMap = Object.fromEntries(shifts.map((shift) => [shift.id, shift.name]))
  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Operations')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM')
  const [shiftId, setShiftId] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IncidentSeverity>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => { if (!shiftId && shifts.length) setShiftId(shifts[0].id) }, [shiftId, shifts])

  const referenceTimestamp = incidents.length
    ? Math.max(...incidents.map((incident) => Date.parse(incident.createdAt)))
    : Date.now()
  const referenceDate = new Date(referenceTimestamp)

  const passesDateFilter = (createdAt: string) => {
    const incidentDate = new Date(createdAt)
    if (dateFilter === 'ALL') return true
    if (dateFilter === 'TODAY') {
      return incidentDate.toDateString() === referenceDate.toDateString()
    }
    if (dateFilter === 'LAST_24_HOURS') {
      return referenceTimestamp - incidentDate.getTime() <= 24 * 60 * 60 * 1000
    }
    return referenceTimestamp - incidentDate.getTime() <= 7 * 24 * 60 * 60 * 1000
  }

  const filteredIncidents = incidents
    .filter((incident) => (severityFilter === 'ALL' ? true : incident.severity === severityFilter))
    .filter((incident) => (statusFilter === 'ALL' ? true : incident.status === statusFilter))
    .filter((incident) => passesDateFilter(incident.createdAt))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incidents"
        description="Report, triage, and resolve operational incidents across shifts."
      />

      {isLoading ? <LoadingState message="Loading incidents..." /> : null}
      {incidentsQuery.error || shiftsQuery.error || usersQuery.error ? <ErrorState message={(incidentsQuery.error ?? shiftsQuery.error ?? usersQuery.error)?.message ?? 'Could not load incident data.'} onRetry={() => { void Promise.all([incidentsQuery.refetch(), shiftsQuery.refetch(), usersQuery.refetch()]) }} /> : null}

      <Card className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Report incident</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input placeholder="Incident title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input placeholder="Category" value={category} onChange={(event) => setCategory(event.target.value)} />
          <Select value={severity} onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}>
            {severities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          className="mt-3"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
        />
        <Button
          className="mt-3"
          disabled={reportIncidentMutation.isPending || !shiftId}
          onClick={() => {
            setFormError('')
            setFormSuccess('')
            if (!title.trim() || !category.trim() || !description.trim() || !shiftId) {
              setFormError('Enter a title, category, description, and select a shift.')
              return
            }
            reportIncidentMutation.mutate({
              title,
              category,
              description,
              severity,
              status: 'REPORTED',
              shiftId,
              reportedById: user?.id ?? '',
              resolution: undefined,
            }, { onSuccess: () => { setTitle(''); setDescription(''); setFormSuccess('Incident reported.') } })
          }}
        >
          {reportIncidentMutation.isPending ? 'Submitting…' : 'Submit incident'}
        </Button>
        {formError || reportIncidentMutation.error ? <p role="alert" className="mt-2 text-sm text-rose-700">{formError || reportIncidentMutation.error?.message}</p> : null}
        {formSuccess ? <p role="status" className="mt-2 text-sm text-emerald-700">{formSuccess}</p> : null}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Severity</label>
            <Select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | IncidentSeverity)}
            >
              <option value="ALL">All severities</option>
              {severities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | IncidentStatus)}
            >
              <option value="ALL">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Date</label>
            <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
              <option value="ALL">All dates</option>
              <option value="TODAY">Today</option>
              <option value="LAST_24_HOURS">Last 24 hours</option>
              <option value="LAST_7_DAYS">Last 7 days</option>
            </Select>
          </div>
        </div>
      </Card>

      {!isLoading && !incidentsQuery.error && !filteredIncidents.length ? (
        <EmptyState
          title="No incidents match current filters"
          description="Try broadening severity, status, or date filters."
        />
      ) : null}

      <TableContainer>
        <Table>
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3">Reported by</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Resolution</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map((incident) => (
              <tr
                key={incident.id}
                className={cn(
                  'border-t border-slate-200',
                  incident.severity === 'CRITICAL' && 'bg-rose-50/60',
                  incident.severity === 'HIGH' && 'bg-amber-50/60',
                )}
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5',
                      incident.severity === 'CRITICAL' && 'border border-rose-200 bg-rose-100/70',
                      incident.severity === 'HIGH' && 'border border-amber-200 bg-amber-100/70',
                    )}
                  >
                    {incident.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{incident.category}</td>
                <td className="px-4 py-3 text-slate-600">
                  <SeverityBadge severity={incident.severity} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{shiftMap[incident.shiftId]}</td>
                <td className="px-4 py-3 text-slate-600">{userMap[incident.reportedById]}</td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(incident.createdAt)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {incident.resolution ? incident.resolution : <span className="text-amber-700">Pending</span>}
                </td>
                <td className="px-4 py-3">
                  <Link className="underline" to={`/incidents/${incident.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  )
}
