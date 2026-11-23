import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useCreateHandoverDraftMutation,
  useIncidentsQuery,
  useHandoverShiftsQuery,
  useSubmitHandoverMutation,
  useTasksQuery,
} from '../hooks/queries'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { EmptyState, LoadingState } from '../components/ui/State'
import { Textarea } from '../components/ui/Textarea'
import type { Priority } from '../types'

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const HandoverCreatePage = () => {
  const navigate = useNavigate()
  const { data: shifts = [], isLoading: shiftsLoading } = useHandoverShiftsQuery()
  const { data: tasks = [], isLoading: tasksLoading } = useTasksQuery()
  const { data: incidents = [], isLoading: incidentsLoading } = useIncidentsQuery()
  const createDraftMutation = useCreateHandoverDraftMutation()
  const submitMutation = useSubmitHandoverMutation()

  const [shiftId, setShiftId] = useState('')
  const [summary, setSummary] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([])
  const [incidentIds, setIncidentIds] = useState<string[]>([])
  const [saveError, setSaveError] = useState('')

  const isLoading = shiftsLoading || tasksLoading || incidentsLoading
  const isSaving = createDraftMutation.isPending || submitMutation.isPending
  const availableShifts = shifts
  const shift = availableShifts.find((item) => item.id === shiftId)

  useEffect(() => {
    if (!shiftId && availableShifts.length) setShiftId(availableShifts[0].id)
    if (shiftId && !availableShifts.some((item) => item.id === shiftId)) setShiftId(availableShifts[0]?.id ?? '')
  }, [availableShifts, shiftId])

  const taskOptions = useMemo(() => tasks.filter((task) => task.shiftId === shiftId), [shiftId, tasks])
  const incidentOptions = useMemo(
    () => incidents.filter((incident) => incident.shiftId === shiftId),
    [incidents, shiftId],
  )

  const toggleSelection = (
    value: string,
    selected: string[],
    setter: (next: string[]) => void,
    opposite?: string[],
    oppositeSetter?: (next: string[]) => void,
  ) => {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
    if (opposite?.includes(value) && oppositeSetter) {
      oppositeSetter(opposite.filter((item) => item !== value))
    }
  }

  const save = async (submit: boolean) => {
    setSaveError('')
    if (!shift || summary.trim().length < 3) {
      setSaveError('Choose a shift and enter a summary of at least 3 characters.')
      return
    }
    if (submit && taskOptions.some((task) => !completedTaskIds.includes(task.id) && !pendingTaskIds.includes(task.id))) {
      setSaveError('Mark each listed shift task as completed or pending before submitting this handover.')
      return
    }

    try {
    const draft = await createDraftMutation.mutateAsync({
      shiftId,
      outgoingStaffId: shift.outgoingStaffId,
      incomingStaffId: shift.incomingStaffId,
      date: shift.date,
      priority,
      submittedAt: undefined,
      acknowledgedAt: undefined,
      summary,
      additionalNotes,
      completedTaskIds,
      pendingTaskIds,
      incidentIds,
    })

    if (submit) {
      await submitMutation.mutateAsync(draft.id)
    }

    navigate(`/handovers/${draft.id}`)
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Could not save handover.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Handover"
        description="Capture shift information, summary, tasks, incidents, and priorities."
      />

      {isLoading ? <LoadingState message="Preparing handover form..." /> : null}

      {!isLoading && !availableShifts.length ? (
        <EmptyState
          title="No shifts are available yet"
          description="There are no company shifts to attach this handover to yet. Ask an administrator to create a shift, then come back here."
        />
      ) : null}

      {!isLoading && availableShifts.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="space-y-4 xl:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">Handover details</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Shift</label>
                <Select value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
                  {availableShifts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Priority
                </label>
                <Select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Summary</label>
              <Textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Document completed work, unresolved risks, and critical instructions."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Additional notes
              </label>
              <Textarea
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                placeholder="Optional context for incoming team."
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Shift information</h2>
            {shift ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{shift.name}</p>
                <p>Team: {shift.team}</p>
                <p>
                  Window: {shift.startTime} - {shift.endTime}
                </p>
                <p>Date: {shift.date}</p>
                <p>Outgoing staff ID: {shift.outgoingStaffId}</p>
                <p>Incoming staff ID: {shift.incomingStaffId}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Select a shift to continue.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Completed tasks</h2>
            <div className="mt-2 space-y-2">
              {taskOptions.length ? (
                taskOptions.map((task) => (
                  <label key={task.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={completedTaskIds.includes(task.id)}
                      onChange={() =>
                        toggleSelection(
                          task.id,
                          completedTaskIds,
                          setCompletedTaskIds,
                          pendingTaskIds,
                          setPendingTaskIds,
                        )
                      }
                    />
                    <span>{task.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-600">No tasks available for selected shift.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Pending tasks</h2>
            <div className="mt-2 space-y-2">
              {taskOptions.length ? (
                taskOptions.map((task) => (
                  <label key={task.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={pendingTaskIds.includes(task.id)}
                      onChange={() =>
                        toggleSelection(
                          task.id,
                          pendingTaskIds,
                          setPendingTaskIds,
                          completedTaskIds,
                          setCompletedTaskIds,
                        )
                      }
                    />
                    <span>{task.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-600">No tasks available for selected shift.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-900">Incidents</h2>
            <div className="mt-2 space-y-2">
              {incidentOptions.length ? (
                incidentOptions.map((incident) => (
                  <label key={incident.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={incidentIds.includes(incident.id)}
                      onChange={() => toggleSelection(incident.id, incidentIds, setIncidentIds)}
                    />
                    <span>{incident.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-600">No incidents reported for selected shift.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {availableShifts.length ? <div className="flex flex-wrap gap-2">
        {saveError ? <p role="alert" className="w-full text-sm text-rose-700">{saveError}</p> : null}
        <Button
          variant="secondary"
          disabled={isSaving || !shift || !summary.trim()}
          onClick={() => void save(false)}
        >
          Save Draft
        </Button>
        <Button disabled={isSaving || !shift || !summary.trim()} onClick={() => void save(true)}>
          Submit Handover
        </Button>
      </div> : <Link className="text-sm font-medium text-slate-700 underline" to="/handovers">Back to handovers</Link>}
    </div>
  )
}
