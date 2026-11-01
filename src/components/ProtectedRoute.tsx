import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/lib/database'
import Loading from '@/components/common/Loading'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole | UserRole[]
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, role, loading } = useAuth()

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" label="Checking authentication..." />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // Check role-based access
  if (allowedRoles && role) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    
    if (!rolesArray.includes(role)) {
      // User is authenticated but not authorized for this route
      // Redirect to their appropriate dashboard
      if (role === 'admin') {
        return <Navigate to="/admin" replace />
      }
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
