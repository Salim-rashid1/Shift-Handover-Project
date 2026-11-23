import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { administrativeNavigation, mainNavigation } from '../../routes/routeMeta'

const filterByPermission = (permissions: string[], items: typeof mainNavigation) =>
  items.filter((item) => permissions.includes(item.permission))

interface SidebarNavigationProps {
  permissions: string[]
  mobile?: boolean
  onNavigate?: () => void
}

export const SidebarNavigation = ({ permissions, mobile = false, onNavigate }: SidebarNavigationProps) => {
  const primaryItems = filterByPermission(permissions, mainNavigation)
  const adminItems = filterByPermission(permissions, administrativeNavigation)

  return (
    <nav className={cn('space-y-5', mobile && 'pt-1')}>
      <section>
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Operations
        </p>
        <ul className="space-y-1">
          {primaryItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </section>

      {adminItems.length ? (
        <section>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Administration
          </p>
          <ul className="space-y-1">
            {adminItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </nav>
  )
}
