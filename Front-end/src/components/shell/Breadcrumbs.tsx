import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const toReadableLabel = (segment: string) =>
  segment
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const Breadcrumbs = () => {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/dashboard" className="hover:text-slate-700">
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const url = `/${segments.slice(0, index + 1).join('/')}`
          const isLast = index === segments.length - 1

          return (
            <li key={url} className="inline-flex items-center gap-1.5">
              <ChevronRight className="size-3" />
              {isLast ? (
                <span className="font-medium text-slate-700">{toReadableLabel(segment)}</span>
              ) : (
                <Link to={url} className="hover:text-slate-700">
                  {toReadableLabel(segment)}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
