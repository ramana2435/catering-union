import { Link } from 'react-router-dom'
import type { CateringJob } from '@/lib/database'
import VacancyBadge from './VacancyBadge'

interface JobCardProps {
  job: CateringJob
  viewMode: 'worker' | 'provider'
}

export default function JobCard({ job, viewMode }: JobCardProps) {
  const eventDate = new Date(job.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const remaining = job.required_workers - job.confirmed_workers

  const detailsPath = viewMode === 'worker' ? `/worker/jobs/${job.id}` : `/provider/jobs/${job.id}`

  return (
    <Link
      to={detailsPath}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.event_name}</h3>
          {job.event_type && (
            <p className="text-sm text-gray-500 capitalize">{job.event_type}</p>
          )}
        </div>
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

      {/* Date & Time */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <span className="text-lg">📅</span>
        <span>{formattedDate}</span>
        {job.start_time && (
          <>
            <span className="text-gray-400">•</span>
            <span>{job.start_time.substring(0, 5)}</span>
          </>
        )}
      </div>

      {/* Location */}
      <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
        <span className="text-lg">📍</span>
        <div className="flex-1">
          <p>{job.address}</p>
          {(job.area || job.city) && (
            <p className="text-xs text-gray-500">
              {[job.area, job.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Workers Progress Bar */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">
            {job.confirmed_workers} / {job.required_workers} Workers
          </span>
          {job.status === 'open' && remaining > 0 && (
            <span className="font-medium text-brand-600">
              {remaining} {remaining === 1 ? 'spot' : 'spots'} left
            </span>
          )}
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              job.status === 'full'
                ? 'bg-blue-500'
                : remaining <= 2
                ? 'bg-orange-500'
                : 'bg-brand-500'
            }`}
            style={{
              width: `${Math.min((job.confirmed_workers / job.required_workers) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Description preview (if exists) */}
      {job.description && (
        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{job.description}</p>
      )}
    </Link>
  )
}
