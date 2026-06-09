import { Link } from 'react-router-dom'
import { AppFaIcon } from '../../../components/icons/font-awesome'
import { hasAuthSession } from '../../../services/api'
import { appNavItems } from '../student-core'

export function AppMobileNav({
  active,
}: {
  active: 'dashboard' | 'search' | 'saved' | 'history' | 'profile' | 'roadmap' | 'hub' | 'none'
}) {
  const isAuthenticated = hasAuthSession()
  const visibleNavItems = isAuthenticated
    ? appNavItems
    : appNavItems.filter((item) => item.id === 'dashboard')

  return (
    <nav className="app-mobile-nav" aria-label="Điều hướng di động">
      {visibleNavItems.map((item) => (
        <Link key={item.id} className={item.id === active ? 'is-active' : ''} to={item.path}>
          <span className="app-mobile-nav__icon">
            <AppFaIcon icon={item.icon} />
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
