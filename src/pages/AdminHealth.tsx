/**
 * Admin Health & Monitoring Dashboard
 * Module 12: Displays data retention statistics, storage usage, system health
 * 
 * Free-tier limitations:
 * - No automatic database alerts
 * - No pg_cron scheduling
 * - Manual monitoring required
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/common/Loading'
import ErrorMessage from '@/components/common/ErrorMessage'
import AccessDenied from '@/components/admin/AccessDenied'
import { toAppError, logError } from '@/lib/errors'

interface RetentionStats {
  category: string
  total_records: number
  expired_records: number
  expiring_soon_7d: number
  expiring_soon_30d: number
  oldest_record_date: string | null
  newest_record_date: string | null
}

export default function AdminHealth() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retentionStats, setRetentionStats] = useState<RetentionStats[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadHealthData()
    } else {
      setLoading(false)
    }
  }, [profile])

  const loadHealthData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load retention statistics from database function
      const { data: retentionData, error: retentionError } = await supabase
        .rpc('get_retention_statistics' as any)

      if (retentionError) throw retentionError

      setRetentionStats((retentionData as any) || [])
      setLastRefresh(new Date())
    } catch (err) {
      logError(err, 'AdminHealth.loadHealthData')
      const appError = toAppError(err, 'Failed to load health data')
      setError(appError.message)
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Loading />
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return <AccessDenied />
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Loading />
      </div>
    )
  }

  // Calculate totals
  const totalRecords = retentionStats.reduce((sum, stat) => sum + stat.total_records, 0)
  const totalExpired = retentionStats.reduce((sum, stat) => sum + stat.expired_records, 0)
  const expiringIn7Days = retentionStats.reduce((sum, stat) => sum + stat.expiring_soon_7d, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health & Monitoring</h1>
          <p className="text-gray-600">
            Data retention, storage usage, and system statistics
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last refreshed: {lastRefresh.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadHealthData}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          error={error}
          onRetry={loadHealthData}
          className="mb-6"
        />
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Records</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${
              totalExpired > 0 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              {totalExpired > 0 ? '⚠️' : '✅'}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalExpired}</p>
              <p className="text-sm text-gray-500">Expired Records</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${
              expiringIn7Days > 0 ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              ⏰
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{expiringIn7Days}</p>
              <p className="text-sm text-gray-500">Expiring in 7 Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Free Tier Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Free Tier Limitations</h3>
            <p className="text-sm text-blue-800">
              This project uses Supabase free tier (500 MB limit). Automatic scheduling and alerts are not available.
              Please monitor this page regularly and run manual cleanup as needed.
            </p>
          </div>
        </div>
      </div>

      {/* Retention Statistics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Data Retention Statistics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Breakdown by data category. See DATA_RETENTION_POLICY.md for cleanup procedures.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Records
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expired
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiring (7d)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiring (30d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {retentionStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No retention statistics available
                  </td>
                </tr>
              ) : (
                retentionStats.map((stat) => (
                  <tr key={stat.category} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {formatCategoryName(stat.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {stat.total_records.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {stat.expired_records > 0 ? (
                        <span className="text-yellow-600 font-semibold">{stat.expired_records}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {stat.expiring_soon_7d > 0 ? (
                        <span className="text-orange-600">{stat.expiring_soon_7d}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {stat.expiring_soon_30d}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {stat.oldest_record_date && stat.newest_record_date ? (
                        <div>
                          <div>{formatShortDate(stat.oldest_record_date)}</div>
                          <div>to {formatShortDate(stat.newest_record_date)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cleanup Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Manual Cleanup Actions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Run cleanup functions to remove expired data. Always test with dry-run first.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Cleanup Expired Deleted Jobs</h3>
              <p className="text-sm text-gray-600 mb-2">
                Permanently removes deleted job records past their 30-day recovery window.
              </p>
              <p className="text-xs text-gray-500 font-mono">
                SELECT * FROM cleanup_expired_deleted_jobs(FALSE, '{profile?.id}');
              </p>
            </div>
            <button
              onClick={() => alert('Please run this SQL command in Supabase SQL Editor. See DATA_RETENTION_POLICY.md for detailed instructions.')}
              className="ml-4 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
            >
              View Instructions
            </button>
          </div>

          <div className="flex items-start justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Cleanup Expired Location Sessions</h3>
              <p className="text-sm text-gray-600 mb-2">
                Removes expired location sharing sessions (privacy-sensitive data).
              </p>
              <p className="text-xs text-gray-500 font-mono">
                SELECT * FROM cleanup_expired_location_sessions(FALSE, '{profile?.id}');
              </p>
            </div>
            <button
              onClick={() => alert('Please run this SQL command in Supabase SQL Editor. See DATA_RETENTION_POLICY.md for detailed instructions.')}
              className="ml-4 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              View Instructions
            </button>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-1">📖 Full Documentation</h3>
            <p className="text-sm text-gray-600 mb-2">
              Complete cleanup procedures, retention policies, and backup/restore guides:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <code className="text-xs bg-white px-2 py-0.5 rounded">DATA_RETENTION_POLICY.md</code> - Retention rules and cleanup functions</li>
              <li>• <code className="text-xs bg-white px-2 py-0.5 rounded">BACKUP_AND_RESTORE_GUIDE.md</code> - Backup and disaster recovery</li>
              <li>• <code className="text-xs bg-white px-2 py-0.5 rounded">MODULE_12_IMPLEMENTATION.md</code> - Technical implementation details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Monitoring Recommendations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Monitoring Recommendations</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="font-medium text-gray-900">Daily</p>
                <p className="text-sm text-gray-600">
                  Check expired location sessions (privacy requirement)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">📊</span>
              <div>
                <p className="font-medium text-gray-900">Weekly</p>
                <p className="text-sm text-gray-600">
                  Review retention statistics and cleanup expired deleted jobs
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">💾</span>
              <div>
                <p className="font-medium text-gray-900">Monthly</p>
                <p className="text-sm text-gray-600">
                  Check Supabase dashboard storage usage (free tier: 500 MB limit)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-medium text-gray-900">Backup</p>
                <p className="text-sm text-gray-600">
                  Take manual database backups before major changes or monthly (see BACKUP_AND_RESTORE_GUIDE.md)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    deleted_jobs: 'Deleted Jobs',
    location_sessions: 'Location Sessions',
    completed_jobs: 'Completed Jobs',
    audit_logs: 'Audit Logs',
    reports: 'Reports',
  }
  return names[category] || category
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
