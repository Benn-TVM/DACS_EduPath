import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { clearAuthTokens, getAuthUser, hasAuthSession } from '../../../services/api'
import { appTopbarAvatar } from '../student-core'
import { BrandMark } from './BrandMark'

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
      {onSearchSubmit ? (
        <button
          className="app-topbar__search-icon app-topbar__search-icon--button"
          type="submit"
          aria-label="Tìm kiếm"
        >
          <AppFaIcon icon={appIcons.search} fixedWidth={false} />
        </button>
      ) : (
        <span className="app-topbar__search-icon" aria-hidden="true">
          <AppFaIcon icon={appIcons.search} fixedWidth={false} />
        </span>
      )}
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
      />
      {searchButtonLabel ? (
        <button className="app-topbar__search-submit" type="submit">
          {searchButtonLabel}
        </button>
      ) : null}
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
                  <img
                    src={
                      currentUser?.profile?.avatar
                        ? currentUser.profile.avatar.startsWith('http')
                          ? currentUser.profile.avatar
                          : `http://localhost:8000${currentUser.profile.avatar}`
                        : appTopbarAvatar
                    }
                    alt={displayName}
                  />
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
