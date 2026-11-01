import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getDeletedJobs, restoreJob, permanentlyDeleteJob } from '@/lib/database'
import type { DeletedJob } from '@/lib/database'
import Loading from '@/components/common/Loading'
import ConfirmDialog from '@/components/common/ConfirmDialog'

export default function ProviderDeletedJobs() {
  const { profile } = useAuth()
  const location = useLocation()
  const [deletedJobs, setDeletedJobs] = useState<DeletedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [permanentlyDeleting, setPermanentlyDeleting] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)
  const [selectedJob, setSelectedJob] = useState<DeletedJob | null>(null)

  useEffect(() => {
    // Show success message from navigation state
    if (location.state?.message) {
      setSuccess(location.state.message)
      // Clear the state
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    if (profile) {
      loadDeletedJobs()
    }
  }, [profile])

  const loadDeletedJobs = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const jobs = await getDeletedJobs(profile.id)
      setDeletedJobs(jobs)
    } catch (err) {
      console.error('Error loading deleted jobs:', err)
      setError('Failed to load deleted jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreClick = (job: DeletedJob) => {
    setSelectedJob(job)
    setShowRestoreDialog(true)
  }

  const handleRestoreJob = async () => {
    if (!selectedJob) return

    setRestoring(selectedJob.id)
    setError(null)
    setSuccess(null)

    try {
      const result = await restoreJob(selectedJob.id)

      if (!result.success) {
        throw new Error(result.error || 'Failed to restore job')
      }

      setSuccess('Job restored successfully!')
      setShowRestoreDialog(false)
      setSelectedJob(null)
      await loadDeletedJobs()
    } catch (err: any) {
      setError(err.message || 'Failed to restore job')
      setShowRestoreDialog(false)
    } finally {
      setRestoring(null)
    }
  }

  const handlePermanentDeleteClick = (job: DeletedJob) => {
    setSelectedJob(job)
    setShowPermanentDeleteDialog(true)
  }

  const handlePermanentDelete = async () => {
    if (!selectedJob) return

    setPermanentlyDeleting(selectedJob.id)
    setError(null)
    setSuccess(null)

    try {
      const success = await permanentlyDeleteJob(selectedJob.id)

      if (!success) {
        throw new Error('Failed to permanently delete job')
      }

      setSuccess('Job permanently deleted')
      setShowPermanentDeleteDialog(false)
      setSelectedJob(null)
      await loadDeletedJobs()
    } catch (err: any) {
      setError(err.message || 'Failed to delete job')
      setShowPermanentDeleteDialog(false)
    } finally {
      setPermanentlyDeleting(null)
    }
  }

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    return days > 0 ? days : 0
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const getJobSnapshot = (job: DeletedJob): any => {
    if (typeof job.job_snapshot === 'string') {
      return JSON.parse(job.job_snapshot)
    }
    return job.job_snapshot
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Please log in to view deleted jobs</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/provider/jobs"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          ← Back to My Jobs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recently Deleted</h1>
        <p className="text-gray-600">
          Jobs can be recovered within 30 days of deletion
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" label="Loading deleted jobs..." />
        </div>
      ) : deletedJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">🗑️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No deleted jobs</h3>
          <p className="text-gray-600 mb-6">
            Jobs you delete will appear here and can be recovered for 30 days
          </p>
          <Link
            to="/provider/jobs"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            View My Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {deletedJobs.map((deletedJob) => {
            const jobData = getJobSnapshot(deletedJob)
            const daysRemaining = getDaysRemaining(deletedJob.expires_at)
            const expired = isExpired(deletedJob.expires_at)
            const isRestoring = restoring === deletedJob.id
            const isDeleting = permanentlyDeleting === deletedJob.id

            return (
              <div
                key={deletedJob.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {jobData.event_name}
                    </h3>
                    {jobData.event_type && (
                      <p className="text-sm text-gray-600 capitalize mb-2">
                        {jobData.event_type}
                      </p>
                    )}
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>📅 {new Date(jobData.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}</p>
                      <p>📍 {jobData.address}</p>
                      <p>👥 {jobData.confirmed_workers}/{jobData.required_workers} workers confirmed</p>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Deleted: {new Date(deletedJob.deleted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {daysRemaining !== null && (
                        <span
                          className={`font-medium ${
                            expired
                              ? 'text-red-600'
                              : daysRemaining <= 7
                              ? 'text-orange-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {expired
                            ? '⚠️ Recovery expired'
                            : `⏰ ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to recover`}
                        </span>
                      )}
                    </div>

                    {deletedJob.deletion_reason && (
                      <p className="mt-2 text-xs text-gray-500 italic">
                        Reason: {deletedJob.deletion_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {!expired && (
                      <button
                        onClick={() => handleRestoreClick(deletedJob)}
                        disabled={isRestoring || isDeleting}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRestoring ? 'Restoring...' : '↩️ Restore'}
                      </button>
                    )}
                    <button
                      onClick={() => handlePermanentDeleteClick(deletedJob)}
                      disabled={isRestoring || isDeleting}
                      className="px-4 py-2 bg-white text-red-600 border border-red-300 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : '🗑️ Delete Forever'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Restore Dialog */}
      <ConfirmDialog
        isOpen={showRestoreDialog}
        onClose={() => !restoring && setShowRestoreDialog(false)}
        onConfirm={handleRestoreJob}
        title="Restore Job?"
        message={
          selectedJob ? (
            <div className="space-y-3">
              <p>
                Are you sure you want to restore <strong>"{getJobSnapshot(selectedJob).event_name}"</strong>?
              </p>
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                <p>✅ Job will be moved back to your active jobs</p>
                <p>✅ All worker confirmations and attendance will be restored</p>
                <p>✅ Workers will be able to see this job again</p>
              </div>
            </div>
          ) : ''
        }
        confirmText={restoring ? 'Restoring...' : 'Restore Job'}
        cancelText="Cancel"
        isLoading={!!restoring}
        variant="success"
      />

      {/* Permanent Delete Dialog */}
      <ConfirmDialog
        isOpen={showPermanentDeleteDialog}
        onClose={() => !permanentlyDeleting && setShowPermanentDeleteDialog(false)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Job?"
        message={
          selectedJob ? (
            <div className="space-y-3">
              <p className="font-medium text-red-900">
                ⚠️ This action cannot be undone!
              </p>
              <p>
                Are you sure you want to permanently delete <strong>"{getJobSnapshot(selectedJob).event_name}"</strong>?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <p>❌ This job record will be permanently removed</p>
                <p>❌ You will NOT be able to recover it later</p>
                <p>⚠️ Worker confirmations and attendance may be affected</p>
              </div>
            </div>
          ) : ''
        }
        confirmText={permanentlyDeleting ? 'Deleting...' : 'Delete Forever'}
        cancelText="Keep It"
        isLoading={!!permanentlyDeleting}
        variant="warning"
      />
    </div>
  )
}
