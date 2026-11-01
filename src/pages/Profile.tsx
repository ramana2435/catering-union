import { useState, FormEvent, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Loading from '@/components/common/Loading'
import { getInitials } from '@/utils'

export default function Profile() {
  const { user, profile, updateProfile: updateAuthProfile, loading: authLoading } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    preferredLanguage: 'en',
  })

  const [errors, setErrors] = useState<{
    fullName?: string
    phoneNumber?: string
  }>({})

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        phoneNumber: profile.phone_number || '',
        preferredLanguage: profile.preferred_language || 'en',
      })
    }
  }, [profile])

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const validateForm = (): boolean => {
    const newErrors: { fullName?: string; phoneNumber?: string } = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    if (formData.phoneNumber.trim() && !/^[\d\s+\-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format'
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
      const result = await updateAuthProfile({
        full_name: formData.fullName.trim(),
        phone_number: formData.phoneNumber.trim() || null,
        preferred_language: formData.preferredLanguage,
      })

      if (result.success) {
        setSuccess('Profile updated successfully!')
        setEditMode(false)
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        phoneNumber: profile.phone_number || '',
        preferredLanguage: profile.preferred_language || 'en',
      })
    }
    setErrors({})
    setError(null)
    setEditMode(false)
  }

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Loading size="lg" label="Loading profile..." />
      </div>
    )
  }

  if (!profile || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Profile not found</div>
      </div>
    )
  }

  // Role badge colors
  const roleBadgeColors = {
    provider: 'bg-blue-100 text-blue-800',
    worker: 'bg-green-100 text-green-800',
    admin: 'bg-purple-100 text-purple-800',
  }

  // Account status badge colors
  const statusBadgeColors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    pending_verification: 'bg-yellow-100 text-yellow-800',
  }

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
    { value: 'kn', label: 'Kannada' },
    { value: 'ml', label: 'Malayalam' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-8 sm:px-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt={profile.full_name}
                  className="h-20 w-20 rounded-full border-4 border-white"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-white border-4 border-white flex items-center justify-center text-2xl font-bold text-brand-600">
                  {getInitials(profile.full_name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{profile.full_name}</h1>
              <p className="text-brand-100 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:px-8">
          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {!editMode ? (
            // Display Mode
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                  <p className="text-base text-gray-900">{profile.full_name}</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-base text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                  <p className="text-base text-gray-900">{profile.phone_number || 'Not provided'}</p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      roleBadgeColors[profile.role as keyof typeof roleBadgeColors]
                    }`}
                  >
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Preferred Language</label>
                  <p className="text-base text-gray-900">
                    {languageOptions.find((l) => l.value === profile.preferred_language)?.label || 'English'}
                  </p>
                </div>

                {/* Account Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Status</label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      statusBadgeColors[profile.account_status as keyof typeof statusBadgeColors]
                    }`}
                  >
                    {profile.account_status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <Input
                  label="Full Name"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  error={errors.fullName}
                  required
                />

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-500">
                    {user.email}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Phone Number */}
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  error={errors.phoneNumber}
                  placeholder="+1 234 567 8900"
                />

                {/* Preferred Language */}
                <div>
                  <label htmlFor="preferred-language" className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Language
                  </label>
                  <select
                    id="preferred-language"
                    value={formData.preferredLanguage}
                    onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500 transition-colors duration-200"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role (read-only) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        roleBadgeColors[profile.role as keyof typeof roleBadgeColors]
                      }`}
                    >
                      {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500">Role cannot be changed</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <Button type="submit" isLoading={loading}>
                  Save Changes
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
