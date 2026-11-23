import { Badge } from './Badge'
import { cn } from '../../lib/utils'

const styles: Record<string, string> = {
  DRAFT: 'border-slate-300 bg-slate-100 text-slate-700',
  SUBMITTED: 'border-blue-300 bg-blue-100 text-blue-700',
  DELIVERED: 'border-cyan-300 bg-cyan-100 text-cyan-700',
  ACKNOWLEDGED: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  REQUIRES_ATTENTION: 'border-amber-300 bg-amber-100 text-amber-700',
  CLOSED: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  PENDING: 'border-amber-300 bg-amber-100 text-amber-700',
  IN_PROGRESS: 'border-blue-300 bg-blue-100 text-blue-700',
  COMPLETED: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  BLOCKED: 'border-rose-300 bg-rose-100 text-rose-700',
  OVERDUE: 'border-red-300 bg-red-100 text-red-700',
  CARRIED_FORWARD: 'border-purple-300 bg-purple-100 text-purple-700',
  CANCELLED: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  REPORTED: 'border-amber-300 bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'border-blue-300 bg-blue-100 text-blue-700',
  ESCALATED: 'border-red-300 bg-red-100 text-red-700',
  RESOLVED: 'border-emerald-300 bg-emerald-100 text-emerald-700',
}

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge className={cn(styles[status] ?? 'border-slate-300 bg-slate-100 text-slate-700')}>
    {status.replaceAll('_', ' ')}
  </Badge>
)
