import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/State'
import { useAuth } from '../hooks/useAuth'
import { Select } from '../components/ui/Select'
import type { Role } from '../types'

const portalRoles: { value: Role; label: string }[] = [
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'OUTGOING_STAFF', label: 'Outgoing staff' },
  { value: 'INCOMING_STAFF', label: 'Incoming staff' },
]

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, isAuthenticated, isLoading, isSessionExpired } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const requestedLocation = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
  const requestedPath = requestedLocation?.pathname
  const canOpenRequestedPath = (permissions: string[]) => {
    if (!requestedPath?.startsWith('/') || requestedPath.startsWith('//') || requestedPath === '/login') return false
    if (requestedPath === '/users') return permissions.includes('users.view')
    if (requestedPath === '/audit-log') return permissions.includes('audit.view')
    if (requestedPath === '/reports' || requestedPath === '/settings') return false
    return ['/dashboard', '/attendance', '/shifts', '/my-shift', '/handovers', '/tasks', '/incidents', '/notifications'].some((path) =>
      requestedPath === path || requestedPath.startsWith(`${path}/`),
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || !email || !password || !role) return
    setBusy(true)
    setError('')
    try {
      const signedIn = await login(email, password, role)
      const destination = canOpenRequestedPath(signedIn.permissions)
        ? `${requestedPath}${requestedLocation?.search ?? ''}${requestedLocation?.hash ?? ''}`
        : signedIn.defaultRoute
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading && !isSessionExpired) return <LoadingState message="Checking your session…" />
  if (isAuthenticated && user) {
    const destination = canOpenRequestedPath(user.permissions)
      ? `${requestedPath}${requestedLocation?.search ?? ''}${requestedLocation?.hash ?? ''}`
      : user.defaultRoute
    return <Navigate to={destination} replace />
  }

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in with your operations account.</p>
      {isSessionExpired ? <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your session expired or could not be verified. Please sign in again.</p> : null}
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <label className="block space-y-1 text-sm font-medium text-slate-700">Portal / user type
          <Select autoComplete="organization-title" required value={role} onChange={(event) => setRole(event.target.value as Role | '')}>
            <option value="" disabled>Select your portal</option>
            {portalRoles.map((portal) => <option key={portal.value} value={portal.value}>{portal.label}</option>)}
          </Select>
        </label>
        <Input type="email" autoComplete="username" placeholder="Email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input type="password" autoComplete="current-password" placeholder="Password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={busy || !email || !password || !role}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-sm text-slate-600">Need an account? <Link to="/register" className="underline">Account access</Link></p>
      </form>
    </Card>
  )
}
