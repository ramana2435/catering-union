import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCateringJobById,
  getJobConfirmations,
  confirmJobAtomic,
  cancelConfirmationAtomic,
  subscribeToJob,
  subscribeToJobConfirmations,
  getWorkerAttendanceForJob,
  updateWorkerArrivalStatus,
  subscribeToAttendance,
  type ConfirmationResult,
} from '@/lib/database'
import type { CateringJob, JobConfirmation, WorkerAttendance, AttendanceStatus } from '@/lib/database'
import Loading from '@/components/common/Loading'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { VacancyProgress } from '@/components/jobs/VacancyBadge'
import AttendanceStatusSelector from '@/components/attendance/AttendanceStatusSelector'
import { LocationSharingToggle } from '@/components/LocationSharingToggle'

export default function WorkerJobDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [job, setJob] = useState<CateringJob | null>(null)
  const [confirmations, setConfirmations] = useState<JobConfirmation[]>([])
  const [attendance, setAttendance] = useState<WorkerAttendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Load job details
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
      console.log('Job updated via realtime:', updatedJob)
      setJob(updatedJob)
    })

    // Subscribe to confirmation changes
    const unsubscribeConfirmations = subscribeToJobConfirmations(
      id,
      () => {
        // New confirmation added
        console.log('New confirmation via realtime')
        loadJobDetails()
      },
      () => {
        // Confirmation updated (e.g., cancelled)
        console.log('Confirmation updated via realtime')
        loadJobDetails()
      }
    )

    // Subscribe to attendance changes
    const unsubscribeAttendance = subscribeToAttendance(id, (updatedAttendance) => {
      // Only update if it's this worker's attendance
      if (profile && updatedAttendance.worker_id === profile.id) {
        console.log('My attendance updated via realtime:', updatedAttendance)
        setAttendance(updatedAttendance)
      }
    })

    return () => {
      unsubscribeJob()
      unsubscribeConfirmations()
      unsubscribeAttendance()
    }
  }, [id, profile])

  const loadJobDetails = async () => {
    if (!id) return

    setLoading(true)
    try {
      const [fetchedJob, fetchedConfirmations, fetchedAttendance] = await Promise.all([
        getCateringJobById(id),
        getJobConfirmations(id),
        profile ? getWorkerAttendanceForJob(id, profile.id) : Promise.resolve(null),
      ])

      setJob(fetchedJob)
      setConfirmations(fetchedConfirmations)
      setAttendance(fetchedAttendance)
    } catch (error) {
      console.error('Error loading job details:', error)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmJob = async () => {
    if (!profile || !job) return

    setConfirming(true)
    setError(null)
    setSuccess(null)

    try {
      const result: ConfirmationResult = await confirmJobAtomic(job.id, profile.id)

      if (!result.success) {
        // Handle specific error codes with user-friendly messages
        let errorMessage = result.message

        switch (result.code) {
          case 'ALREADY_CONFIRMED':
            errorMessage = 'You have already confirmed this job.'
            break
          case 'JOB_FULL':
            errorMessage = 'Sorry, this job is now full. All positions have been filled.'
            break
          case 'JOB_CANCELLED':
            errorMessage = 'This job has been cancelled by the provider.'
            break
          case 'JOB_COMPLETED':
            errorMessage = 'This job has already been completed.'
            break
          case 'JOB_EXPIRED':
            errorMessage = 'This job date has already passed.'
            break
          case 'JOB_NOT_FOUND':
            errorMessage = 'This job no longer exists.'
            break
        }

        setError(errorMessage)
        // Reload to get fresh data
        await loadJobDetails()
        return
      }

      // Success!
      setSuccess(`Job confirmed successfully! ${result.is_now_full ? 'This job is now full.' : ''}`)
      setShowConfirmDialog(false)

      // Reload job details to show updated counts
      await loadJobDetails()
    } catch (err) {
      console.error('Error confirming job:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const handleCancelConfirmation = async () => {
    if (!profile || !myConfirmation) return

    setCancelling(true)
    setError(null)
    setSuccess(null)

    try {
      const result: ConfirmationResult = await cancelConfirmationAtomic(
        myConfirmation.id,
        profile.id
      )

      if (!result.success) {
        setError(result.message)
        return
      }

      setSuccess('Your confirmation has been cancelled.')
      setShowCancelDialog(false)

      // Reload job details
      await loadJobDetails()
    } catch (err) {
      console.error('Error cancelling confirmation:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const handleUpdateAttendanceStatus = async (
    newStatus: 'getting_ready' | 'on_the_way' | 'arrived'
  ) => {
    if (!profile || !job) return

    setUpdatingStatus(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateWorkerArrivalStatus(job.id, profile.id, newStatus)

      if (!updated) {
        throw new Error('Failed to update status')
      }

      setAttendance(updated)
      setSuccess(`Status updated to ${newStatus.replace('_', ' ')}`)
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const myConfirmation = profile
    ? confirmations.find((c) => c.worker_id === profile.id && c.status === 'confirmed')
    : undefined

  const isAlreadyConfirmed = !!myConfirmation
  const spotsLeft = job ? job.required_workers - job.confirmed_workers : 0
  const canConfirm =
    job &&
    profile &&
    !isAlreadyConfirmed &&
    job.status === 'open' &&
    spotsLeft > 0 &&
    new Date(job.event_date) >= new Date(new Date().toDateString()) // Not in past
  const canCancel = job && profile && isAlreadyConfirmed && job.status === 'open'

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Loading size="lg" label="Loading job details..." />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">This job may have been removed or cancelled</p>
          <Link
            to="/worker/jobs"
            className="inline-block bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700"
          >
            Browse Jobs
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        to="/worker/jobs"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        ← Back to Jobs
      </Link>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.event_name}</h1>
              {job.event_type && (
                <p className="text-brand-100 capitalize text-lg">{job.event_type}</p>
              )}
            </div>
            <span className="px-4 py-2 bg-white text-brand-600 rounded-lg font-semibold capitalize">
              {job.status}
            </span>
          </div>
        </div>

        {/* Alerts */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              {success}
            </div>
          )}

          {isAlreadyConfirmed && !success && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              ✅ You have already confirmed this job
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="text-3xl">📅</span>
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
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="text-3xl">📍</span>
            <div>
              <p className="font-semibold text-gray-900">{job.address}</p>
              {(job.area || job.city || job.district) && (
                <p className="text-sm text-gray-600">
                  {[job.area, job.city, job.district].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Workers with Vacancy Progress */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <VacancyProgress
              requiredWorkers={job.required_workers}
              confirmedWorkers={job.confirmed_workers}
              showNumbers={true}
              size="md"
            />
          </div>

          {/* Description */}
          {job.description && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* Contact Information */}
          {(job.contact_person || job.contact_number) && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
              <div className="space-y-1 text-sm">
                {job.contact_person && (
                  <p className="text-gray-700">
                    <span className="font-medium">Contact Person:</span> {job.contact_person}
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

          {/* Attendance Status Update - Only for confirmed workers */}
          {isAlreadyConfirmed && job.status === 'open' && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Your Arrival Status</h3>
              <AttendanceStatusSelector
                currentStatus={(attendance?.attendance_status as AttendanceStatus) || 'confirmed'}
                onStatusChange={handleUpdateAttendanceStatus}
                disabled={updatingStatus}
              />
            </div>
          )}

          {/* Location Sharing - Only for confirmed workers */}
          {isAlreadyConfirmed && job.status === 'open' && profile && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Location Sharing (Optional)</h3>
              <LocationSharingToggle
                jobId={job.id}
                workerId={profile.id}
                onError={(err) => setError(err)}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-200 space-y-3">
            {canConfirm && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={confirming}
                className="w-full bg-brand-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                Confirm Attendance for this Job
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
                className="w-full bg-white text-red-600 border-2 border-red-600 py-3 px-6 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancel My Confirmation
              </button>
            )}

            {!canConfirm && !canCancel && job.status === 'open' && spotsLeft === 0 && (
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-medium">This job is now full</p>
                <p className="text-sm text-blue-600 mt-1">All positions have been filled</p>
              </div>
            )}

            {job.status === 'cancelled' && (
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-800 font-medium">This job has been cancelled</p>
              </div>
            )}

            {job.status === 'completed' && (
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-700 font-medium">This job has been completed</p>
              </div>
            )}

            {job.status === 'full' && !isAlreadyConfirmed && (
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-medium">This job is full</p>
                <p className="text-sm text-blue-600 mt-1">All positions have been filled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => !confirming && setShowConfirmDialog(false)}
        onConfirm={handleConfirmJob}
        title="Confirm Job Attendance"
        message={`Are you sure you want to confirm your attendance for "${job?.event_name}"? The provider will be notified.`}
        confirmText="Yes, Confirm"
        cancelText="Not Yet"
        isLoading={confirming}
        variant="success"
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => !cancelling && setShowCancelDialog(false)}
        onConfirm={handleCancelConfirmation}
        title="Cancel Confirmation"
        message="Are you sure you want to cancel your confirmation? This will free up the spot for other workers."
        confirmText="Yes, Cancel"
        cancelText="Keep It"
        isLoading={cancelling}
        variant="warning"
      />
    </div>
  )
}
