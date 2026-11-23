import type { IncidentSeverity } from '../../types'
import { Badge } from './Badge'

const styles: Record<IncidentSeverity, string> = {
  LOW: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  MEDIUM: 'border-blue-300 bg-blue-100 text-blue-700',
  HIGH: 'border-amber-300 bg-amber-100 text-amber-700',
  CRITICAL: 'border-rose-300 bg-rose-100 text-rose-700',
}

export const SeverityBadge = ({ severity }: { severity: IncidentSeverity }) => (
  <Badge className={styles[severity]}>{severity}</Badge>
)
