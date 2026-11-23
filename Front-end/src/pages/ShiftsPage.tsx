import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useShiftsQuery, useDirectoryQuery, useUsersQuery, queryKeys } from '../hooks/queries'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import type { Shift } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State'
import { Table, TableContainer } from '../components/ui/Table'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

export const ShiftsPage = () => {
  const shiftsQuery = useShiftsQuery()
  const { data: shifts = [], isLoading } = shiftsQuery
  const usersQuery = useDirectoryQuery()
  const { data: users = [] } = usersQuery
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [times, setTimes] = useState<Record<string, { startTime: string; endTime: string }>>({})
  const [assignments, setAssignments] = useState<Record<string, { supervisorId: string; outgoingStaffId: string; incomingStaffId: string }>>({})
  const [saveError, setSaveError] = useState('')
  const isAdmin = user?.role === 'ADMINISTRATOR'
  const accountsQuery = useUsersQuery(isAdmin)
  const [createError, setCreateError] = useState('')
  const [newShift, setNewShift] = useState({ name: '', team: '', date: '', startTime: '', endTime: '', supervisorId: '', outgoingStaffId: '', incomingStaffId: '' })
  const activeAccounts = (accountsQuery.data ?? []).filter((account) => account.isActive)
  const supervisors = activeAccounts.filter((account) => account.role === 'SUPERVISOR' || account.role === 'ADMINISTRATOR')
  const outgoingStaff = activeAccounts.filter((account) => account.role === 'OUTGOING_STAFF')
  const incomingStaff = activeAccounts.filter((account) => account.role === 'INCOMING_STAFF')
  const createShift = useMutation({
    mutationFn: api.shifts.create,
    onSuccess: () => {
      setCreateError('')
      setNewShift({ name: '', team: '', date: '', startTime: '', endTime: '', supervisorId: '', outgoingStaffId: '', incomingStaffId: '' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.shifts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.handoverShifts })
    },
    onError: (error) => setCreateError(error instanceof Error ? error.message : 'Could not create shift.'),
  })
  const updateTimes = useMutation({ mutationFn: ({ id, value }: { id: string; value: { startTime: string; endTime: string; supervisorId?: string; outgoingStaffId?: string; incomingStaffId?: string } }) => api.shifts.update(id, value), onSuccess: (shift: Shift) => { setSaveError(''); void queryClient.invalidateQueries({ queryKey: queryKeys.shifts }); void queryClient.invalidateQueries({ queryKey: queryKeys.handoverShifts }); setTimes((current) => { const next = { ...current }; delete next[shift.id]; return next }); setAssignments((current) => { const next = { ...current }; delete next[shift.id]; return next }) }, onError: (error) => setSaveError(error instanceof Error ? error.message : 'Could not update shift schedule or assignments.') })
  const loading = isLoading || usersQuery.isLoading || (isAdmin && accountsQuery.isLoading)

  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))
  const saveShift = (shift: Shift) => {
    const draft = assignments[shift.id]
    const changedAssignments = draft ? Object.fromEntries(
      (['supervisorId', 'outgoingStaffId', 'incomingStaffId'] as const)
        .filter((key) => draft[key] !== shift[key])
        .map((key) => [key, draft[key]]),
    ) : {}
    updateTimes.mutate({ id: shift.id, value: { ...(times[shift.id] ?? { startTime: shift.startTime.slice(0, 5), endTime: shift.endTime.slice(0, 5) }), ...changedAssignments } })
  }

  return (
    <div>
      <PageHeader title="Shifts" description="Shift schedule, status, and staffing visibility." />
      {isAdmin ? <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-slate-900">Create and assign a shift</h2>
        <p className="mt-1 text-sm text-slate-600">Select active accounts for the supervisor and both staff handover roles.</p>
        {accountsQuery.error ? <div className="mt-3"><ErrorState message={accountsQuery.error.message} onRetry={() => { void accountsQuery.refetch() }} /></div> : null}
        {createError ? <div className="mt-3"><ErrorState message={createError} /></div> : null}
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); createShift.mutate(newShift) }}>
          <Input aria-label="Shift name" placeholder="Shift name" maxLength={160} required value={newShift.name} onChange={(event) => setNewShift({ ...newShift, name: event.target.value })} />
          <Input aria-label="Team" placeholder="Team" maxLength={120} required value={newShift.team} onChange={(event) => setNewShift({ ...newShift, team: event.target.value })} />
          <Input aria-label="Shift date" type="date" required value={newShift.date} onChange={(event) => setNewShift({ ...newShift, date: event.target.value })} />
          <Input aria-label="Start time" type="time" required value={newShift.startTime} onChange={(event) => setNewShift({ ...newShift, startTime: event.target.value })} />
          <Input aria-label="End time" type="time" required value={newShift.endTime} onChange={(event) => setNewShift({ ...newShift, endTime: event.target.value })} />
          <Select aria-label="Supervisor" required value={newShift.supervisorId} onChange={(event) => setNewShift({ ...newShift, supervisorId: event.target.value })}>
            <option value="">Choose supervisor</option>{supervisors.map((account) => <option key={account.id} value={account.id}>{account.fullName}</option>)}
          </Select>
          <Select aria-label="Outgoing staff" required value={newShift.outgoingStaffId} onChange={(event) => setNewShift({ ...newShift, outgoingStaffId: event.target.value })}>
            <option value="">Choose outgoing staff</option>{outgoingStaff.map((account) => <option key={account.id} value={account.id}>{account.fullName}</option>)}
          </Select>
          <Select aria-label="Incoming staff" required value={newShift.incomingStaffId} onChange={(event) => setNewShift({ ...newShift, incomingStaffId: event.target.value })}>
            <option value="">Choose incoming staff</option>{incomingStaff.map((account) => <option key={account.id} value={account.id}>{account.fullName}</option>)}
          </Select>
          <Button className="sm:col-span-2 lg:col-span-4" type="submit" disabled={createShift.isPending || accountsQuery.isLoading || !supervisors.length || !outgoingStaff.length || !incomingStaff.length}>
            {createShift.isPending ? 'Creating shift…' : 'Create and assign shift'}
          </Button>
        </form>
      </section> : null}
      {saveError ? <ErrorState message={saveError} /> : null}
      {loading ? <LoadingState /> : null}
      {shiftsQuery.error || usersQuery.error ? <ErrorState message={(shiftsQuery.error ?? usersQuery.error)?.message ?? 'Could not load shifts.'} onRetry={() => { void Promise.all([shiftsQuery.refetch(), usersQuery.refetch()]) }} /> : null}
      {!loading && !shiftsQuery.error && !usersQuery.error && !shifts.length ? <EmptyState title="No shifts found" description="There are no shifts available to your account." /> : null}
      {!loading && !shiftsQuery.error && !usersQuery.error && shifts.length ? <TableContainer>
        <Table>
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Supervisor</th>
              {isAdmin ? <th className="px-4 py-3">Assign staff</th> : null}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">{isAdmin ? 'Schedule controls' : ''}</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{shift.name}</td>
                <td className="px-4 py-3 text-slate-600">{shift.team}</td>
                <td className="px-4 py-3 text-slate-600">{isAdmin ? <div className="flex min-w-56 items-center gap-2"><Input aria-label={`${shift.name} check-in time`} type="time" value={times[shift.id]?.startTime ?? shift.startTime.slice(0, 5)} onChange={(event) => setTimes({ ...times, [shift.id]: { startTime: event.target.value, endTime: times[shift.id]?.endTime ?? shift.endTime.slice(0, 5) } })} /><span>to</span><Input aria-label={`${shift.name} check-out time`} type="time" value={times[shift.id]?.endTime ?? shift.endTime.slice(0, 5)} onChange={(event) => setTimes({ ...times, [shift.id]: { startTime: times[shift.id]?.startTime ?? shift.startTime.slice(0, 5), endTime: event.target.value } })} /></div> : `${shift.startTime} - ${shift.endTime}`}</td>
                <td className="px-4 py-3 text-slate-600">{isAdmin ? <Select aria-label={`${shift.name} supervisor`} value={assignments[shift.id]?.supervisorId ?? shift.supervisorId} onChange={(event) => setAssignments({ ...assignments, [shift.id]: { supervisorId: event.target.value, outgoingStaffId: assignments[shift.id]?.outgoingStaffId ?? shift.outgoingStaffId, incomingStaffId: assignments[shift.id]?.incomingStaffId ?? shift.incomingStaffId } })}><option value={shift.supervisorId}>{userMap[shift.supervisorId] ?? 'Current supervisor'}</option>{supervisors.filter((account) => account.id !== shift.supervisorId).map((account) => <option key={account.id} value={account.id}>{account.fullName}</option>)}</Select> : userMap[shift.supervisorId]}</td>
                {isAdmin ? <td className="px-4 py-3"><div className="grid min-w-64 gap-2">
                  <Select aria-label={`${shift.name} outgoing staff`} value={assignments[shift.id]?.outgoingStaffId ?? shift.outgoingStaffId} onChange={(event) => setAssignments({ ...assignments, [shift.id]: { supervisorId: assignments[shift.id]?.supervisorId ?? shift.supervisorId, outgoingStaffId: event.target.value, incomingStaffId: assignments[shift.id]?.incomingStaffId ?? shift.incomingStaffId } })}><option value={shift.outgoingStaffId}>{userMap[shift.outgoingStaffId] ?? 'Current outgoing staff'}</option>{outgoingStaff.filter((account) => account.id !== shift.outgoingStaffId).map((account) => <option key={account.id} value={account.id}>{account.fullName}</option>)}</Select>
                  <Select aria-label={`${shift.name} incoming staff`} value={assignments[shift.id]?.incomingStaffId ?? shift.incomingStaffId} onChange={(event) => setAssignments({ ...assignments, [shift.id]: { supervisorId: assignments[shift.id]?.supervisorId ?? shift.supervisorId, outgoingStaffId: assignments[shift.id]?.outgoingStaffId ?? shift.outgoingStaffId, incomingStaffId: event.target.value } })}><option value={shift.incomingStaffId}>{userMap[shift.incomingStaffId] ?? 'Current incoming staff'}</option>{incomingStaff.filter((account) => account.id !== shift.incomingStaffId).map((account) => <option key={account.id} value={account.id}>{account.fullName}</option>)}</Select>
                </div></td> : null}
                <td className="px-4 py-3">
                  <StatusBadge status={shift.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3"><Link className="text-sm text-slate-900 underline" to={`/shifts/${shift.id}`}>View</Link>{isAdmin ? <Button size="sm" disabled={updateTimes.isPending || !(times[shift.id]?.startTime ?? shift.startTime) || !(times[shift.id]?.endTime ?? shift.endTime)} onClick={() => saveShift(shift)}>Save shift</Button> : null}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer> : null}
    </div>
  )
}
