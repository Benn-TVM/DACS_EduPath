import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './styles/shared.css'
import { RedirectIfAuthenticated, RequireAuth } from '../../components/routing/AuthRoutes'
import { hasAuthSession } from '../../services/api'
import {
  CourseDetailPage,
  DashboardPage,
  ProfilePage,
  RoadmapPage,
  SavedCoursesPage,
  SearchHistoryPage,
  SearchPage,
  StudentHubPage,
} from './app-pages'
import { LoginPage, OnboardingPage, RegisterPage } from './public-pages'

// Các route yêu cầu đăng nhập (nằm trong RequireAuth)
const PROTECTED_PATHS = [
  '/onboarding',
  '/roadmap',
  '/hub',
  '/search',
  '/saved-courses',
  '/search-history',
  '/profile',
  '/courses/',
]

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p))
}

const DASHBOARD_BACKGROUND_LOCATION = {
  pathname: '/dashboard',
  search: '',
  hash: '',
  state: null,
  key: 'dashboard-background',
}

function StudentPortal() {
  const location = useLocation()
  const navigate = useNavigate()

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'
  const isProtectedAndGuest = isProtectedPath(location.pathname) && !hasAuthSession()

  // Khi user chưa đăng nhập mà truy cập protected route (VD: click vào khóa học),
  // redirect ngay sang /login?next=... để tránh URL lạ như /courses/login
  useEffect(() => {
    if (isProtectedAndGuest) {
      const next = `${location.pathname}${location.search}`
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
    }
  }, [isProtectedAndGuest, location.pathname, location.search, navigate])
  // Dùng previousLocation khi:
  // 1. Đang ở trang auth (login/register) → giữ trang phía sau
  // 2. Đang ở route protected mà chưa đăng nhập → đang redirect sang /login,
  //    giữ trang trước đó để Dashboard không bị unmount/remount (flicker)
  const shouldKeepBackground = isAuthRoute || isProtectedAndGuest

  const backgroundLocation = shouldKeepBackground
    ? DASHBOARD_BACKGROUND_LOCATION
    : location

  // Hiển thị modal login/register khi:
  // - URL là /login hoặc /register
  // - HOẶC đang ở protected route mà chưa đăng nhập (trong khi chờ redirect)
  const showAuthModal = isAuthRoute || isProtectedAndGuest

  return (
    <>
      <Routes location={backgroundLocation}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/hub" element={<StudentHubPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/saved-courses" element={<SavedCoursesPage />} />
          <Route path="/search-history" element={<SearchHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showAuthModal && (
        <Routes>
          <Route element={<RedirectIfAuthenticated redirectTo="/dashboard" />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Routes>
      )}
    </>
  )
}

export default StudentPortal
