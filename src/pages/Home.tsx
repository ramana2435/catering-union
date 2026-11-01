import { Link } from 'react-router-dom'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-brand-50 to-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Connect. Work. Grow.
            <span className="block text-brand-600 mt-2">Your Catering Career Starts Here</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join the premier platform connecting skilled catering professionals with top providers across the industry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link to="/jobs">
              <Button size="lg" variant="secondary">Browse Jobs</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Catering Union?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="elevated">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Perfect Matches</h3>
              <p className="text-gray-600">
                Smart matching connects workers with opportunities that fit their skills and schedule.
              </p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="text-center">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600">
                Stay informed with live location updates and job status notifications.
              </p>
            </div>
          </Card>
          <Card variant="elevated">
            <div className="text-center">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Grow Your Business</h3>
              <p className="text-gray-600">
                Access a verified pool of talented catering professionals ready to work.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brand-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Catering Career?</h2>
          <p className="text-lg mb-8 text-brand-100">
            Join thousands of professionals already using Catering Union to find their next opportunity.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary">Join Now - It's Free</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
