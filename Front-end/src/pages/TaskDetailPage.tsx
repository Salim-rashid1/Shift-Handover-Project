import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useShiftsQuery, useTaskQuery, useUpdateTaskMutation, useDirectoryQuery } from '../hooks/queries'
import type { TaskStatus } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../components/ui/State'
import { useAuth } from '../hooks/useAuth'

const statuses: TaskStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'OVERDUE',
  'CARRIED_FORWARD',
  'CANCELLED',
]

export const TaskDetailPage = () => {
  const { id = '' } = useParams()
  const taskQuery = useTaskQuery(id)
  const task = taskQuery.data
  const { data: users = [] } = useDirectoryQuery()
  const { data: shifts = [] } = useShiftsQuery()
  const updateTaskMutation = useUpdateTaskMutation()
  const { user } = useAuth()
  const [destinationShiftId, setDestinationShiftId] = useState('')

  useEffect(() => {
    if (!destinationShiftId && task && shifts.length) setDestinationShiftId(shifts.find((shift) => shift.id !== task.shiftId)?.id ?? '')
  }, [destinationShiftId, shifts, task])

  if (taskQuery.isLoading) return <LoadingState message="Loading task..." />
  if (taskQuery.error) return <ErrorState message={taskQuery.error.message} onRetry={() => { void taskQuery.refetch() }} />
  if (!task) {
    return <Card>Task not found.</Card>
  }

  const assignee = users.find((user) => user.id === task.assigneeId)
  const canCarryForward = user?.permissions.includes('tasks.manage') ?? false

  return (
    <div>
      <PageHeader title={task.title} description={task.description} />
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-3 text-sm text-slate-600">Assignee: {assignee?.fullName}</p>
        <p className="text-sm text-slate-600">Due date: {task.dueDate}</p>

        <div className="mt-4 max-w-xs">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Update status
          </label>
          <Select
            value={task.status}
            onChange={(event) =>
              updateTaskMutation.mutate({ id: task.id, updates: { status: event.target.value as TaskStatus } })
            }
          >
            {statuses.map((status) => (
              <option key={status} disabled={status === 'CARRIED_FORWARD'}>{status}</option>
            ))}
          </Select>
        </div>
        {canCarryForward && !['COMPLETED', 'CANCELLED'].includes(task.status) ? (
          <div className="mt-5 max-w-md border-t border-slate-200 pt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Carry this task to another shift</label>
            <div className="flex flex-wrap gap-2">
              <Select aria-label="Destination shift" value={destinationShiftId} onChange={(event) => setDestinationShiftId(event.target.value)}>
                {shifts.filter((shift) => shift.id !== task.shiftId).map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
              </Select>
              <Button disabled={!destinationShiftId || updateTaskMutation.isPending} onClick={() => { void updateTaskMutation.mutateAsync({ id: task.id, updates: { status: 'CARRIED_FORWARD', shiftId: destinationShiftId } }).catch(() => {}) }}>Carry forward</Button>
            </div>
          </div>
        ) : null}
        {updateTaskMutation.error ? <p role="alert" className="mt-3 text-sm text-rose-700">{updateTaskMutation.error.message}</p> : null}
      </Card>
    </div>
  )
}
