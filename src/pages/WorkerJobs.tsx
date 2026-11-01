import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCateringJobs } from '@/lib/database'
import type { CateringJob } from '@/lib/database'
import JobCard from '@/components/jobs/JobCard'
import Loading from '@/components/common/Loading'

export default function WorkerJobs() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<CateringJob[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    try {
      // Load all open jobs
      const fetchedJobs = await getCateringJobs({ status: 'open' })
      setJobs(fetchedJobs)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique cities for filter
  const cities = Array.from(new Set(jobs.map((job) => job.city).filter(Boolean))) as string[]

  // Filter jobs based on search and city
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchTerm === '' ||
      job.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.area && job.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCity = filterCity === '' || job.city === filterCity

    return matchesSearch && matchesCity
  })

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Please log in to view available jobs</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Jobs</h1>
        <p className="text-gray-600">Browse and apply for catering jobs in your area</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
              <p className="text-sm text-gray-500">Total Open Jobs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredJobs.length}</p>
              <p className="text-sm text-gray-500">Matching Filters</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              📍
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cities.length}</p>
              <p className="text-sm text-gray-500">Cities Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Jobs
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by event name, location, or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by City
            </label>
            <select
              id="city"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchTerm || filterCity) && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterCity('')
              }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" label="Loading available jobs..." />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterCity ? 'No matching jobs found' : 'No jobs available'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterCity
              ? 'Try adjusting your search or filters'
              : 'Check back later for new catering opportunities'}
          </p>
          {(searchTerm || filterCity) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterCity('')
              }}
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} viewMode="worker" />
          ))}
        </div>
      )}
    </div>
  )
}
