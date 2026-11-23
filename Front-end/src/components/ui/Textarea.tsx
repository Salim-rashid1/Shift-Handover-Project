import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      'min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2',
      className,
    )}
    {...props}
  />
)
