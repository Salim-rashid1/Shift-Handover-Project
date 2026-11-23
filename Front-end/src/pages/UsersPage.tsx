import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useUsersQuery, queryKeys } from '../hooks/queries'
import type { Role, User } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, EmptyState, LoadingState } from '../components/ui/State'
import { Table, TableContainer } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

const accountRoles: Role[] = ['ADMINISTRATOR', 'SUPERVISOR', 'OUTGOING_STAFF', 'INCOMING_STAFF']
const emptyForm = { fullName: '', email: '', password: '', role: 'OUTGOING_STAFF' as Role, department: '' }
const noUsers: User[] = []

export const UsersPage = () => {
  const { user: currentUser } = useAuth()
  const usersQuery = useUsersQuery()
  const canManage = currentUser?.permissions.includes('users.manage') ?? false
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ fullName: '', email: '', department: '' })
  const [actionError, setActionError] = useState('')
  const users = usersQuery.data ?? noUsers
  const visibleUsers = useMemo(() => {
    const query = filter.trim().toLowerCase()
    return users.filter((item) => !query || [item.fullName, item.email, item.department, item.role, item.status].some((value) => value.toLowerCase().includes(query)))
  }, [filter, users])

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: queryKeys.users })
  const createMutation = useMutation({ mutationFn: api.users.create, onSuccess: () => { setForm(emptyForm); setActionError(''); void refreshUsers() } })
  const updateMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: typeof edit }) => api.users.update(id, values), onSuccess: () => { setEditingId(null); setActionError(''); void refreshUsers() } })
  const roleMutation = useMutation({ mutationFn: ({ id, role }: { id: string; role: Role }) => api.users.setRole(id, role), onSuccess: () => { setActionError(''); void refreshUsers() } })
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.users.setActive(id, isActive), onSuccess: () => { setActionError(''); void refreshUsers() } })
  const busy = createMutation.isPending || updateMutation.isPending || roleMutation.isPending || statusMutation.isPending

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError('')
    try { await action() } catch (error) { setActionError(error instanceof Error ? error.message : 'The account change failed.') }
  }

  const startEdit = (item: User) => {
    setEditingId(item.id)
    setEdit({ fullName: item.fullName, email: item.email, department: item.department })
  }

  return (
    <div>
      <PageHeader title="Users" description="Manage operational accounts and access using the server’s assigned roles." />

      {canManage ? (
        <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Create an account</h2>
          <p className="mt-1 text-sm text-slate-600">Accounts are provisioned by an administrator. Set an initial password of at least 12 characters and share it privately; users can change it after signing in.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void runAction(() => createMutation.mutateAsync(form)) }}>
            <Input aria-label="Full name" autoComplete="name" placeholder="Full name" maxLength={160} required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            <Input aria-label="Work email" type="email" autoComplete="email" placeholder="Work email" maxLength={254} required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input aria-label="Initial password" type="password" autoComplete="new-password" placeholder="Initial password (12+ characters)" minLength={12} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <Select aria-label="Assigned role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
              {accountRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
            </Select>
            <Input aria-label="Department or team" placeholder="Department or team" maxLength={120} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            <Button type="submit" disabled={busy}>{createMutation.isPending ? 'Creating…' : 'Create account'}</Button>
          </form>
        </section>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{users.length} account{users.length === 1 ? '' : 's'} from the API</p>
        <Input aria-label="Search users" className="sm:max-w-sm" placeholder="Search name, email, role, team, or status" value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>
      {actionError ? <div className="mb-4"><ErrorState message={actionError} /></div> : null}
      {usersQuery.isLoading ? <LoadingState message="Loading accounts…" /> : null}
      {usersQuery.error ? <ErrorState message={usersQuery.error.message} onRetry={() => { void usersQuery.refetch() }} /> : null}
      {!usersQuery.isLoading && !usersQuery.error && !visibleUsers.length ? <EmptyState title={users.length ? 'No matching accounts' : 'No accounts found'} description={users.length ? 'Try another search term.' : 'No database-backed user records are available.'} /> : null}
      {!usersQuery.isLoading && !usersQuery.error && visibleUsers.length ? (
        <TableContainer>
          <Table>
            <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr>
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th>{canManage ? <th className="px-4 py-3">Actions</th> : null}
            </tr></thead>
            <tbody>
              {visibleUsers.map((item) => <tr key={item.id} className="border-t border-slate-200 align-middle">
                <td className="px-4 py-3 font-medium text-slate-900">{editingId === item.id ? <Input aria-label="Edit full name" maxLength={160} value={edit.fullName} onChange={(event) => setEdit({ ...edit, fullName: event.target.value })} /> : item.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{editingId === item.id ? <Input aria-label="Edit email" type="email" maxLength={254} value={edit.email} onChange={(event) => setEdit({ ...edit, email: event.target.value })} /> : item.email}</td>
                <td className="px-4 py-3">{canManage ? <Select aria-label={`Role for ${item.fullName}`} className="min-w-44" value={item.role} disabled={busy || item.id === currentUser?.id} onChange={(event) => {
                  const role = event.target.value as Role
                  if (role !== item.role && window.confirm(`Change ${item.fullName}'s role to ${role.replaceAll('_', ' ')}?`)) void runAction(() => roleMutation.mutateAsync({ id: item.id, role }))
                }}>{accountRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</Select> : <Badge className="border-slate-200 bg-slate-100 text-slate-700">{item.role.replaceAll('_', ' ')}</Badge>}</td>
                <td className="px-4 py-3 text-slate-600">{editingId === item.id ? <Input aria-label="Edit department" maxLength={120} value={edit.department} onChange={(event) => setEdit({ ...edit, department: event.target.value })} /> : item.department || '—'}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.status}</span></td>
                {canManage ? <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                  {editingId === item.id ? <><Button size="sm" disabled={busy || !edit.fullName.trim() || !edit.email.trim()} onClick={() => void runAction(() => updateMutation.mutateAsync({ id: item.id, values: edit }))}>{updateMutation.isPending ? 'Saving…' : 'Save'}</Button><Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button></> : <Button size="sm" variant="secondary" disabled={busy} onClick={() => startEdit(item)}>Edit</Button>}
                  <Button size="sm" variant={item.isActive ? 'danger' : 'secondary'} disabled={busy || (item.id === currentUser?.id && item.isActive)} onClick={() => {
                    const next = !item.isActive
                    if (window.confirm(`${next ? 'Reactivate' : 'Deactivate'} ${item.fullName}'s account?`)) void runAction(() => statusMutation.mutateAsync({ id: item.id, isActive: next }))
                  }}>{item.isActive ? 'Deactivate' : 'Reactivate'}</Button>
                </div></td> : null}
              </tr>)}
            </tbody>
          </Table>
        </TableContainer>
      ) : null}
    </div>
  )
}
