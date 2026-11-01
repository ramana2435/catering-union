import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getWorkerConfirmations,
  getCateringJobById,
  getWorkerAttendanceForJob,
} from '@/lib/database'
import type { CateringJob, JobConfirmation, WorkerAttendance } from '@/lib/database'
import Loading from '@/components/common/Loading'
import VacancyBadge from '@/components/jobs/VacancyBadge'
import ErrorMessage from '@/components/common/ErrorMessage'
import { toAppError, logError } from '@/lib/errors'

interface ConfirmedJobWithDetails {
  confirmation: JobConfirmation
  job: CateringJob | null
  attendance: WorkerAttendance | null
}

export default function WorkerMyJobs() {
  const { profile } = useAuth()
  const [confirmedJobs, setConfirmedJobs] = useState<ConfirmedJobWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfirmedJobs()
  }, [profile])

  const loadConfirmedJobs = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      // Get worker's confirmations
      const confirmations = await getWorkerConfirmations(profile.id)

      // Load job details and attendance for each confirmation
      const jobsWithDetails = await Promise.all(
        confirmations.map(async (confirmation) => {
          const [job, attendance] = await Promise.all([
            getCateringJobById(confirmation.job_id),
            getWorkerAttendanceForJob(confirmation.job_id, profile.id),
          ])

          return {
            confirmation,
            job,
            attendance,
          }
        })
      )

      // Filter out jobs that no longer exist
      setConfirmedJobs(jobsWithDetails.filter((item) => item.job !== null))
    } catch (err) {
      logError(err, 'WorkerMyJobs.loadConfirmedJobs')
      const appError = toAppError(err, 'Failed to load confirmed jobs')
      setError(appError.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const upcomingJobs = confirmedJobs.filter(
    (item) => item.job && new Date(item.job.event_date) >= new Date(new Date().toDateString())
  )
  const completedJobs = confirmedJobs.filter(
    (item) => item.job && item.job.status === 'completed'
  )

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Please log in to view your confirmed jobs</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Confirmed Jobs</h1>
        <p className="text-gray-600">Jobs you have confirmed attendance for</p>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          error={error}
          onRetry={loadConfirmedJobs}
          className="mb-6"
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{confirmedJobs.length}</p>
              <p className="text-sm text-gray-500">Total Confirmed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📅
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingJobs.length}</p>
              <p className="text-sm text-gray-500">Upcoming</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              ✔️
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedJobs.length}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" label="Loading your confirmed jobs..." />
        </div>
      ) : confirmedJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Confirmed Jobs Yet</h3>
          <p className="text-gray-600 mb-6">
            Start by browsing and confirming jobs you'd like to work
          </p>
          <Link
            to="/worker/jobs"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            <span>🔍</span>
            <span>Browse Available Jobs</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {confirmedJobs.map(({ confirmation, job, attendance }) => {
            if (!job) return null

            const eventDate = new Date(job.event_date)
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            const getAttendanceStatus = () => {
              if (!attendance) return { text: 'Confirmed', color: 'text-green-600' }
              switch (attendance.attendance_status) {
                case 'getting_ready':
                  return { text: 'Getting Ready', color: 'text-blue-600' }
                case 'on_the_way':
                  return { text: 'On the Way', color: 'text-orange-600' }
                case 'arrived':
                  return { text: 'Arrived', color: 'text-purple-600' }
                case 'present':
                  return { text: 'Present', color: 'text-green-700' }
                case 'absent':
                  return { text: 'Absent', color: 'text-red-600' }
                default:
                  return { text: 'Confirmed', color: 'text-green-600' }
              }
            }

            const attendanceStatus = getAttendanceStatus()

            return (
              <Link
                key={confirmation.id}
                to={`/worker/jobs/${job.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">{job.event_name}</h3>
                </div>

                {/* Vacancy Badge */}
                <div className="mb-3">
                  <VacancyBadge
                    requiredWorkers={job.required_workers}
                    confirmedWorkers={job.confirmed_workers}
                    status={job.status}
                    size="sm"
                  />
                </div>

                {/* Attendance Status */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Your Status:</span>
                  <span className={`text-sm font-semibold ${attendanceStatus.color}`}>
                    {attendanceStatus.text}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <span>📅</span>
                  <span>{formattedDate}</span>
                  {job.start_time && (
                    <>
                      <span>•</span>
                      <span>{job.start_time.substring(0, 5)}</span>
                    </>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span>📍</span>
                  <p className="flex-1 line-clamp-1">{job.address}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
