import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorState, LoadingState } from '../components/ui/State'
import { Table, TableContainer } from '../components/ui/Table'

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const getLocation = () => new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('This browser does not provide location services.'))
  navigator.geolocation.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? 'Allow location access to record attendance.' : 'Could not determine your location. Try again outside or check device location settings.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  )
})

type PolicyDraft = { officeName: string; latitude: string; longitude: string; radiusMeters: string; graceMinutes: string }

export const AttendancePage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const todayQuery = useQuery({ queryKey: ['attendance', 'today'], queryFn: api.attendance.getToday, refetchInterval: 60000 })
  const isAdmin = user?.permissions.includes('attendance.manage') ?? false
  const [selectedDate, setSelectedDate] = useState(today())
  const recordsQuery = useQuery({ queryKey: ['attendance', 'records', selectedDate], queryFn: () => api.attendance.getRecords(selectedDate), enabled: isAdmin })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [outsideOffice, setOutsideOffice] = useState(false)
  const [draft, setDraft] = useState<PolicyDraft | null>(null)
  const policy = todayQuery.data?.policy
  const policyDraft: PolicyDraft = draft ?? {
    officeName: policy?.officeName ?? 'Main office',
    latitude: policy?.latitude == null ? '' : String(policy.latitude),
    longitude: policy?.longitude == null ? '' : String(policy.longitude),
    radiusMeters: String(policy?.radiusMeters ?? 150),
    graceMinutes: String(policy?.graceMinutes ?? 15),
  }
  const shift = todayQuery.data?.shift
  const attendance = todayQuery.data?.attendance
  const needsReport = Boolean(shift && attendance?.checkInAt && user?.id === shift.outgoingStaffId && !todayQuery.data?.handoverSubmitted)

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] }),
    queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] }),
  ])
  const policyMutation = useMutation({ mutationFn: api.attendance.updatePolicy, onSuccess: () => { setDraft(null); setMessage('Office attendance settings saved.'); setError(''); void refresh() } })
  const checkMutation = useMutation({
    mutationFn: async ({ action, mode }: { action: 'check-in' | 'check-out'; mode: 'AUTO' | 'MANUAL' }) => {
      const coords = await getLocation()
      return action === 'check-in' ? api.attendance.checkIn({ ...coords, mode }) : api.attendance.checkOut({ ...coords, mode })
    },
    onSuccess: (result) => { setMessage(`${result.status.replaceAll('_', ' ')} attendance recorded at ${new Date(result.at.replace(' ', 'T')).toLocaleTimeString()}.`); setError(''); void refresh() },
    onError: (reason) => { setMessage(''); setError(reason instanceof Error ? reason.message : 'Attendance could not be recorded.') },
  })

  useEffect(() => {
    if (!policy?.configured || !attendance?.checkInAt || !needsReport || !navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition((position) => {
      const radians = Math.PI / 180
      const lat1 = policy.latitude! * radians
      const lat2 = position.coords.latitude * radians
      const dLat = lat2 - lat1
      const dLng = (position.coords.longitude - policy.longitude!) * radians
      const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
      if (distance > policy.radiusMeters) setOutsideOffice(true)
    }, () => undefined, { enableHighAccuracy: false, maximumAge: 30000 })
    return () => navigator.geolocation.clearWatch(watchId)
  }, [attendance?.checkInAt, needsReport, policy])

  const geoConfigured = policy?.configured ?? false
  const recordRows = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data])

  if (todayQuery.isLoading) return <LoadingState message="Loading attendance details…" />
  if (todayQuery.error) return <ErrorState message={todayQuery.error.message} onRetry={() => { void todayQuery.refetch() }} />

  const saveOfficeFromDevice = async () => {
    setError(''); setMessage('')
    try {
      const coords = await getLocation()
      setDraft({ ...policyDraft, latitude: String(coords.latitude), longitude: String(coords.longitude) })
      setMessage('Office coordinates captured from this device. Confirm the office radius and save.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read office location.') }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Attendance" description="Location-verified check-in, check-out, and shift handover reminders." />
      {error ? <ErrorState message={error} /> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p> : null}
      {outsideOffice && needsReport ? <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">You appear to be outside the office area and your shift report has not been submitted. Please update the handover for the incoming staff. <Link className="font-semibold underline" to="/handovers/create">Open shift report</Link></p> : null}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Your shift today</h2>
        {!shift ? <p className="mt-2 text-sm text-slate-600">No shift is assigned to your account today.</p> : <>
          <p className="mt-2 text-sm text-slate-700">{shift.name} · {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)} · {shift.team}</p>
          {!geoConfigured ? <p className="mt-3 text-sm text-amber-800">The office location has not been configured. Ask an administrator to set the office geofence before checking in.</p> : null}
          {attendance?.checkInAt ? <p className="mt-3 text-sm text-slate-700">Checked in {attendance.checkInStatus?.replaceAll('_', ' ').toLowerCase()} at {new Date(attendance.checkInAt.replace(' ', 'T')).toLocaleTimeString()} ({attendance.checkInMode?.toLowerCase()}).</p> : <p className="mt-3 text-sm text-slate-600">Automatic check-in is available through {policy?.graceMinutes ?? 15} minutes after the scheduled start. Later arrivals must check in manually and are marked late.</p>}
          {attendance?.checkOutAt ? <p className="mt-1 text-sm text-slate-700">Checked out {attendance.checkOutStatus?.toLowerCase()} at {new Date(attendance.checkOutAt.replace(' ', 'T')).toLocaleTimeString()}.</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {!attendance?.checkInAt ? <Button disabled={!geoConfigured || checkMutation.isPending} onClick={() => checkMutation.mutate({ action: 'check-in', mode: todayQuery.data?.canAutoCheckIn ? 'AUTO' : 'MANUAL' })}>{checkMutation.isPending ? 'Checking location…' : todayQuery.data?.canAutoCheckIn ? 'Check in with location' : 'Manual check-in (late)'}</Button> : null}
            {attendance?.checkInAt && !attendance.checkOutAt && !todayQuery.data?.shouldAskOvertime ? <Button variant="secondary" disabled={!geoConfigured || checkMutation.isPending} onClick={() => checkMutation.mutate({ action: 'check-out', mode: 'MANUAL' })}>{checkMutation.isPending ? 'Checking location…' : attendance.overtimeDecision === 'YES' ? 'Finish overtime and check out' : 'Check out at office'}</Button> : null}
          </div>
          {todayQuery.data?.shouldAskOvertime ? <p className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">Your scheduled shift has ended. Answer the overtime question at the office to record your decision. If you choose overtime, you will remain checked in until you finish and check out.</p> : null}
          {attendance?.overtimeDecision === 'YES' && !attendance.checkOutAt ? <p className="mt-3 text-sm text-slate-600">Overtime is active. Use “Finish overtime and check out” when your overtime work is complete.</p> : null}
          {needsReport ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Before leaving, submit a handover report with completed work, open tasks, incidents, and where the incoming staff should continue. <Link className="font-semibold underline" to="/handovers/create">Submit shift report</Link></p> : null}
          <p className="mt-3 text-xs text-slate-500">Location is checked when you record attendance. This page may monitor movement while open to show the handover reminder; it does not send continuous coordinates to the server.</p>
        </>}
      </Card>

      {isAdmin ? <>
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Office and attendance policy</h2>
          <p className="mt-1 text-sm text-slate-600">Set the office point and allowed radius. The default grace period is 15 minutes; automatic check-in ends after it.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">Office name<Input value={policyDraft.officeName} onChange={(e) => setDraft({ ...policyDraft, officeName: e.target.value })} maxLength={120} /></label>
            <label className="space-y-1 text-sm text-slate-700">Geofence radius (metres)<Input type="number" min={25} max={2000} value={policyDraft.radiusMeters} onChange={(e) => setDraft({ ...policyDraft, radiusMeters: e.target.value })} /></label>
            <label className="space-y-1 text-sm text-slate-700">Latitude<Input type="number" step="any" min={-90} max={90} value={policyDraft.latitude} onChange={(e) => setDraft({ ...policyDraft, latitude: e.target.value })} /></label>
            <label className="space-y-1 text-sm text-slate-700">Longitude<Input type="number" step="any" min={-180} max={180} value={policyDraft.longitude} onChange={(e) => setDraft({ ...policyDraft, longitude: e.target.value })} /></label>
            <label className="space-y-1 text-sm text-slate-700">Check-in grace (minutes)<Input type="number" min={0} max={60} value={policyDraft.graceMinutes} onChange={(e) => setDraft({ ...policyDraft, graceMinutes: e.target.value })} /></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { void saveOfficeFromDevice() }}>Use this device as office point</Button><Button disabled={policyMutation.isPending || !policyDraft.latitude || !policyDraft.longitude} onClick={() => policyMutation.mutate({ officeName: policyDraft.officeName, latitude: Number(policyDraft.latitude), longitude: Number(policyDraft.longitude), radiusMeters: Number(policyDraft.radiusMeters), graceMinutes: Number(policyDraft.graceMinutes) })}>{policyMutation.isPending ? 'Saving…' : 'Save attendance policy'}</Button></div>
        </Card>
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Attendance log</h2><p className="mt-1 text-sm text-slate-600">Review early, on-time, late, and rejected location attempts. Exact coordinates are not retained.</p></div><label className="text-sm text-slate-600">Shift date<Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></label></div>
          {recordsQuery.isLoading ? <LoadingState message="Loading attendance records…" /> : null}
          {recordsQuery.error ? <ErrorState message={recordsQuery.error.message} onRetry={() => { void recordsQuery.refetch() }} /> : null}
          {!recordsQuery.isLoading && !recordsQuery.error && !recordRows.length ? <p className="mt-4 text-sm text-slate-500">No attendance events for this date.</p> : null}
          {recordRows.length ? <div className="mt-4"><TableContainer><Table><thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Staff</th><th className="px-3 py-2">Shift</th><th className="px-3 py-2">Check-in</th><th className="px-3 py-2">Check-out</th><th className="px-3 py-2">Overtime</th><th className="px-3 py-2">Last attempt</th></tr></thead><tbody>{recordRows.map((record) => <tr key={record.id} className="border-t border-slate-200"><td className="px-3 py-2">{record.fullName}</td><td className="px-3 py-2">{record.shiftName}</td><td className="px-3 py-2">{record.checkInAt ? `${record.checkInStatus} · ${new Date(record.checkInAt.replace(' ', 'T')).toLocaleTimeString()}` : 'Not recorded'}</td><td className="px-3 py-2">{record.checkOutAt ? `${record.checkOutStatus} · ${new Date(record.checkOutAt.replace(' ', 'T')).toLocaleTimeString()}` : 'Not recorded'}</td><td className="px-3 py-2">{record.overtimeDecision}</td><td className="px-3 py-2">{record.lastAttemptStatus ? `${record.lastAttemptStatus.replaceAll('_', ' ')} · ${record.lastAttemptDistanceMeters ?? '—'} m` : '—'}</td></tr>)}</tbody></Table></TableContainer></div> : null}
        </Card>
      </> : null}
    </div>
  )
}

export const AttendanceAutoCheckIn = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const attendanceQuery = useQuery({ queryKey: ['attendance', 'today'], queryFn: api.attendance.getToday, refetchInterval: 60000 })
  const tried = useState(() => new Set<string>())[0]
  const [notice, setNotice] = useState('')
  const [decisionBusy, setDecisionBusy] = useState(false)
  const [decisionError, setDecisionError] = useState('')
  useEffect(() => {
    const current = attendanceQuery.data
    const shiftId = current?.shift?.id
    if (!shiftId || !current.policy.configured || !current.canAutoCheckIn || current.attendance?.checkInAt || tried.has(`in-${shiftId}`)) return
    tried.add(`in-${shiftId}`)
    void getLocation().then((location) => api.attendance.checkIn({ ...location, mode: 'AUTO' })).then(() => {
      setNotice('You were automatically checked in for your shift.')
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] })
    }).catch((reason: unknown) => {
      setNotice(reason instanceof Error ? reason.message : 'Automatic check-in could not be completed. Open Attendance to check in manually.')
    })
  }, [attendanceQuery.data, queryClient, tried])
  useEffect(() => {
    const current = attendanceQuery.data
    if (!current?.shift || !current.policy.configured || !current.attendance?.checkInAt || current.handoverSubmitted || !navigator.geolocation || current.shift.outgoingStaffId !== user?.id) return
    const watchId = navigator.geolocation.watchPosition((position) => {
      const radians = Math.PI / 180
      const lat1 = current.policy.latitude! * radians
      const lat2 = position.coords.latitude * radians
      const dLat = lat2 - lat1
      const dLng = (position.coords.longitude - current.policy.longitude!) * radians
      const value = Math.min(1, Math.max(0, Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2))
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
      if (distance > current.policy.radiusMeters) setNotice('You appear to have left the office and your shift report is still pending. Open Attendance to submit it for the incoming staff.')
    }, () => undefined, { enableHighAccuracy: false, maximumAge: 30000 })
    return () => navigator.geolocation.clearWatch(watchId)
  }, [attendanceQuery.data, user?.id])
  const answerOvertime = async (workingOvertime: boolean) => {
    setDecisionBusy(true); setDecisionError(''); setNotice('')
    try {
      const location = await getLocation()
      const result = await api.attendance.decideOvertime({ ...location, workingOvertime })
      setNotice(result.overtimeDecision === 'YES' ? 'Overtime recorded. You remain checked in; check out after overtime.' : 'No overtime recorded. You remain checked in; check out when your work is finished.')
      await queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] })
      await queryClient.invalidateQueries({ queryKey: ['attendance', 'records'] })
    } catch (reason) {
      setDecisionError(reason instanceof Error ? reason.message : 'Could not save your overtime decision.')
    } finally { setDecisionBusy(false) }
  }
  const reportPending = Boolean(attendanceQuery.data?.shift && user?.id === attendanceQuery.data.shift.outgoingStaffId && attendanceQuery.data.attendance?.checkInAt && !attendanceQuery.data.handoverSubmitted)
  return <>
    {notice ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900" role="status">{notice}</div> : null}
    {attendanceQuery.data?.shouldAskOvertime ? <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Your shift has ended. Are you working overtime?</p><p className="mt-1">Your choice is recorded only inside the office boundary. {reportPending ? <>Submit today&apos;s handover report for the incoming staff before leaving. <Link className="font-semibold underline" to="/handovers/create">Open shift report</Link></> : null}</p>{decisionError ? <p className="mt-1 text-rose-700" role="alert">{decisionError}</p> : null}</div><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={decisionBusy} onClick={() => { void answerOvertime(true) }}>{decisionBusy ? 'Saving…' : 'Yes, continue overtime'}</Button><Button size="sm" disabled={decisionBusy} onClick={() => { void answerOvertime(false) }}>{decisionBusy ? 'Saving…' : 'No, check me out'}</Button></div></div></div> : null}
    {reportPending ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">While you are signed in, the app checks whether your device is still inside the office boundary so it can remind you to submit the handover. It does not send continuous coordinates to the server.</div> : null}
  </>
}
