import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navItems } from '../../constants/navigation'
import { cn } from '../../lib/utils'

export const Sidebar = ({
  permissions,
  open,
  onClose,
}: {
  permissions: string[]
  open: boolean
  onClose: () => void
}) => {
  const links = navItems.filter((item) => permissions.includes(item.permission))

  return (
    <>
      <div className="hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="border-b border-slate-800 p-5">
          <p className="text-xs tracking-widest text-slate-400">SHIFT HANDOVER</p>
          <h2 className="mt-1 text-lg font-semibold">Operations Console</h2>
        </div>
        <nav className="p-3">
          {links.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900',
                  )
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 p-3 text-white transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
          <p className="font-semibold">Operations Console</p>
          <button type="button" className="rounded p-1 hover:bg-slate-800" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <nav>
          {links.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path + item.label + '_mobile'}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900',
                  )
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
