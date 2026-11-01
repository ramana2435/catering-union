import { Routes, Route } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import Profile from '@/pages/Profile'
import Jobs from '@/pages/Jobs'
import Workers from '@/pages/Workers'
import Providers from '@/pages/Providers'
import Admin from '@/pages/Admin'
import AdminHealth from '@/pages/AdminHealth'
import TestConnection from '@/pages/TestConnection'
import NotFound from '@/pages/NotFound'
import ProviderJobs from '@/pages/ProviderJobs'
import ProviderDeletedJobs from '@/pages/ProviderDeletedJobs'
import NewJob from '@/pages/NewJob'
import ProviderJobDetail from '@/pages/ProviderJobDetail'
import WorkerJobs from '@/pages/WorkerJobs'
import WorkerJobDetail from '@/pages/WorkerJobDetail'
import WorkerMyJobs from '@/pages/WorkerMyJobs'

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Main layout routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/test" element={<TestConnection />} />
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/health"
            element={
              <ProtectedRoute allowedRoles="admin">
                <AdminHealth />
              </ProtectedRoute>
            }
          />
          {/* Provider routes */}
          <Route
            path="/provider/jobs"
            element={
              <ProtectedRoute allowedRoles="provider">
                <ProviderJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/deleted-jobs"
            element={
              <ProtectedRoute allowedRoles="provider">
                <ProviderDeletedJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/jobs/new"
            element={
              <ProtectedRoute allowedRoles="provider">
                <NewJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/jobs/:id"
            element={
              <ProtectedRoute allowedRoles="provider">
                <ProviderJobDetail />
              </ProtectedRoute>
            }
          />
          {/* Worker routes */}
          <Route
            path="/worker/jobs"
            element={
              <ProtectedRoute allowedRoles="worker">
                <WorkerJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/jobs/:id"
            element={
              <ProtectedRoute allowedRoles="worker">
                <WorkerJobDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/my-jobs"
            element={
              <ProtectedRoute allowedRoles="worker">
                <WorkerMyJobs />
              </ProtectedRoute>
            }
          />
        </Route>
        {/* Auth layout routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
