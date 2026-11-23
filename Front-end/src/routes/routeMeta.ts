import {
  Bell,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MapPinCheck,
  ScrollText,
  Siren,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface NavItemMeta {
  label: string
  path: string
  icon: LucideIcon
  permission: string
  description: string
}

export const mainNavigation: NavItemMeta[] = [
  {
    label: 'Attendance',
    path: '/attendance',
    icon: MapPinCheck,
    permission: 'attendance.view',
    description: 'Location-verified shift check-in and check-out.',
  },
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
    description: 'Operational overview entry point.',
  },
  {
    label: 'My Shift',
    path: '/my-shift',
    icon: Workflow,
    permission: 'shifts.view',
    description: 'Current shift workspace.',
  },
  {
    label: 'Handovers',
    path: '/handovers',
    icon: ClipboardCheck,
    permission: 'handovers.view',
    description: 'Shift handover records.',
  },
  {
    label: 'Tasks',
    path: '/tasks',
    icon: ClipboardList,
    permission: 'tasks.view',
    description: 'Task tracking module.',
  },
  {
    label: 'Incidents',
    path: '/incidents',
    icon: Siren,
    permission: 'incidents.view',
    description: 'Incident reporting module.',
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: Bell,
    permission: 'notifications.view_own',
    description: 'Notification center.',
  },
]

export const administrativeNavigation: NavItemMeta[] = [
  {
    label: 'Users',
    path: '/users',
    icon: Users,
    permission: 'users.view',
    description: 'Review staff accounts and role assignments.',
  },
  {
    label: 'Shifts',
    path: '/shifts',
    icon: Workflow,
    permission: 'shifts.view_all',
    description: 'Shift schedule, status, and staffing visibility.',
  },
  {
    label: 'Audit Log',
    path: '/audit-log',
    icon: ScrollText,
    permission: 'audit.view',
    description: 'Audit and activity trail.',
  },
]
