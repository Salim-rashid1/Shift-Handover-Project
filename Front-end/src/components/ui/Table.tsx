import type { HTMLAttributes, TableHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const TableContainer = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('overflow-x-auto rounded-xl border border-slate-200', className)} {...props} />
)

export const Table = ({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full min-w-[720px] text-left text-sm', className)} {...props} />
)
