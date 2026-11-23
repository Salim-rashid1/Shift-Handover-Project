import type { ReactNode } from 'react'
import { Button } from './Button'

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
}: {
  isOpen: boolean
  title: string
  message: ReactNode
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 text-sm text-slate-600">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
