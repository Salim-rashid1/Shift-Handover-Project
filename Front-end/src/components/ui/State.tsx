import { Loader2 } from 'lucide-react'
import { Card } from './Card'

export const LoadingState = ({ message = 'Loading data...' }: { message?: string }) => (
  <Card className="flex items-center gap-3 p-6 text-slate-600">
    <Loader2 className="size-4 animate-spin" />
    <span>{message}</span>
  </Card>
)

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="p-8 text-center">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </Card>
)

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Card className="flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50 p-4">
    <p role="alert" className="text-sm text-rose-800">{message}</p>
    {onRetry ? <button type="button" onClick={onRetry} className="text-sm font-medium text-rose-900 underline">Retry</button> : null}
  </Card>
)
