import { useState } from 'react'
import type { AttendanceStatus } from '@/lib/database'
import ConfirmDialog from '@/components/common/ConfirmDialog'

interface AttendanceStatusSelectorProps {
  currentStatus: AttendanceStatus
  onStatusChange: (status: 'getting_ready' | 'on_the_way' | 'arrived') => Promise<void>
  disabled?: boolean
}

export default function AttendanceStatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
}: AttendanceStatusSelectorProps) {
  const [updating, setUpdating] = useState(false)
  const [showArrivedDialog, setShowArrivedDialog] = useState(false)

  const handleStatusClick = async (newStatus: 'getting_ready' | 'on_the_way' | 'arrived') => {
    if (disabled || updating) return

    // Show confirmation for "Arrived" status
    if (newStatus === 'arrived') {
      setShowArrivedDialog(true)
      return
    }

    // Other statuses update directly
    setUpdating(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setUpdating(false)
    }
  }

  const handleArrivedConfirm = async () => {
    setUpdating(true)
    try {
      await onStatusChange('arrived')
      setShowArrivedDialog(false)
    } finally {
      setUpdating(false)
    }
  }

  const statusOptions = [
    {
      value: 'getting_ready',
      label: 'Getting Ready',
      icon: '🏠',
      description: "I'm preparing for the job",
    },
    {
      value: 'on_the_way',
      label: 'On the Way',
      icon: '🚗',
      description: "I'm heading to the location",
    },
    {
      value: 'arrived',
      label: 'Arrived',
      icon: '📍',
      description: "I've reached the job location",
    },
  ] as const

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Update Your Status:</p>
        <div className="grid grid-cols-1 gap-3">
          {statusOptions.map((option) => {
            const isActive = currentStatus === option.value
            const isClickable = !disabled && !updating

            return (
              <button
                key={option.value}
                onClick={() => handleStatusClick(option.value)}
                disabled={!isClickable}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    isActive
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-brand-300'
                  }
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <p className={`font-semibold ${isActive ? 'text-brand-700' : 'text-gray-900'}`}>
                      {option.label}
                    </p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                  {isActive && (
                    <div className="h-6 w-6 bg-brand-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {updating && (
          <div className="text-center py-2">
            <span className="text-sm text-gray-600">Updating status...</span>
          </div>
        )}
      </div>

      {/* Arrived Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showArrivedDialog}
        onClose={() => !updating && setShowArrivedDialog(false)}
        onConfirm={handleArrivedConfirm}
        title="Confirm Arrival"
        message="Please confirm that you have arrived at the job location."
        confirmText="Yes, I've Arrived"
        cancelText="Not Yet"
        isLoading={updating}
        variant="info"
      />
    </>
  )
}
