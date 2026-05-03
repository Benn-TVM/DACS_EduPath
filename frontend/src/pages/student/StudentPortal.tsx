import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './styles/shared.css'
import { RedirectIfAuthenticated, RequireAuth } from '../../components/routing/AuthRoutes'
import {
  ComparePage,
  CourseDetailPage,
  DashboardPage,
  ProfilePage,
  RoadmapPage,
  SavedCoursesPage,
  SearchHistoryPage,
  SearchPage,
  SettingsPage,
  StudentHubPage,
} from './app-pages'
import { LoginPage, OnboardingPage, RegisterPage } from './public-pages'

function StudentPortal() {
  const location = useLocation()
  const previousLocation = useRef(location)

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'

  useEffect(() => {
    if (!isAuthRoute) {
      previousLocation.current = location
    }
  }, [location, isAuthRoute])

  const backgroundLocation = isAuthRoute ? previousLocation.current : location

  return (
    <>
      <Routes location={backgroundLocation}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/hub" element={<StudentHubPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/saved-courses" element={<SavedCoursesPage />} />
          <Route path="/search-history" element={<SearchHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthRoute && (
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
