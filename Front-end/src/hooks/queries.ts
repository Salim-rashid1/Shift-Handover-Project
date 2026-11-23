import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import type { Handover, Incident, Task } from '../types'

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  users: ['users'] as const,
  directory: ['directory'] as const,
  shifts: ['shifts'] as const,
  handoverShifts: ['handover-shifts'] as const,
  shift: (id: string) => ['shift', id] as const,
  handovers: ['handovers'] as const,
  handover: (id: string) => ['handover', id] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['task', id] as const,
  incidents: ['incidents'] as const,
  incident: (id: string) => ['incident', id] as const,
  notifications: ['notifications'] as const,
  activity: ['activity'] as const,
}

export const useCurrentUserQuery = () =>
  useQuery({ queryKey: queryKeys.me, queryFn: api.auth.getCurrentUser, retry: false, staleTime: 30_000 })

export const useDashboardQuery = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: api.dashboard.get })

export const useUsersQuery = (enabled = true) =>
  useQuery({ queryKey: queryKeys.users, queryFn: api.users.getAll, enabled })

export const useDirectoryQuery = () =>
  useQuery({ queryKey: queryKeys.directory, queryFn: api.directory.getVisible })

export const useShiftsQuery = () =>
  useQuery({ queryKey: queryKeys.shifts, queryFn: api.shifts.getAll })

export const useHandoverShiftsQuery = () =>
  useQuery({ queryKey: queryKeys.handoverShifts, queryFn: api.handoverShifts.getAll })

export const useShiftQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.shift(id),
    queryFn: () => api.shifts.getById(id),
  })

export const useHandoversQuery = () =>
  useQuery({ queryKey: queryKeys.handovers, queryFn: api.handovers.getAll })

export const useHandoverQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.handover(id),
    queryFn: () => api.handovers.getById(id),
  })

export const useCreateHandoverDraftMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Handover, 'id' | 'status'>) =>
      api.handovers.createDraft(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.handovers })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export const useUpdateHandoverMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Handover> }) => api.handovers.update(id, updates),
    onSuccess: (handover) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.handovers })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.setQueryData(queryKeys.handover(handover.id), handover)
    },
  })
}

export const useSubmitHandoverMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.handovers.submit(id),
    onSuccess: (handover) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.handovers })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.setQueryData(queryKeys.handover(handover.id), handover)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity })
    },
  })
}

export const useAcknowledgeHandoverMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.handovers.acknowledge(id),
    onSuccess: (handover) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.handovers })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.setQueryData(queryKeys.handover(handover.id), handover)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity })
    },
  })
}

export const useTasksQuery = () =>
  useQuery({ queryKey: queryKeys.tasks, queryFn: api.tasks.getAll })

export const useTaskQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => api.tasks.getById(id),
  })

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.tasks.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.tasks.update(id, updates),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.setQueryData(queryKeys.task(task.id), task)
      queryClient.invalidateQueries({ queryKey: queryKeys.handovers })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity })
    },
  })
}

export const useIncidentsQuery = () =>
  useQuery({ queryKey: queryKeys.incidents, queryFn: api.incidents.getAll })

export const useIncidentQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.incident(id),
    queryFn: () => api.incidents.getById(id),
  })

export const useReportIncidentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.incidents.report(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export const useUpdateIncidentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Incident> }) => api.incidents.update(id, updates),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.setQueryData(queryKeys.incident(incident.id), incident)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity })
    },
  })
}

export const useNotificationsQuery = () =>
  useQuery({ queryKey: queryKeys.notifications, queryFn: api.notifications.getForCurrentUser })

export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}

export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}

export const useActivityQuery = () =>
  useQuery({ queryKey: queryKeys.activity, queryFn: api.activity.getRecent })
