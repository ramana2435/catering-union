import { Link } from 'react-router-dom'
import { useTranslation } from '@/lib/i18n'
import Button from '@/components/common/Button'

export default function AccessDenied() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.accessDenied')}</h1>
          <p className="text-gray-600 mb-1">{t('admin.adminOnly')}</p>
          <p className="text-sm text-gray-500">{t('admin.contactAdmin')}</p>
        </div>

        <Link to="/dashboard">
          <Button className="w-full">{t('admin.backToDashboard')}</Button>
        </Link>
      </div>
    </div>
  )
}
