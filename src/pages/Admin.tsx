import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/lib/i18n'
import AccessDenied from '@/components/admin/AccessDenied'
import Loading from '@/components/common/Loading'
import { getAdminStats, AdminStats } from '@/lib/admin'

type TabType = 'overview' | 'users' | 'jobs' | 'reports' | 'audit'

export default function Admin() {
  const { profile } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is admin
  if (!profile || profile.role !== 'admin') {
    return <AccessDenied />
  }

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    const data = await getAdminStats()
    setStats(data)
    setLoading(false)
  }

  const tabs = [
    { id: 'overview' as TabType, label: t('admin.overview'), icon: '📊' },
    { id: 'users' as TabType, label: t('admin.users'), icon: '👥' },
    { id: 'jobs' as TabType, label: t('admin.jobs'), icon: '💼' },
    { id: 'reports' as TabType, label: t('admin.reports'), icon: '🚩' },
    { id: 'audit' as TabType, label: t('admin.auditLogs'), icon: '📝' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.title')}</h1>
          <p className="text-gray-600">{t('admin.dashboard')}</p>
        </div>
        <Link
          to="/admin/health"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>🏥</span>
          <span>System Health</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} loading={loading} onRefresh={loadStats} onNavigate={setActiveTab} />
        )}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'jobs' && <JobsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'audit' && <AuditLogsTab />}
      </div>
    </div>
  )
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  stats,
  loading,
  onRefresh,
  onNavigate,
}: {
  stats: AdminStats | null
  loading: boolean
  onRefresh: () => void
  onNavigate: (tab: TabType) => void
}) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading size="lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t('errors.loadFailed')}</p>
        <button onClick={onRefresh} className="text-brand-600 hover:underline">
          {t('common.retry')}
        </button>
      </div>
    )
  }

  const statCards = [
    {
      label: t('admin.totalUsers'),
      value: stats.totalUsers,
      icon: '👥',
      color: 'blue',
      subStats: [
        { label: t('admin.totalProviders'), value: stats.totalProviders },
        { label: t('admin.totalWorkers'), value: stats.totalWorkers },
        { label: t('admin.totalAdmins'), value: stats.totalAdmins },
      ],
    },
    {
      label: t('admin.totalJobs'),
      value: stats.totalJobs,
      icon: '💼',
      color: 'green',
      subStats: [
        { label: t('admin.activeJobs'), value: stats.activeJobs },
        { label: t('admin.upcomingJobs'), value: stats.upcomingJobs },
        { label: t('admin.completedJobs'), value: stats.completedJobs },
      ],
    },
    {
      label: t('admin.openVacancies'),
      value: stats.openVacancies,
      icon: '📋',
      color: 'purple',
    },
    {
      label: t('admin.pendingReports'),
      value: stats.pendingReports,
      icon: '🚩',
      color: 'red',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{card.icon}</span>
              <span className="text-3xl font-bold text-gray-900">{card.value}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">{card.label}</h3>
            {card.subStats && (
              <div className="space-y-1 pt-3 border-t border-gray-100">
                {card.subStats.map((sub, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500">
                    <span>{sub.label}:</span>
                    <span className="font-medium">{sub.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => onNavigate('users')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-gray-900">{t('admin.userManagement')}</div>
            <div className="text-sm text-gray-500 mt-1">Manage users and permissions</div>
          </button>
          <button 
            onClick={() => onNavigate('jobs')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">💼</div>
            <div className="font-medium text-gray-900">{t('admin.jobManagement')}</div>
            <div className="text-sm text-gray-500 mt-1">Monitor and moderate jobs</div>
          </button>
          <button 
            onClick={() => onNavigate('reports')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🚩</div>
            <div className="font-medium text-gray-900">{t('admin.reportsQueue')}</div>
            <div className="text-sm text-gray-500 mt-1">Review pending reports</div>
          </button>
          <button 
            onClick={() => onNavigate('audit')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="font-medium text-gray-900">{t('admin.auditLogs')}</div>
            <div className="text-sm text-gray-500 mt-1">View action history</div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Users Tab
// ============================================================================

function UsersTab() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadUsers()
  }, [search, roleFilter, statusFilter])

  const loadUsers = async () => {
    setLoading(true)
    const { searchUsers } = await import('@/lib/admin')
    const result = await searchUsers({
      search: search || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      accountStatus: statusFilter !== 'all' ? statusFilter : undefined,
    })
    if (result) {
      setUsers(result.users)
    }
    setLoading(false)
  }

  const handleSuspendUser = async (userId: string) => {
    if (!profile || !confirm('Suspend this user?')) return
    const { updateUserStatus } = await import('@/lib/admin')
    const success = await updateUserStatus(userId, 'suspended', profile.id)
    if (success) {
      alert('User suspended')
      loadUsers()
    } else {
      alert('Failed to suspend user')
    }
  }

  const handleReactivateUser = async (userId: string) => {
    if (!profile || !confirm('Reactivate this user?')) return
    const { updateUserStatus } = await import('@/lib/admin')
    const success = await updateUserStatus(userId, 'active', profile.id)
    if (success) {
      alert('User reactivated')
      loadUsers()
    } else {
      alert('Failed to reactivate user')
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="provider">Providers</option>
            <option value="worker">Workers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loading size="md" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'provider' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.account_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone_number || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.account_status === 'active' ? (
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateUser(user.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Jobs Tab
// ============================================================================

function JobsTab() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadJobs()
  }, [search, statusFilter])

  const loadJobs = async () => {
    setLoading(true)
    const { searchJobs } = await import('@/lib/admin')
    const result = await searchJobs({
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
    if (result) {
      setJobs(result.jobs)
    }
    setLoading(false)
  }

  const handleRemoveJob = async (jobId: string) => {
    if (!profile) return
    const reason = prompt('Reason for removal (optional):')
    if (reason === null) return // Cancelled
    
    if (!confirm('Remove this job? It will be soft-deleted.')) return
    
    const { adminRemoveJob } = await import('@/lib/admin')
    const success = await adminRemoveJob(jobId, profile.id, reason || undefined)
    if (success) {
      alert('Job removed successfully')
      loadJobs()
    } else {
      alert('Failed to remove job')
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by event name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="full">Full</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loading size="md" />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{job.event_name}</div>
                      <div className="text-sm text-gray-500">{job.event_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        job.status === 'open' ? 'bg-green-100 text-green-800' :
                        job.status === 'full' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.event_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.confirmed_workers}/{job.required_workers}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {job.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="text-brand-600 hover:text-brand-800 font-medium text-sm"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleRemoveJob(job.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Reports Tab
// ============================================================================

function ReportsTab() {
  const { profile } = useAuth()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'reviewed' | 'resolved' | 'dismissed'>('pending')

  useEffect(() => {
    loadReports()
  }, [statusFilter])

  const loadReports = async () => {
    setLoading(true)
    const { getReports } = await import('@/lib/admin')
    const result = await getReports(statusFilter)
    if (result) {
      setReports(result.reports)
    }
    setLoading(false)
  }

  const handleUpdateStatus = async (reportId: string, newStatus: 'reviewed' | 'resolved' | 'dismissed') => {
    if (!profile || !confirm(`Mark this report as ${newStatus}?`)) return
    
    const { updateReportStatus } = await import('@/lib/admin')
    const success = await updateReportStatus(reportId, newStatus, profile.id)
    if (success) {
      alert(`Report marked as ${newStatus}`)
      loadReports()
    } else {
      alert('Failed to update report')
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="md" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No {statusFilter} reports found
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{report.report_type}</h3>
                  <p className="text-sm text-gray-500">
                    Reported {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                  report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {report.status}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700">{report.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Reporter:</span> {report.reporter_id}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Target:</span> {report.reported_user_id || report.reported_job_id}
                </div>
                
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Audit Logs Tab
// ============================================================================

function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    const { getAuditLogs } = await import('@/lib/admin')
    const result = await getAuditLogs(100)
    if (result) {
      setLogs(result.logs)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <Loading size="md" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.admin_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.target_type && (
                        <>
                          {log.target_type}
                          {log.target_id && (
                            <div className="text-xs text-gray-400">
                              {log.target_id.substring(0, 8)}...
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.details && typeof log.details === 'object' && (
                        <pre className="text-xs overflow-auto max-w-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
