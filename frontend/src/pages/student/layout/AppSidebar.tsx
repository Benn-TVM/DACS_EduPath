import { Link } from 'react-router-dom'
import { AppFaIcon } from '../../../components/icons/font-awesome'
import { hasAuthSession } from '../../../services/api'
import { appNavItems } from '../student-core'

export function AppSidebar({
  active,
}: {
  active: 'dashboard' | 'search' | 'saved' | 'history' | 'profile' | 'roadmap' | 'hub' | 'none'
}) {
  const isAuthenticated = hasAuthSession()
  const visibleNavItems = isAuthenticated
    ? appNavItems
    : appNavItems.filter((item) => item.id === 'dashboard')

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar__nav" aria-label="Điều hướng ứng dụng">
        {visibleNavItems.map((item) => (
          <Link key={item.id} className={item.id === active ? 'is-active' : ''} to={item.path}>
            <span className="app-sidebar__icon">
              <AppFaIcon icon={item.icon} />
            </span>
            <span className="app-sidebar__label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
