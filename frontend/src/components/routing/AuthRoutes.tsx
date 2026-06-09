import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import api, {
  getAuthUser,
  hasAuthSession,
  isAdminUser,
  saveAuthUser,
  type AuthUser,
} from '../../services/api'

interface AuthRouteProps {
  children?: ReactNode
  redirectTo?: string
}

function getLoginRedirectPath(pathname: string, search: string, redirectTo: string) {
  const next = `${pathname}${search}`
  return `${redirectTo}?next=${encodeURIComponent(next)}`
}

export function RequireAuth({
  children,
  redirectTo = '/login',
}: AuthRouteProps) {
  const location = useLocation()

  if (!hasAuthSession()) {
    return <Navigate to={getLoginRedirectPath(location.pathname, location.search, redirectTo)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RedirectIfAuthenticated({
  children,
  redirectTo = '/dashboard',
}: AuthRouteProps) {
  if (hasAuthSession()) {
    return <Navigate to={redirectTo} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RedirectIfAdmin({
  children,
  redirectTo = '/admin',
}: AuthRouteProps) {
  if (hasAuthSession() && isAdminUser(getAuthUser())) {
    return <Navigate to={redirectTo} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RequireAdmin({
  children,
  redirectTo = '/dashboard',
}: AuthRouteProps) {
  const location = useLocation()
  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden' | 'unauthenticated'>(() => {
    if (!hasAuthSession()) {
      return 'unauthenticated'
    }

    return isAdminUser(getAuthUser()) ? 'ready' : 'loading'
  })

  useEffect(() => {
    if (status !== 'loading') {
      return
    }

    let isMounted = true

    async function verifyAdminAccess() {
      try {
        const response = await api.get<AuthUser>('auth/me/')
        if (!isMounted) {
          return
        }

        saveAuthUser(response.data)
        setStatus(isAdminUser(response.data) ? 'ready' : 'forbidden')
      } catch {
        if (!isMounted) {
          return
        }

        setStatus(hasAuthSession() ? 'forbidden' : 'unauthenticated')
      }
    }

    void verifyAdminAccess()

    return () => {
      isMounted = false
    }
  }, [status])

  if (status === 'loading') {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-screen__spinner" aria-hidden="true" />
        <p>Đang xác thực quyền quản trị...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to={getLoginRedirectPath(location.pathname, location.search, '/login')} replace />
  }

  if (status === 'forbidden') {
    return <Navigate to={redirectTo} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
