import type { AttendancePolicy, AttendanceRecord, AttendanceToday, AuditActivity, Handover, Incident, Notification, RegistrationInput, Shift, Task, User, UserCreateInput, Role, UserReference } from '../types'

const apiRoot = 'http://localhost/backend/public/index.php?route='

function apiUrl(path: string): string {
  const queryIndex = path.indexOf('?')
  const route = queryIndex === -1 ? path : path.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : path.slice(queryIndex + 1)

  return `${apiRoot}${encodeURIComponent(route)}${query ? `&${query}` : ''}`
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new Error(`Could not reach the API at ${apiUrl(path)}. Check the hosted API service and its CORS settings.`)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      window.dispatchEvent(new Event('salim:auth-expired'))
    }
    throw new ApiError(data.error ?? `Request failed (${response.status})`, response.status)
  }
  return data as T
}

const json = (method: string, value?: unknown): RequestInit => ({
  method,
  ...(value === undefined ? {} : { body: JSON.stringify(value) }),
})

const stringIds = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return value.split(',').map((id) => id.trim()).filter(Boolean)
    }
    return []
  }
  if (value && typeof value === 'object') return Object.values(value).map(String)
  return []
}

function normalizeHandover(value: unknown): Handover {
  const handover = value as Handover
  return {
    ...handover,
    completedTaskIds: stringIds(handover.completedTaskIds),
    pendingTaskIds: stringIds(handover.pendingTaskIds),
    incidentIds: stringIds(handover.incidentIds),
  }
}

export interface DashboardSummary {
  metrics: {
    activeShifts: number
    pendingHandovers: number
    openTasks: number
    overdueTasks: number
    criticalIncidents: number
  }
  recentHandovers: Handover[]
  recentTasks: Task[]
  recentIncidents: Incident[]
}

export const api = {
  auth: {
    async login(email: string, password: string, role: Role): Promise<User> {
      const result = await request<{ user: User }>('/auth/login', json('POST', { email, password, role }))
      return result.user
    },
    async getCurrentUser(): Promise<User | null> {
      try {
        return await request<User | null>('/auth/me')
      } catch (error) {
        // Older hosted API builds return 401 for an anonymous session instead of JSON null.
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    logout: () => request<{ ok: boolean }>('/auth/logout', json('POST')),
    changePassword: (currentPassword: string, newPassword: string) => request<{ ok: boolean }>('/auth/password', json('POST', { currentPassword, newPassword })),
    register: (payload: RegistrationInput) => request<{ message: string; requiresApproval: boolean }>('/auth/register', json('POST', payload)),
  },
  dashboard: { get: () => request<DashboardSummary>('/dashboard') },
  users: {
    getAll: () => request<User[]>('/users'),
    create: (payload: UserCreateInput) => request<User>('/users', json('POST', payload)),
    update: (id: string, payload: Pick<User, 'fullName' | 'email' | 'department'>) => request<User>(`/users/${id}`, json('PATCH', payload)),
    setRole: (id: string, role: Role) => request<User>(`/users/${id}/role`, json('PATCH', { role })),
    setActive: (id: string, isActive: boolean) => request<User>(`/users/${id}/status`, json('PATCH', { isActive })),
  },
  directory: { getVisible: () => request<UserReference[]>('/directory') },
  shifts: {
    getAll: () => request<Shift[]>('/shifts'),
    getById: (id: string) => request<Shift>(`/shifts/${id}`),
    create: (payload: { name: string; team: string; date: string; startTime: string; endTime: string; supervisorId: string; outgoingStaffId: string; incomingStaffId: string }) => request<Shift>('/shifts', json('POST', payload)),
    update: (id: string, updates: { startTime?: string; endTime?: string; supervisorId?: string; outgoingStaffId?: string; incomingStaffId?: string }) => request<Shift>(`/shifts/${id}`, json('PATCH', updates)),
  },
  attendance: {
    getToday: () => request<AttendanceToday>('/attendance/today'),
    updatePolicy: (policy: Pick<AttendancePolicy, 'officeName' | 'latitude' | 'longitude' | 'radiusMeters' | 'graceMinutes'>) => request<{ ok: boolean }>('/attendance/settings', json('PATCH', policy)),
    checkIn: (location: { latitude: number; longitude: number; mode: 'AUTO' | 'MANUAL' }) => request<{ ok: boolean; status: string; at: string }>('/attendance/check-in', json('POST', location)),
    checkOut: (location: { latitude: number; longitude: number; mode: 'AUTO' | 'MANUAL' }) => request<{ ok: boolean; status: string; at: string }>('/attendance/check-out', json('POST', location)),
    decideOvertime: (decision: { workingOvertime: boolean; latitude: number; longitude: number }) => request<{ ok: boolean; overtimeDecision: 'YES' | 'NO'; checkedOut: boolean }>('/attendance/overtime', json('POST', decision)),
    getRecords: (date: string) => request<AttendanceRecord[]>(`/attendance/records?date=${encodeURIComponent(date)}`),
  },
  handovers: {
    getAll: async () => (await request<unknown[]>('/handovers')).map(normalizeHandover),
    getById: async (id: string) => normalizeHandover(await request<unknown>(`/handovers/${id}`)),
    createDraft: async (payload: Omit<Handover, 'id' | 'status'>) => normalizeHandover(await request<unknown>('/handovers', json('POST', payload))),
    update: async (id: string, updates: Partial<Handover>) => normalizeHandover(await request<unknown>(`/handovers/${id}`, json('PATCH', updates))),
    submit: async (id: string) => normalizeHandover(await request<unknown>(`/handovers/${id}/submit`, json('POST'))),
    acknowledge: async (id: string) => normalizeHandover(await request<unknown>(`/handovers/${id}/acknowledge`, json('POST'))),
  },
  handoverShifts: { getAll: () => request<Shift[]>('/handover-shifts') },
  tasks: {
    getAll: () => request<Task[]>('/tasks'),
    getById: (id: string) => request<Task>(`/tasks/${id}`),
    create: (payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => request<Task>('/tasks', json('POST', payload)),
    update: (id: string, updates: Partial<Task>) => request<Task>(`/tasks/${id}`, json('PATCH', updates)),
  },
  incidents: {
    getAll: () => request<Incident[]>('/incidents'),
    getById: (id: string) => request<Incident>(`/incidents/${id}`),
    report: (payload: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => request<Incident>('/incidents', json('POST', payload)),
    update: (id: string, updates: Partial<Incident>) => request<Incident>(`/incidents/${id}`, json('PATCH', updates)),
  },
  notifications: {
    getForCurrentUser: () => request<Notification[]>('/notifications'),
    markAsRead: (id: string) => request<{ ok: boolean }>(`/notifications/${id}/read`, json('POST')),
    markAllAsRead: () => request<{ ok: boolean }>('/notifications/read-all', json('POST')),
  },
  activity: { getRecent: () => request<AuditActivity[]>('/activity') },
}
