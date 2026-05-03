import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { getAuthUser, hasAuthSession, isAdminUser } from '../../../services/api'
import { appNavItems } from '../student-core'

export function AppSidebar({
  active,
}: {
  active: 'dashboard' | 'search' | 'saved' | 'history' | 'profile' | 'roadmap' | 'compare' | 'hub' | 'none'
}) {
  const isAuthenticated = hasAuthSession()
  const currentUser = getAuthUser()
  const showAdminLink = isAuthenticated && isAdminUser(currentUser)
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
        {showAdminLink ? (
          <Link className="app-sidebar__admin-link" to="/admin">
            <span className="app-sidebar__icon">
              <AppFaIcon icon={appIcons.admin} />
            </span>
            <span className="app-sidebar__label">Quản trị</span>
          </Link>
        ) : null}
      </nav>
    </aside>
  )
}
