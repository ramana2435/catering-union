import { useState, useEffect } from 'react'
import {
  getJobConfirmationsWithAttendance,
  markWorkerPresence,
  getProfileById,
  subscribeToAttendance,
} from '@/lib/database'
import type { Profile, WorkerAttendance, JobConfirmation } from '@/lib/database'
import Loading from '@/components/common/Loading'
import { ProviderLocationView } from '@/components/ProviderLocationView'

interface WorkerWithAttendance {
  confirmation: JobConfirmation
  attendance: WorkerAttendance | null
  profile: Profile | null
}

interface ProviderAttendanceDashboardProps {
  jobId: string
  providerId: string
  jobLocation?: {
    address?: string
    latitude?: number
    longitude?: number
  }
}

export default function ProviderAttendanceDashboard({
  jobId,
  providerId,
  jobLocation,
}: ProviderAttendanceDashboardProps) {
  const [workers, setWorkers] = useState<WorkerWithAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    loadWorkers()
  }, [jobId])

  // Subscribe to attendance updates
  useEffect(() => {
    const unsubscribe = subscribeToAttendance(jobId, () => {
      // Reload workers when attendance changes
      loadWorkers()
    })

    return unsubscribe
  }, [jobId])

  const loadWorkers = async () => {
    setLoading(true)
    try {
      const confirmationsWithAttendance = await getJobConfirmationsWithAttendance(jobId)

      // Load worker profiles
      const workersWithProfiles = await Promise.all(
        confirmationsWithAttendance.map(async (item) => {
          const profile = await getProfileById(item.worker_id)
          return {
            confirmation: item as JobConfirmation,
            attendance: item.attendance,
            profile,
          }
        })
      )

      setWorkers(workersWithProfiles)
    } catch (error) {
      console.error('Error loading workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPresence = async (workerId: string, status: 'present' | 'absent') => {
    setMarkingId(workerId)
    try {
      await markWorkerPresence(jobId, workerId, status, providerId)
      // Reload to get updated data
      await loadWorkers()
    } catch (error) {
      console.error('Error marking presence:', error)
    } finally {
      setMarkingId(null)
    }
  }

  const getStatusInfo = (attendance: WorkerAttendance | null) => {
    if (!attendance) {
      return {
        text: 'Confirmed',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: '✅',
      }
    }

    switch (attendance.attendance_status) {
      case 'getting_ready':
        return {
          text: 'Getting Ready',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: '🏠',
        }
      case 'on_the_way':
        return {
          text: 'On the Way',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          icon: '🚗',
        }
      case 'arrived':
        return {
          text: 'Arrived',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          icon: '📍',
        }
      case 'present':
        return {
          text: 'Present',
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          icon: '✓',
        }
      case 'absent':
        return {
          text: 'Absent',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: '✗',
        }
      default:
        return {
          text: 'Confirmed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: '✅',
        }
    }
  }

  // Calculate attendance summary
  const summary = {
    total: workers.length,
    present: workers.filter((w) => w.attendance?.attendance_status === 'present').length,
    absent: workers.filter((w) => w.attendance?.attendance_status === 'absent').length,
    arrived: workers.filter((w) => w.attendance?.attendance_status === 'arrived').length,
    onTheWay: workers.filter((w) => w.attendance?.attendance_status === 'on_the_way').length,
    notArrived: workers.filter(
      (w) =>
        !w.attendance ||
        ['confirmed', 'getting_ready'].includes(w.attendance.attendance_status)
    ).length,
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loading size="md" label="Loading attendance..." />
      </div>
    )
  }

  if (workers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">👥</div>
        <p>No worker confirmations yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Location View */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Worker Locations</h3>
        <ProviderLocationView jobId={jobId} jobLocation={jobLocation} />
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{summary.present}</p>
          <p className="text-xs text-green-600">Present</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
          <p className="text-xs text-red-600">Absent</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{summary.arrived}</p>
          <p className="text-xs text-purple-600">Arrived</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{summary.onTheWay}</p>
          <p className="text-xs text-orange-600">On Way</p>
        </div>
      </div>

      {/* Workers List */}
      <div className="space-y-3">
        {workers.map((worker) => {
          const statusInfo = getStatusInfo(worker.attendance)
          const isMarking = markingId === worker.confirmation.worker_id
          const canMarkPresence =
            worker.attendance?.attendance_status !== 'present' &&
            worker.attendance?.attendance_status !== 'absent'

          return (
            <div
              key={worker.confirmation.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-4">
                {/* Worker Avatar */}
                <div className="h-12 w-12 bg-brand-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  👤
                </div>

                {/* Worker Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {worker.profile?.full_name || 'Unknown Worker'}
                      </p>
                      {worker.profile?.phone_number && (
                        <p className="text-sm text-gray-600">{worker.profile.phone_number}</p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor} flex items-center gap-1`}
                    >
                      <span>{statusInfo.icon}</span>
                      <span>{statusInfo.text}</span>
                    </span>
                  </div>

                  {/* Last Update Time */}
                  {worker.attendance?.updated_at && (
                    <p className="text-xs text-gray-500 mb-3">
                      Last updated:{' '}
                      {new Date(worker.attendance.updated_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Contact Buttons */}
                    {worker.profile?.phone_number && (
                      <>
                        <a
                          href={`tel:${worker.profile.phone_number}`}
                          className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                        >
                          📞 Call
                        </a>
                        <a
                          href={`https://wa.me/${worker.profile.phone_number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                        >
                          💬 WhatsApp
                        </a>
                      </>
                    )}

                    {/* Mark Present/Absent Buttons */}
                    {canMarkPresence && (
                      <>
                        <button
                          onClick={() =>
                            handleMarkPresence(worker.confirmation.worker_id, 'present')
                          }
                          disabled={isMarking}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {isMarking ? 'Marking...' : 'Mark Present'}
                        </button>
                        <button
                          onClick={() =>
                            handleMarkPresence(worker.confirmation.worker_id, 'absent')
                          }
                          disabled={isMarking}
                          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {isMarking ? 'Marking...' : 'Mark Absent'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
