interface VacancyBadgeProps {
  requiredWorkers: number
  confirmedWorkers: number
  status: string
  size?: 'sm' | 'md' | 'lg'
}

export default function VacancyBadge({
  requiredWorkers,
  confirmedWorkers,
  status,
  size = 'md',
}: VacancyBadgeProps) {
  const remaining = requiredWorkers - confirmedWorkers

  // Determine status and color
  let displayStatus: string
  let colorClass: string
  let bgClass: string

  if (status === 'cancelled') {
    displayStatus = 'Cancelled'
    colorClass = 'text-red-700'
    bgClass = 'bg-red-100'
  } else if (status === 'completed') {
    displayStatus = 'Completed'
    colorClass = 'text-gray-700'
    bgClass = 'bg-gray-100'
  } else if (confirmedWorkers >= requiredWorkers || status === 'full') {
    displayStatus = 'Full'
    colorClass = 'text-blue-700'
    bgClass = 'bg-blue-100'
  } else if (remaining <= 2 && remaining > 0) {
    displayStatus = 'Almost Full'
    colorClass = 'text-orange-700'
    bgClass = 'bg-orange-100'
  } else {
    displayStatus = 'Open'
    colorClass = 'text-green-700'
    bgClass = 'bg-green-100'
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`${bgClass} ${colorClass} ${sizeClasses[size]} rounded-full font-medium`}>
        {displayStatus}
      </span>
      {(status === 'open' || status === 'full') && (
        <span className="text-sm text-gray-600">
          {confirmedWorkers}/{requiredWorkers} confirmed
          {remaining > 0 && ` • ${remaining} left`}
        </span>
      )}
    </div>
  )
}

interface VacancyProgressProps {
  requiredWorkers: number
  confirmedWorkers: number
  showNumbers?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function VacancyProgress({
  requiredWorkers,
  confirmedWorkers,
  showNumbers = true,
  size = 'md',
}: VacancyProgressProps) {
  const percentFilled = Math.min((confirmedWorkers / requiredWorkers) * 100, 100)
  const remaining = requiredWorkers - confirmedWorkers

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  let progressColor = 'bg-brand-500'
  if (percentFilled >= 100) {
    progressColor = 'bg-blue-500'
  } else if (percentFilled >= 80) {
    progressColor = 'bg-orange-500'
  }

  return (
    <div className="w-full">
      {showNumbers && (
        <div className="flex items-center justify-between mb-1 text-sm">
          <span className="font-medium text-gray-900">
            {confirmedWorkers} / {requiredWorkers} Workers
          </span>
          {remaining > 0 && (
            <span className="text-gray-600">{remaining} spots left</span>
          )}
          {remaining === 0 && <span className="text-blue-600 font-medium">Full</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${progressColor} ${heightClasses[size]} transition-all duration-300 ease-out`}
          style={{ width: `${percentFilled}%` }}
        />
      </div>
    </div>
  )
}
