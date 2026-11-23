import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-slate-300 transition focus:ring-2',
      className,
    )}
    {...props}
  />
)
