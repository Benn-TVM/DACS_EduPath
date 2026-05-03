import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './components/routing/AuthRoutes'

const StudentPortal = lazy(() => import('./pages/student/StudentPortal'))
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'))

function App() {
  return (
    <Suspense
      fallback={
        <div className="app-loading-screen">
          <div className="app-loading-screen__spinner" aria-hidden="true" />
          <p>Đang tải giao diện EduPath...</p>
        </div>
      }
    >
      <Routes>
        <Route
          path="/admin/*"
          element={(
            <RequireAdmin>
              <AdminPortal />
            </RequireAdmin>
          )}
        />
        <Route path="/*" element={<StudentPortal />} />
      </Routes>
    </Suspense>
  )
}

export default App
