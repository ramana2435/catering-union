import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getCateringJobs } from '@/lib/database'
import type { CateringJob } from '@/lib/database'
import JobCard from '@/components/jobs/JobCard'
import Loading from '@/components/common/Loading'
import ErrorMessage from '@/components/common/ErrorMessage'
import { toAppError, logError } from '@/lib/errors'

export default function ProviderJobs() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<CateringJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'full' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    loadJobs()
  }, [profile])

  const loadJobs = async () => {
    if (!profile) return

    setLoading(true)
    setError(null)
    try {
      const fetchedJobs = await getCateringJobs({ providerId: profile.id })
      setJobs(fetchedJobs)
    } catch (err) {
      logError(err, 'ProviderJobs.loadJobs')
      const appError = toAppError(err, 'Failed to load jobs')
      setError(appError.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs =
    filter === 'all'
      ? jobs
      : jobs.filter((job) => job.status === filter)

  const jobCounts = {
    all: jobs.length,
    open: jobs.filter((j) => j.status === 'open').length,
    full: jobs.filter((j) => j.status === 'full').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    cancelled: jobs.filter((j) => j.status === 'cancelled').length,
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Please log in to view your jobs</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Posted Jobs</h1>
          <p className="text-gray-600">Manage your catering job postings</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/provider/deleted-jobs"
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Recently Deleted</span>
          </Link>
          <Link
            to="/provider/jobs/new"
            className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          error={error}
          onRetry={loadJobs}
          className="mb-6"
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filter === 'all'
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{jobCounts.all}</p>
          <p className="text-sm text-gray-600">All Jobs</p>
        </button>

        <button
          onClick={() => setFilter('open')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filter === 'open'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-2xl font-bold text-green-600">{jobCounts.open}</p>
          <p className="text-sm text-gray-600">Open</p>
        </button>

        <button
          onClick={() => setFilter('full')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filter === 'full'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-2xl font-bold text-blue-600">{jobCounts.full}</p>
          <p className="text-sm text-gray-600">Full</p>
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filter === 'completed'
              ? 'border-gray-500 bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-2xl font-bold text-gray-600">{jobCounts.completed}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </button>

        <button
          onClick={() => setFilter('cancelled')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filter === 'cancelled'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-2xl font-bold text-red-600">{jobCounts.cancelled}</p>
          <p className="text-sm text-gray-600">Cancelled</p>
        </button>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" label="Loading your jobs..." />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No jobs posted yet' : `No ${filter} jobs`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? 'Start by posting your first catering job'
              : `You don't have any ${filter} jobs at the moment`}
          </p>
          {filter === 'all' && (
            <Link
              to="/provider/jobs/new"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
              <span>➕</span>
              <span>Post Your First Job</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} viewMode="provider" />
          ))}
        </div>
      )}
    </div>
  )
}
