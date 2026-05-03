import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import '../student/styles/shared.css'
import './admin-portal.css'
import { CoursesPage, OverviewPage, ReportsPage, SettingsPage, TaxonomyPage, UsersPage } from './admin-pages'
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
            <Route path="overview" element={<OverviewPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="taxonomy" element={<TaxonomyPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AdminPortal
