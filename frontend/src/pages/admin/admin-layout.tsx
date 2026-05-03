import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../components/icons/font-awesome'
import { clearAuthTokens, getAuthUser } from '../../services/api'
import { adminAvatar, sidebarItems } from './admin-data'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="admin-page-header admin-reveal">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action ? <div className="admin-page-header__action">{action}</div> : null}
    </header>
  )
}

export function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <>
      {isOpen ? <button className="admin-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={onClose} /> : null}
      <aside className={`admin-sidebar${isOpen ? ' is-open' : ''}`}>
        <nav className="admin-sidebar__nav" aria-label="Điều hướng admin">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              onClick={onClose}
            >
              <span className="admin-sidebar__icon">
                <AppFaIcon icon={item.icon} />
              </span>
              <span className="admin-sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

export function AdminTopbar({
  onMenuToggle,
}: {
  onMenuToggle: () => void
}) {
  const navigate = useNavigate()
  const user = getAuthUser()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const displayName = useMemo(() => {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
    return fullName || user?.username || 'Quản trị viên'
  }, [user])

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  function handleMenuNavigation(path: string) {
    setIsMenuOpen(false)
    navigate(path)
  }

  function handleLogout() {
    clearAuthTokens()
    setIsMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="admin-topbar">
      <button className="admin-topbar__menu-toggle" type="button" onClick={onMenuToggle} aria-label="Mở menu">
        <AppFaIcon icon={appIcons.menu} />
      </button>

      <div className="admin-topbar__brand">
        <Link className="brand-mark brand-mark--app" to="/admin/overview">
          EduPath
        </Link>
      </div>



      <div className="admin-topbar__actions">
        <button className="app-topbar__icon-button" type="button" aria-label="Thông báo">
          <AppFaIcon icon={appIcons.notifications} />
        </button>
        <div ref={menuRef} className="app-topbar__menu">
          <button
            className="app-topbar__avatar-button"
            type="button"
            aria-label="Mở menu tài khoản"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            title={displayName}
          >
            <span className="app-topbar__identity">
              <strong>{displayName}</strong>
            </span>
            <div className="app-topbar__avatar">
              <img src={adminAvatar} alt={displayName} />
            </div>
          </button>

          {isMenuOpen ? (
            <div className="app-topbar__menu-panel">
              <button type="button" className="app-topbar__menu-item" onClick={() => handleMenuNavigation('/admin/settings')}>
                <AppFaIcon icon={appIcons.settings} />
                <span>Cài đặt</span>
              </button>
              <button type="button" className="app-topbar__menu-item is-danger" onClick={handleLogout}>
                <AppFaIcon icon={appIcons.logout} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
