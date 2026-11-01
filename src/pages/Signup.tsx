import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { useAuth } from '@/contexts/AuthContext'

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
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    // Phone number (optional but validate format if provided)
    if (formData.phoneNumber.trim() && !/^[\d\s+\-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format'
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
          setError('An account with this email already exists')
        } else if (result.error?.includes('Password')) {
          setError(result.error)
        } else {
          setError(result.error || 'Failed to create account. Please try again.')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-sm text-gray-500 mb-8">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
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
          label="Full name"
          type="text"
          placeholder="Jane Smith"
          autoComplete="name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          error={errors.fullName}
          required
        />

        <Input
          label="Phone number (optional)"
          type="tel"
          placeholder="+1 234 567 8900"
          autoComplete="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          error={errors.phoneNumber}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          helperText="At least 6 characters"
          required
        />

        <Input
          label="Confirm password"
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
            I am a... <span className="text-red-500">*</span>
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
                <span className="font-semibold text-gray-900">Worker</span>
              </div>
              <span className="text-sm text-gray-600">
                I look for catering jobs and get hired
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
                <span className="font-semibold text-gray-900">Provider</span>
              </div>
              <span className="text-sm text-gray-600">
                I post catering jobs and hire workers
              </span>
            </label>
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={loading}>
          Create Account
        </Button>
      </form>
    </>
  )
}
