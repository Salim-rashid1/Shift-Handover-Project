import { Link } from 'react-router-dom'
import {
  useAcknowledgeHandoverMutation,
  useHandoversQuery,
  useHandoverShiftsQuery,
  useDirectoryQuery,
} from '../hooks/queries'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/State'
import { Table, TableContainer } from '../components/ui/Table'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDateTime } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'

export const HandoversPage = () => {
  const handoversQuery = useHandoversQuery()
  const { data: handovers = [], isLoading: handoversLoading } = handoversQuery
  const shiftsQuery = useHandoverShiftsQuery()
  const { data: shifts = [], isLoading: shiftsLoading } = shiftsQuery
  const usersQuery = useDirectoryQuery()
  const { data: users = [], isLoading: usersLoading } = usersQuery
  const acknowledgeMutation = useAcknowledgeHandoverMutation()
  const { user } = useAuth()
  const isPrivileged = user?.permissions.includes('handovers.manage') ?? false

  const isLoading = handoversLoading || shiftsLoading || usersLoading
  const shiftMap = Object.fromEntries(shifts.map((shift) => [shift.id, shift.name]))
  const userMap = Object.fromEntries(users.map((user) => [user.id, user.fullName]))
  const orderedHandovers = [...handovers].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Handovers"
        description="Track and manage outgoing to incoming shift transfer records."
        action={(
          <Link to="/handovers/create">
            <Button>Create handover</Button>
          </Link>
        )}
      />

      {isLoading ? <LoadingState message="Loading handover records..." /> : null}
      {handoversQuery.error || shiftsQuery.error || usersQuery.error ? <ErrorState message={(handoversQuery.error ?? shiftsQuery.error ?? usersQuery.error)?.message ?? 'Could not load handovers.'} onRetry={() => { void Promise.all([handoversQuery.refetch(), shiftsQuery.refetch(), usersQuery.refetch()]) }} /> : null}
      {acknowledgeMutation.error ? <ErrorState message={acknowledgeMutation.error.message} /> : null}

      {!isLoading && !handoversQuery.error && !orderedHandovers.length ? (
        <EmptyState
          title="No handovers yet"
          description="Create a handover for any company shift, then submit it so the incoming team can review and acknowledge it."
        />
      ) : null}

      {!isLoading && !handoversQuery.error && orderedHandovers.length ? (
        <TableContainer>
          <Table>
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Outgoing</th>
                <th className="px-4 py-3">Incoming</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Acknowledgement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedHandovers.map((handover) => (
                <tr key={handover.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-700">{shiftMap[handover.shiftId] ?? handover.shiftId}</td>
                  <td className="px-4 py-3 text-slate-700">{userMap[handover.outgoingStaffId] ?? handover.outgoingStaffId}</td>
                  <td className="px-4 py-3 text-slate-700">{userMap[handover.incomingStaffId] ?? handover.incomingStaffId}</td>
                  <td className="px-4 py-3 text-slate-700">{handover.date}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={handover.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={handover.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {handover.submittedAt ? formatDateTime(handover.submittedAt) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {handover.acknowledgedAt ? (
                      <Badge className="border-emerald-300 bg-emerald-100 text-emerald-700">Acknowledged</Badge>
                    ) : (
                      <Badge className="border-amber-300 bg-amber-100 text-amber-700">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link className="text-sm text-slate-900 underline" to={`/handovers/${handover.id}`}>
                        View
                      </Link>
                      {!handover.acknowledgedAt && handover.status === 'SUBMITTED' && (user?.id === handover.incomingStaffId || isPrivileged) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={acknowledgeMutation.isPending}
                          onClick={() => acknowledgeMutation.mutate(handover.id)}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      ) : null}
    </div>
  )
}
