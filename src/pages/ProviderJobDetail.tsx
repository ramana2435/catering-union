import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getCateringJobById,
  updateCateringJob,
  softDeleteJob,
  getJobConfirmations,
  subscribeToJob,
  subscribeToJobConfirmations,
  subscribeToAttendance,
} from '@/lib/database'
import type { CateringJob } from '@/lib/database'
import Loading from '@/components/common/Loading'
import { VacancyProgress } from '@/components/jobs/VacancyBadge'
import ProviderAttendanceDashboard from '@/components/attendance/ProviderAttendanceDashboard'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'

export default function ProviderJobDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState<CateringJob | null>(null)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (id) {
      loadJobDetails()
    }
  }, [id])

  // Set up realtime subscriptions
  useEffect(() => {
    if (!id) return

    // Subscribe to job updates
    const unsubscribeJob = subscribeToJob(id, (updatedJob) => {
      console.log('Provider: Job updated via realtime:', updatedJob)
      setJob(updatedJob)
    })

    // Subscribe to confirmation changes
    const unsubscribeConfirmations = subscribeToJobConfirmations(
      id,
      async () => {
        // New confirmation added
        console.log('Provider: New confirmation via realtime')
        await loadJobDetails()
      },
      async () => {
        // Confirmation updated (e.g., cancelled)
        console.log('Provider: Confirmation updated via realtime')
        await loadJobDetails()
      }
    )

    // Subscribe to attendance changes
    const unsubscribeAttendance = subscribeToAttendance(id, () => {
      // Reload job details when attendance changes
      console.log('Provider: Attendance updated via realtime')
      loadJobDetails()
    })

    return () => {
      unsubscribeJob()
      unsubscribeConfirmations()
      unsubscribeAttendance()
    }
  }, [id])

  const loadJobDetails = async () => {
    if (!id) return

    setLoading(true)
    try {
      const [fetchedJob, confirmations] = await Promise.all([
        getCateringJobById(id),
        getJobConfirmations(id)
      ])
      
      setJob(fetchedJob)
      const confirmedWorkers = confirmations.filter(c => c.status === 'confirmed')
      setConfirmedCount(confirmedWorkers.length)
    } catch (error) {
      console.error('Error loading job details:', error)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelJob = async () => {
    if (!job || !confirm('Are you sure you want to cancel this job? This action cannot be undone.')) {
      return
    }

    setUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateCateringJob(job.id, { status: 'cancelled' })

      if (!updated) {
        throw new Error('Failed to cancel job')
      }

      setSuccess('Job cancelled successfully')
      setJob(updated)
    } catch (err) {
      console.error('Error cancelling job:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel job')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!job || !confirm('Mark this job as completed?')) {
      return
    }

    setUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateCateringJob(job.id, { status: 'completed' })

      if (!updated) {
        throw new Error('Failed to mark job as completed')
      }

      setSuccess('Job marked as completed')
      setJob(updated)
    } catch (err) {
      console.error('Error updating job:', err)
      setError(err instanceof Error ? err.message : 'Failed to update job')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteJob = async () => {
    if (!job) return

    setDeleting(true)
    setError(null)

    try {
      const success = await softDeleteJob(job.id, 'Deleted by provider')

      if (!success) {
        throw new Error('Failed to delete job')
      }

      // Redirect to Recently Deleted page with success message
      navigate('/provider/deleted-jobs', { 
        state: { message: 'Job moved to Recently Deleted. You have 30 days to recover it.' } 
      })
    } catch (err) {
      console.error('Error deleting job:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete job')
      setShowDeleteDialog(false)
      setDeleting(false)
    }
  }

  const canDelete = job && job.status !== 'completed'
  const hasConfirmedWorkers = confirmedCount > 0
  const isUpcoming = job && new Date(job.event_date) >= new Date(new Date().toDateString())

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Loading size="lg" label="Loading job details..." />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">This job may have been removed</p>
          <Link
            to="/provider/jobs"
            className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700"
          >
            View My Jobs
          </Link>
        </div>
      </div>
    )
  }

  const eventDate = new Date(job.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        to="/provider/jobs"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        ← Back to My Jobs
      </Link>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{job.event_name}</h1>
                  {job.event_type && (
                    <p className="text-brand-100 capitalize">{job.event_type}</p>
                  )}
                </div>
                <span className="px-3 py-1 bg-white text-brand-600 rounded-lg text-sm font-semibold capitalize">
                  {job.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="font-semibold text-gray-900">{formattedDate}</p>
                  {(job.start_time || job.end_time) && (
                    <p className="text-sm text-gray-600">
                      {job.start_time && job.start_time.substring(0, 5)}
                      {job.start_time && job.end_time && ' - '}
                      {job.end_time && job.end_time.substring(0, 5)}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-semibold text-gray-900">{job.address}</p>
                  {(job.area || job.city || job.district) && (
                    <p className="text-sm text-gray-600">
                      {[job.area, job.city, job.district].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {job.description && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}

              {/* Contact Info */}
              {(job.contact_person || job.contact_number) && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="space-y-1 text-sm">
                    {job.contact_person && (
                      <p className="text-gray-700">
                        <span className="font-medium">Person:</span> {job.contact_person}
                      </p>
                    )}
                    {job.contact_number && (
                      <p className="text-gray-700">
                        <span className="font-medium">Phone:</span> {job.contact_number}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Worker Attendance Dashboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Worker Attendance</h2>
            {profile && (
              <ProviderAttendanceDashboard
                jobId={job.id}
                providerId={profile.id}
                jobLocation={{
                  address: job.address,
                  latitude: job.latitude ?? undefined,
                  longitude: job.longitude ?? undefined,
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column - Actions & Stats */}
        <div className="space-y-6">
          {/* Stats Card with Vacancy Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">Workers Confirmed</p>
                <VacancyProgress
                  requiredWorkers={job.required_workers}
                  confirmedWorkers={job.confirmed_workers}
                  showNumbers={true}
                  size="md"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{job.status}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(job.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          {job.status === 'open' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleMarkCompleted}
                  disabled={updating}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Updating...' : 'Mark as Completed'}
                </button>

                <button
                  onClick={handleCancelJob}
                  disabled={updating}
                  className="w-full bg-white text-orange-600 border-2 border-orange-600 py-3 px-4 rounded-lg font-semibold hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel Job
                </button>

                {canDelete && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleting}
                    className="w-full bg-white text-red-600 border-2 border-red-600 py-3 px-4 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    🗑️ Delete Job
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => !deleting && setShowDeleteDialog(false)}
        onConfirm={handleDeleteJob}
        title="Delete Job?"
        message={
          <div className="space-y-3">
            <p className="font-medium">
              Are you sure you want to delete "{job?.event_name}"?
            </p>
            
            <div className="p-3 bg-yellow-50 rounded-lg text-sm">
              <p className="font-medium text-yellow-800 mb-1">📅 Event Date: {formattedDate}</p>
              <p className="font-medium text-yellow-800">👥 Confirmed Workers: {confirmedCount}</p>
            </div>

            {hasConfirmedWorkers && isUpcoming && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium">
                  ⚠️ Warning: This job has {confirmedCount} confirmed worker{confirmedCount !== 1 ? 's' : ''}.
                  Deleting will affect their schedule.
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p>✅ The job will be moved to Recently Deleted</p>
              <p>✅ You can recover it within 30 days</p>
              <p>✅ Worker confirmations and attendance will be preserved</p>
            </div>
          </div>
        }
        confirmText={deleting ? 'Deleting...' : 'Delete Job'}
        cancelText="Keep Job"
        isLoading={deleting}
        variant="warning"
      />
    </div>
  )
}
