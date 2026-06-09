import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import '../student/styles/shared.css'
import './admin-portal.css'
import { AIOverviewPage, CourseManagerPage, CategoryManagerPage, UserManagerPage, RecommendationLogsPage } from './admin-pages'
import { AdminSidebar, AdminTopbar } from './admin-layout'

function AdminPortal() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="admin-shell">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="admin-workspace">
        <AdminTopbar onMenuToggle={() => setIsSidebarOpen((current) => !current)} />
        <main className="admin-main">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AIOverviewPage />} />
            <Route path="courses" element={<CourseManagerPage />} />
            <Route path="categories" element={<CategoryManagerPage />} />
            <Route path="users" element={<UserManagerPage />} />
            <Route path="logs" element={<RecommendationLogsPage />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AdminPortal
