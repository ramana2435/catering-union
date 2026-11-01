import { Link } from 'react-router-dom'
import Button from '@/components/common/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-brand-600 mb-4">404</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page not found</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          Sorry, we couldn&#39;t find the page you were looking for.
        </p>
        <Link to="/">
          <Button>Go back home</Button>
        </Link>
      </div>
    </div>
  )
}
