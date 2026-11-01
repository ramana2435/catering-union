/**
 * Offline Indicator Component
 * Shows when user is offline with a dismissible banner
 */

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useTranslation } from '@/lib/i18n'
import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus()
  const { t } = useTranslation()
  const [showReconnected, setShowReconnected] = useState(false)

  // Show reconnection message briefly
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  // Don't show anything if online and haven't been offline
  if (isOnline && !showReconnected) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-yellow-600 text-white'
      }`}
      role="alert"
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{t('network.reconnected')}</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span>{t('network.offline')}</span>
          </>
        )}
      </div>
    </div>
  )
}
