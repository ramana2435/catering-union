import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import JobPostForm from '@/components/jobs/JobPostForm'

export default function NewJob() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!profile || profile.role !== 'provider') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <JobPostForm />
    </div>
  )
}
