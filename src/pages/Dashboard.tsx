import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/common/Loading'

export default function Dashboard() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Loading size="lg" label="Loading dashboard..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Profile not found</div>
      </div>
    )
  }

  const firstName = profile.full_name.split(' ')[0]

  // Provider Dashboard
  if (profile.role === 'provider') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Provider Dashboard</h1>
          <p className="text-gray-600">Welcome back, {firstName}! Manage your catering jobs and workers.</p>
        </div>

        {/* Account Status */}
        {profile.account_status !== 'active' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Your account status:{' '}
            <span className="font-semibold">{profile.account_status.replace(/_/g, ' ')}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center text-2xl">
                📋
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-sm text-gray-500">Active Jobs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                📧
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-500">Applications</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-500">Workers Confirmed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/jobs"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">➕</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Post a New Job</h3>
            <p className="text-sm text-gray-600">Create a new catering job posting and hire workers</p>
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View My Jobs</h3>
            <p className="text-sm text-gray-600">Manage your posted jobs and track their status</p>
            <p className="text-xs text-gray-500 mt-2 italic">Coming soon</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View Applications</h3>
            <p className="text-sm text-gray-600">Review worker applications and confirmations</p>
            <p className="text-xs text-gray-500 mt-2 italic">Coming soon</p>
          </div>
        </div>
      </div>
    )
  }

  // Worker Dashboard
  if (profile.role === 'worker') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Worker Dashboard</h1>
          <p className="text-gray-600">Welcome back, {firstName}! Find and manage your catering jobs.</p>
        </div>

        {/* Account Status */}
        {profile.account_status !== 'active' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Your account status:{' '}
            <span className="font-semibold">{profile.account_status.replace(/_/g, ' ')}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center text-2xl">
                🔍
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-sm text-gray-500">Jobs Available</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-sm text-gray-500">Confirmed Jobs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-sm text-gray-500">Job Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/jobs"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Jobs</h3>
            <p className="text-sm text-gray-600">Browse available catering jobs in your area</p>
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Confirmations</h3>
            <p className="text-sm text-gray-600">View and manage your confirmed jobs</p>
            <p className="text-xs text-gray-500 mt-2 italic">Coming soon</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Attendance</h3>
            <p className="text-sm text-gray-600">Track your attendance and work history</p>
            <p className="text-xs text-gray-500 mt-2 italic">Coming soon</p>
          </div>
        </div>
      </div>
    )
  }

  // Admin Dashboard
  if (profile.role === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome, Admin! You should use the{' '}
            <Link to="/admin" className="text-brand-600 hover:underline font-medium">
              Admin Panel
            </Link>{' '}
            instead.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">150</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center text-2xl">
                📋
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">45</p>
                <p className="text-sm text-gray-500">Active Jobs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-sm text-gray-500">Pending Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/admin"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">🎛️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Panel</h3>
            <p className="text-sm text-gray-600">Access full admin controls and settings</p>
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
            <p className="text-xs text-gray-500 mt-2 italic">Coming soon</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Logs</h3>
            <p className="text-sm text-gray-600">Review system activity and admin actions</p>
            <p className="text-xs text-gray-500 mt-2 italic">Coming soon</p>
          </div>
        </div>
      </div>
    )
  }

  // Fallback for unknown role
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500">Welcome back! Your dashboard is under construction.</p>
    </div>
  )
}
