import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useAcknowledgeHandoverMutation,
  useHandoverQuery,
  useIncidentsQuery,
  useHandoverShiftsQuery,
  useSubmitHandoverMutation,
  useTasksQuery,
  useUpdateHandoverMutation,
  useDirectoryQuery,
} from '../hooks/queries'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { ErrorState, LoadingState } from '../components/ui/State'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDateTime } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import type { Priority } from '../types'

export const HandoverDetailPage = () => {
  const { id = '' } = useParams()
  const { data: handover, isLoading, error, refetch } = useHandoverQuery(id)
  const { data: shifts = [] } = useHandoverShiftsQuery()
  const { data: users = [] } = useDirectoryQuery()
  const { data: tasks = [] } = useTasksQuery()
  const { data: incidents = [] } = useIncidentsQuery()
  const submitMutation = useSubmitHandoverMutation()
  const acknowledgeMutation = useAcknowledgeHandoverMutation()
  const updateMutation = useUpdateHandoverMutation()
  const { user } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')

  useEffect(() => {
    if (!handover || editing) return
    setSummary(handover.summary)
    setNotes(handover.additionalNotes ?? '')
    setPriority(handover.priority)
  }, [editing, handover])

  if (isLoading) {
    return <LoadingState message="Loading handover details..." />
  }

  if (error) return <ErrorState message={error.message} onRetry={() => { void refetch() }} />

  if (!handover) {
    return <Card>Handover not found.</Card>
  }

  const shift = shifts.find((item) => item.id === handover.shiftId)
  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))
  const completedTasks = tasks.filter((task) => handover.completedTaskIds.includes(task.id))
  const pendingTasks = tasks.filter((task) => handover.pendingTaskIds.includes(task.id))
  const relatedIncidents = incidents.filter((incident) => handover.incidentIds.includes(incident.id))
  const isPrivileged = user?.permissions.includes('handovers.manage') ?? false
  const canSubmit = handover.status === 'DRAFT' && (user?.id === handover.createdById || isPrivileged)
  const canAcknowledge = !handover.acknowledgedAt && handover.status === 'SUBMITTED' && (user?.id === handover.incomingStaffId || isPrivileged)
  const canEdit = handover.status === 'DRAFT' && (user?.id === handover.createdById || isPrivileged)

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Handover ${handover.id}`}
        description={shift?.name}
        action={
          <div className="flex gap-2">
            {canEdit && !editing ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit draft</Button> : null}
            {canSubmit ? (
              <Button disabled={submitMutation.isPending} onClick={() => submitMutation.mutate(handover.id)}>
                Submit Handover
              </Button>
            ) : null}
            {canAcknowledge ? (
              <Button variant="secondary" disabled={acknowledgeMutation.isPending} onClick={() => setConfirmOpen(true)}>
                Acknowledge Handover
              </Button>
            ) : null}
          </div>
        }
      />
      {submitMutation.error || acknowledgeMutation.error ? <ErrorState message={(submitMutation.error ?? acknowledgeMutation.error)?.message ?? 'The handover action failed.'} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">State</p>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={handover.status} />
            <PriorityBadge priority={handover.priority} />
          </div>
          <p className="mt-3 text-sm text-slate-600">Outgoing: {userMap[handover.outgoingStaffId] ?? handover.outgoingStaffId}</p>
          <p className="text-sm text-slate-600">Incoming: {userMap[handover.incomingStaffId] ?? handover.incomingStaffId}</p>
          <p className="text-sm text-slate-600">Date: {handover.date}</p>
          <p className="text-sm text-slate-600">
            Submitted: {handover.submittedAt ? formatDateTime(handover.submittedAt) : 'Not submitted'}
          </p>
          <p className="text-sm text-slate-600">
            Acknowledged: {handover.acknowledgedAt ? formatDateTime(handover.acknowledgedAt) : 'Pending'}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
          {editing ? (
            <div className="mt-3 space-y-3">
              <Textarea aria-label="Handover summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
              <Textarea aria-label="Additional notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              <Select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((item) => <option key={item}>{item}</option>)}
              </Select>
              {updateMutation.error ? <p role="alert" className="text-sm text-rose-700">{updateMutation.error.message}</p> : null}
              <div className="flex gap-2">
                <Button disabled={updateMutation.isPending || summary.trim().length < 3} onClick={() => { void updateMutation.mutateAsync({ id: handover.id, updates: { summary: summary.trim(), additionalNotes: notes, priority } }).then(() => setEditing(false)).catch(() => {}) }}>Save draft</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : <><p className="mt-2 text-sm text-slate-700">{handover.summary}</p><p className="mt-3 text-sm text-slate-600">Notes: {handover.additionalNotes ?? 'None'}</p></>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Completed tasks</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {completedTasks.map((task) => (
              <li key={task.id}>
                <Link className="underline" to={`/tasks/${task.id}`}>
                  {task.title}
                </Link>
              </li>
            ))}
            {!completedTasks.length ? <li className="text-slate-500">No completed tasks selected.</li> : null}
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Pending tasks</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {pendingTasks.map((task) => (
              <li key={task.id}>
                <Link className="underline" to={`/tasks/${task.id}`}>
                  {task.title}
                </Link>
              </li>
            ))}
            {!pendingTasks.length ? <li className="text-slate-500">No pending tasks selected.</li> : null}
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Incidents</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {relatedIncidents.map((incident) => (
              <li key={incident.id}>
                <Link className="underline" to={`/incidents/${incident.id}`}>
                  {incident.title}
                </Link>
              </li>
            ))}
            {!relatedIncidents.length ? <li className="text-slate-500">No incidents linked.</li> : null}
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Acknowledge handover"
        message="Confirm that you have reviewed and accepted this handover."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          acknowledgeMutation.mutate(handover.id)
          setConfirmOpen(false)
        }}
      />
    </div>
  )
}
