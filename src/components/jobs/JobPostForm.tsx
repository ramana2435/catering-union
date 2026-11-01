import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { createCateringJob } from '@/lib/database'
import type { CateringJobInsert } from '@/lib/database'

export default function JobPostForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    event_date: '',
    start_time: '',
    end_time: '',
    required_workers: 1,
    address: '',
    area: '',
    city: '',
    district: '',
    description: '',
    contact_person: '',
    contact_number: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile) {
      setError('You must be logged in to post a job')
      return
    }

    if (profile.role !== 'provider') {
      setError('Only providers can post jobs')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const jobData: CateringJobInsert = {
        provider_id: profile.id,
        event_name: formData.event_name,
        event_type: formData.event_type || null,
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        required_workers: formData.required_workers,
        address: formData.address,
        area: formData.area || null,
        city: formData.city || null,
        district: formData.district || null,
        description: formData.description || null,
        contact_person: formData.contact_person || null,
        contact_number: formData.contact_number || null,
        status: 'open',
      }

      const newJob = await createCateringJob(jobData)

      if (!newJob) {
        throw new Error('Failed to create job')
      }

      // Navigate to provider jobs page
      navigate(`/provider/jobs`)
    } catch (err) {
      console.error('Error creating job:', err)
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Post a New Job</h2>
        <p className="text-sm text-gray-600">Fill in the details about your catering event</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Event Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Event Information</h3>
        
        <div>
          <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="event_name"
            name="event_name"
            required
            value={formData.event_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g., Wedding Reception, Corporate Event"
          />
        </div>

        <div>
          <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            id="event_type"
            name="event_type"
            value={formData.event_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Select type</option>
            <option value="wedding">Wedding</option>
            <option value="birthday">Birthday Party</option>
            <option value="corporate">Corporate Event</option>
            <option value="festival">Festival</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
              Event Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              required
              value={formData.event_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="required_workers" className="block text-sm font-medium text-gray-700 mb-1">
            Required Workers <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="required_workers"
            name="required_workers"
            required
            min="1"
            value={formData.required_workers}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Describe the event and any special requirements..."
          />
        </div>
      </div>

      {/* Location Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Location</h3>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Full Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g., 123 Main Street"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <input
              type="text"
              id="area"
              name="area"
              value={formData.area}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="e.g., Downtown"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="e.g., Mumbai"
            />
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <input
              type="text"
              id="district"
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="e.g., Maharashtra"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

        <div>
          <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            id="contact_person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Name of contact person"
          />
        </div>

        <div>
          <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Number
          </label>
          <input
            type="tel"
            id="contact_number"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="+91 1234567890"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-brand-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Posting Job...' : 'Post Job'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
