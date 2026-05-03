import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { landingNavItems } from '../student-core'
import { BrandMark } from './BrandMark'

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
