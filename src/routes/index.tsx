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
import TestConnection from '@/pages/TestConnection'
import NotFound from '@/pages/NotFound'

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
