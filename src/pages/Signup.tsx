import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/lib/i18n'

interface FormData {
  fullName: string
  phoneNumber: string
  email: string
  password: string
  confirmPassword: string
  role: 'provider' | 'worker'
}

interface FormErrors {
  fullName?: string
  phoneNumber?: string
  email?: string
  password?: string
  confirmPassword?: string
  role?: string
}

export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'worker',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = t('validation.fullNameRequired')
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = t('validation.fullNameMin')
    }

    // Phone number (optional but validate format if provided)
    if (formData.phoneNumber.trim() && !/^[\d\s+\-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('validation.phoneInvalid')
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = t('validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid')
    }

    // Password
    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired')
    } else if (formData.password.length < 6) {
      newErrors.password = t('validation.passwordMin')
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmPasswordRequired')
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsMismatch')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        role: formData.role,
      })

      if (result.success) {
        if (result.error) {
          // Email confirmation required
          setSuccess(result.error)
        } else {
          // Immediate success, redirect to dashboard
          navigate('/dashboard')
        }
      } else {
        // Handle specific errors
        if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
          setError(t('errors.emailExists'))
        } else if (result.error?.includes('Password')) {
          setError(result.error)
        } else {
          setError(result.error || t('errors.signUpFailed'))
        }
      }
    } catch (err) {
      setError(t('errors.unexpected'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.signUpTitle')}</h2>
      <p className="text-sm text-gray-500 mb-8">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-brand-600 font-medium hover:underline">
          {t('auth.signInLink')}
        </Link>
      </p>

      {/* Error message */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label={t('auth.fullName')}
          type="text"
          placeholder={t('auth.fullNamePlaceholder')}
          autoComplete="name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          error={errors.fullName}
          required
        />

        <Input
          label={t('auth.phoneOptional')}
          type="tel"
          placeholder={t('auth.phonePlaceholder')}
          autoComplete="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          error={errors.phoneNumber}
        />

        <Input
          label={t('auth.email')}
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          required
        />

        <Input
          label={t('auth.password')}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          helperText={t('validation.passwordMin')}
          required
        />

        <Input
          label={t('auth.confirmPassword')}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
          required
        />

        {/* Role selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('auth.selectRole')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Worker option */}
            <label
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.role === 'worker'
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-300 hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value="worker"
                checked={formData.role === 'worker'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'worker' })}
                className="sr-only"
              />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👷</span>
                <span className="font-semibold text-gray-900">{t('auth.worker')}</span>
              </div>
              <span className="text-sm text-gray-600">
                {t('auth.workerDesc')}
              </span>
            </label>

            {/* Provider option */}
            <label
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.role === 'provider'
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-300 hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value="provider"
                checked={formData.role === 'provider'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'provider' })}
                className="sr-only"
              />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏢</span>
                <span className="font-semibold text-gray-900">{t('auth.provider')}</span>
              </div>
              <span className="text-sm text-gray-600">
                {t('auth.providerDesc')}
              </span>
            </label>
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={loading}>
          {t('auth.createAccount')}
        </Button>
      </form>
    </>
  )
}
