import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useCreateTaskMutation,
  useShiftsQuery,
  useTasksQuery,
  useDirectoryQuery,
} from '../hooks/queries'
import type { Priority, TaskStatus } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { Table, TableContainer } from '../components/ui/Table'
import { Textarea } from '../components/ui/Textarea'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Card } from '../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State'
import { useAuth } from '../hooks/useAuth'

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const statuses: TaskStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'OVERDUE',
  'CANCELLED',
]

export const TasksPage = () => {
  const tasksQuery = useTasksQuery()
  const { data: tasks = [] } = tasksQuery
  const usersQuery = useDirectoryQuery()
  const { data: users = [] } = usersQuery
  const shiftsQuery = useShiftsQuery()
  const { data: shifts = [] } = shiftsQuery
  const createTaskMutation = useCreateTaskMutation()
  const { user } = useAuth()
  const canCreate = user?.permissions.includes('tasks.manage') ?? false

  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))
  const shiftMap = Object.fromEntries(shifts.map((shift) => [shift.id, shift.name]))

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [status, setStatus] = useState<TaskStatus>('PENDING')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16))
  const [shiftId, setShiftId] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => { if (!assigneeId && users.length) setAssigneeId(users[0].id) }, [assigneeId, users])
  useEffect(() => { if (!shiftId && shifts.length) setShiftId(shifts[0].id) }, [shiftId, shifts])

  return (
    <div>
      <PageHeader title="Tasks" description="Task tracking across shifts and handovers." />

      {tasksQuery.isLoading || usersQuery.isLoading || shiftsQuery.isLoading ? <LoadingState message="Loading tasks..." /> : null}
      {tasksQuery.error || usersQuery.error || shiftsQuery.error ? <ErrorState message={(tasksQuery.error ?? usersQuery.error ?? shiftsQuery.error)?.message ?? 'Could not load tasks.'} onRetry={() => { void Promise.all([tasksQuery.refetch(), usersQuery.refetch(), shiftsQuery.refetch()]) }} /> : null}
      {canCreate ? <Card className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Create task</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input placeholder="Task title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {priorities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </Select>
          <Select value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name}
              </option>
            ))}
          </Select>
          <Input value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <Textarea
          className="mt-3"
          placeholder="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {createTaskMutation.error ? <p role="alert" className="mt-3 text-sm text-rose-700">{createTaskMutation.error.message}</p> : null}
        <Button
          className="mt-3"
          disabled={createTaskMutation.isPending || !title.trim() || !description.trim() || !assigneeId || !shiftId}
          onClick={() => {
            setFormError('')
            setFormSuccess('')
            if (!title.trim() || !description.trim() || !assigneeId || !shiftId) {
              setFormError('Enter a title and description, then select an assignee and shift.')
              return
            }
            createTaskMutation.mutate({
              title,
              description,
              priority,
              status,
              assigneeId,
              dueDate,
              shiftId,
            }, { onSuccess: () => { setTitle(''); setDescription(''); setFormSuccess('Task created.') } })
          }}
        >
          Create Task
        </Button>
        {formError || createTaskMutation.error ? <p role="alert" className="mt-2 text-sm text-rose-700">{formError || createTaskMutation.error?.message}</p> : null}
        {formSuccess ? <p role="status" className="mt-2 text-sm text-emerald-700">{formSuccess}</p> : null}
      </Card> : null}

      {!tasksQuery.isLoading && !usersQuery.isLoading && !shiftsQuery.isLoading && !tasksQuery.error && !usersQuery.error && !shiftsQuery.error && !tasks.length ? <EmptyState title="No tasks found" description="No task records are currently visible to your account." /> : null}
      {!tasksQuery.isLoading && !usersQuery.isLoading && !shiftsQuery.isLoading && !tasksQuery.error && !usersQuery.error && !shiftsQuery.error && tasks.length ? <TableContainer>
        <Table>
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{task.title}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{userMap[task.assigneeId]}</td>
                <td className="px-4 py-3 text-slate-600">{shiftMap[task.shiftId]}</td>
                <td className="px-4 py-3">
                  <Link className="underline" to={`/tasks/${task.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer> : null}
    </div>
  )
}
