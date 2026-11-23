export type Role =
  | 'ADMINISTRATOR'
  | 'SUPERVISOR'
  | 'OUTGOING_STAFF'
  | 'INCOMING_STAFF'

export type ShiftStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'

export type HandoverStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'REQUIRES_ATTENTION'
  | 'CLOSED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'OVERDUE'
  | 'CARRIED_FORWARD'
  | 'CANCELLED'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'

export interface User {
  id: string
  fullName: string
  email: string
  role: Role
  department: string
  avatarUrl?: string
  isActive: boolean
  status: 'ACTIVE' | 'DEACTIVATED'
  permissions: string[]
  defaultRoute: string
  createdAt: string
}

export interface UserReference {
  id: string
  fullName: string
  role: Role
  department: string
}

export interface UserCreateInput {
  fullName: string
  email: string
  password: string
  role: Role
  department: string
}

export interface RegistrationRequest {
  id: string
  fullName: string
  email: string
  department: string
  requestedRole: Role
  status: 'PENDING'
  createdAt: string
}

export interface RegistrationInput {
  fullName: string
  email: string
  password: string
  passwordConfirmation: string
  department: string
  requestedRole: Role
}

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  date: string
  team: string
  status: ShiftStatus
  supervisorId: string
  outgoingStaffId: string
  incomingStaffId: string
}

export interface AttendancePolicy {
  officeName: string
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  graceMinutes: number
  configured: boolean
}

export interface AttendanceToday {
  shift: Shift | null
  attendance: {
    checkInAt: string | null
    checkInStatus: 'EARLY' | 'ON_TIME' | 'LATE' | null
    checkInMode: 'AUTO' | 'MANUAL' | null
    checkOutAt: string | null
    checkOutStatus: 'EARLY' | 'ON_TIME' | 'LATE' | null
    checkOutMode: 'AUTO' | 'MANUAL' | null
    overtimeDecision: 'PENDING' | 'YES' | 'NO'
    lastAttemptStatus: string | null
  } | null
  policy: AttendancePolicy
  handoverSubmitted: boolean
  canAutoCheckIn: boolean
  shouldAskOvertime: boolean
}

export interface AttendanceRecord {
  id: string
  shiftId: string
  shiftName: string
  userId: string
  fullName: string
  checkInAt: string | null
  checkInStatus: 'EARLY' | 'ON_TIME' | 'LATE' | null
  checkInMode: 'AUTO' | 'MANUAL' | null
  checkInDistanceMeters: number | null
  checkOutAt: string | null
  checkOutStatus: 'EARLY' | 'ON_TIME' | 'LATE' | null
  checkOutMode: 'AUTO' | 'MANUAL' | null
  checkOutDistanceMeters: number | null
  overtimeDecision: 'PENDING' | 'YES' | 'NO'
  lastAttemptAt: string | null
  lastAttemptStatus: string | null
  lastAttemptDistanceMeters: number | null
}

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  assigneeId: string
  dueDate: string
  shiftId: string
  handoverId?: string
  createdAt: string
  updatedAt: string
}

export interface Incident {
  id: string
  title: string
  category: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  shiftId: string
  reportedById: string
  resolution?: string
  createdAt: string
  updatedAt: string
}

export interface Handover {
  id: string
  shiftId: string
  outgoingStaffId: string
  incomingStaffId: string
  createdById?: string
  date: string
  priority: Priority
  status: HandoverStatus
  submittedAt?: string
  acknowledgedAt?: string
  summary: string
  additionalNotes?: string
  completedTaskIds: string[]
  pendingTaskIds: string[]
  incidentIds: string[]
}

export interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  type: 'HANDOVER' | 'TASK' | 'INCIDENT' | 'SHIFT' | 'SYSTEM'
  userId: string
  createdAt: string
  relatedEntityId?: string
}

export interface AuditActivity {
  id: string
  actorId: string
  actorName: string
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'HANDOVER_SUBMITTED'
    | 'HANDOVER_ACKNOWLEDGED'
    | 'HANDOVER_DRAFT_CREATED'
    | 'HANDOVER_DRAFT_UPDATED'
    | 'TASK_COMPLETED'
    | 'TASK_CARRIED_FORWARD'
    | 'TASK_CREATED'
    | 'TASK_STATUS_CHANGED'
    | 'INCIDENT_REPORTED'
    | 'INCIDENT_ESCALATED'
    | 'INCIDENT_RESOLVED'
    | 'INCIDENT_STATUS_CHANGED'
    | 'SHIFT_STARTED'
  targetType: 'HANDOVER' | 'TASK' | 'INCIDENT' | 'SHIFT' | 'SYSTEM'
  targetId: string
  details: string
  timestamp: string
}
