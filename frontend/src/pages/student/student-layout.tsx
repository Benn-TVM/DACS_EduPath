import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../components/icons/font-awesome'
import { clearAuthTokens, getAuthUser, hasAuthSession, isAdminUser } from '../../services/api'
import { appNavItems, appTopbarAvatar, landingNavItems } from './student-core'

export function BrandMark({
  to = '/',
  variant = 'site',
}: {
  to?: string
  variant?: 'site' | 'app'
}) {
  return (
    <Link className={`brand-mark${variant === 'app' ? ' brand-mark--app' : ''}`} to={to}>
      EduPath
    </Link>
  )
}

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

export function AppTopbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  searchButtonLabel,
}: {
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: (event: FormEvent<HTMLFormElement>) => void
  searchPlaceholder?: string
  searchButtonLabel?: string
}) {
  const isAuthenticated = hasAuthSession()
  const currentUser = getAuthUser()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const displayName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ').trim() || currentUser.username
    : 'Người dùng EduPath'

  useEffect(() => {
    if (!isMenuOpen || !isAuthenticated) {
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
  }, [isAuthenticated, isMenuOpen])

  function handleMenuNavigation(path: string) {
    setIsMenuOpen(false)
    navigate(path)
  }

  function handleLogout() {
    clearAuthTokens()
    setIsMenuOpen(false)
    navigate('/dashboard')
  }

  const searchField = searchPlaceholder ? (
    <>
      <span className="app-topbar__search-icon" aria-hidden="true">
        <AppFaIcon icon={appIcons.search} fixedWidth={false} />
      </span>
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
      />
      {searchButtonLabel ? <button type="submit">{searchButtonLabel}</button> : null}
    </>
  ) : null

  return (
    <header className="app-topbar">
      <div className="app-topbar__brand">
        <BrandMark to="/dashboard" variant="app" />
      </div>

      {searchField ? (
        onSearchSubmit ? (
          <form className={`app-topbar__search${searchButtonLabel ? ' has-button' : ''}`} onSubmit={onSearchSubmit}>
            {searchField}
          </form>
        ) : (
          <div className={`app-topbar__search${searchButtonLabel ? ' has-button' : ''}`}>{searchField}</div>
        )
      ) : (
        <div style={{ flex: 1 }} />
      )}

      <div className="app-topbar__actions">
        {isAuthenticated ? (
          <>
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
                  <img src={appTopbarAvatar} alt={displayName} />
                </div>
              </button>

              {isMenuOpen ? (
                <div className="app-topbar__menu-panel">
                  <button type="button" className="app-topbar__menu-item" onClick={() => handleMenuNavigation('/saved-courses')}>
                    <AppFaIcon icon={appIcons.saved} />
                    <span>Khóa học đã lưu</span>
                  </button>
                  <button type="button" className="app-topbar__menu-item" onClick={() => handleMenuNavigation('/search-history')}>
                    <AppFaIcon icon={appIcons.history} />
                    <span>Lịch sử tìm kiếm</span>
                  </button>
                  <button type="button" className="app-topbar__menu-item" onClick={() => handleMenuNavigation('/profile')}>
                    <AppFaIcon icon={appIcons.profile} />
                    <span>Hồ sơ cá nhân</span>
                  </button>
                  <button type="button" className="app-topbar__menu-item" onClick={() => handleMenuNavigation('/settings')}>
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
          </>
        ) : (
          <div className="app-topbar__auth">
            <Link className="app-topbar__auth-link" to="/login">
              Đăng nhập
            </Link>
            <Link className="app-topbar__auth-cta" to="/register">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  function handleCloseMenu() {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className={`site-header${isMobileMenuOpen ? ' is-menu-open' : ''}`}>
      <div className="site-header__inner">
        <BrandMark />

        <nav className="site-nav" aria-label="Điều hướng chính">
          {landingNavItems.map((item, index) => (
            <a key={item.href} className={index === 0 ? 'is-active' : undefined} href={item.href}>
              {item.label}
            </a>
          ))}
          <Link to="/login">Đăng nhập</Link>
          <Link className="nav-cta" to="/register">
            Đăng ký
          </Link>
        </nav>

        <button
          className={`mobile-menu${isMobileMenuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label="Mở menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div className="site-drawer">
          <nav className="site-drawer__nav" aria-label="Điều hướng di động">
            {landingNavItems.map((item, index) => (
              <a
                key={item.href}
                className={index === 0 ? 'is-active' : undefined}
                href={item.href}
                onClick={handleCloseMenu}
              >
                {item.label}
              </a>
            ))}
            <Link to="/login" onClick={handleCloseMenu}>
              Đăng nhập
            </Link>
          </nav>

          <div className="site-drawer__actions">
            <Link className="nav-cta" to="/register" onClick={handleCloseMenu}>
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
