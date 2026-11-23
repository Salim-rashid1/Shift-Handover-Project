import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorState } from '../components/ui/State'
import { Select } from '../components/ui/Select'
import type { Role } from '../types'

const accountRoles: Role[] = ['ADMINISTRATOR', 'SUPERVISOR', 'OUTGOING_STAFF', 'INCOMING_STAFF']
const initialForm = { fullName: '', email: '', department: '', requestedRole: 'OUTGOING_STAFF' as Role, password: '', passwordConfirmation: '' }

export const RegisterPage = () => {
  const [form, setForm] = useState(initialForm)
  const registration = useMutation({ mutationFn: api.auth.register })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    registration.mutate(form)
  }

  return (
    <Card className="p-6 sm:p-8">
      {registration.isSuccess ? (
        <div role="status">
          <h1 className="text-2xl font-semibold text-slate-900">Account created</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{registration.data.message}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your account is active. Sign in with the email and password you just registered.</p>
          <Link to="/login" className="mt-5 block"><Button className="w-full">Continue to sign in</Button></Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Create an account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">All portal types are created as active accounts immediately after signup.</p>
          {registration.error ? <div className="mt-4"><ErrorState message={registration.error.message} /></div> : null}
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Full name
              <Input autoComplete="name" maxLength={160} required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Work email
              <Input type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Department or team (optional)
              <Input autoComplete="off" maxLength={120} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Portal / user type
              <Select required value={form.requestedRole} onChange={(event) => setForm({ ...form, requestedRole: event.target.value as Role })}>
                {accountRoles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
              </Select>
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Password (at least 12 characters)
              <Input type="password" autoComplete="new-password" minLength={12} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">Confirm password
              <Input type="password" autoComplete="new-password" minLength={12} required value={form.passwordConfirmation} onChange={(event) => setForm({ ...form, passwordConfirmation: event.target.value })} />
            </label>
            {form.passwordConfirmation && form.password !== form.passwordConfirmation ? <p className="text-sm text-rose-700" role="alert">Passwords do not match.</p> : null}
            <Button className="w-full" type="submit" disabled={registration.isPending || form.password !== form.passwordConfirmation}>
              {registration.isPending ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-slate-600">Already have access? <Link to="/login" className="font-medium text-slate-900 underline">Continue to sign in</Link></p>
          </form>
        </>
      )}
    </Card>
  )
}
