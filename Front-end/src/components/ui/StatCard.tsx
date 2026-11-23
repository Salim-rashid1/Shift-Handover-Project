import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

export const StatCard = ({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  hint?: string
}) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
        <Icon className="size-4" />
      </span>
    </div>
  </Card>
)
