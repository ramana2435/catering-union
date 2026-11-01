import { Link } from 'react-router-dom'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'

const features = [
  {
    icon: '👨‍🍳',
    title: 'For Catering Workers',
    description:
      'Find flexible jobs that match your skills and schedule. Get paid fairly and build your reputation in the industry.',
    cta: 'Find Jobs',
    href: '/jobs',
  },
  {
    icon: '🏨',
    title: 'For Event Providers',
    description:
      'Access a pool of vetted, skilled catering professionals for your events. Reliable, fast, and hassle-free.',
    cta: 'Find Workers',
    href: '/workers',
  },
  {
    icon: '📍',
    title: 'Live Location Tracking',
    description:
      'Real-time GPS tracking keeps providers informed about worker arrivals, enhancing coordination and accountability.',
    cta: 'Learn More',
    href: '/',
  },
]

const stats = [
  { value: '5,000+', label: 'Registered Workers' },
  { value: '1,200+', label: 'Partner Providers' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '50+', label: 'Cities Served' },
]

export default function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff fill-opacity=0.4%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-36">
          <div className="max-w-3xl">
            <span className="inline-block bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              🚀 Now serving 50+ cities
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              The Smarter Way to Staff Your{' '}
              <span className="text-brand-200">Catering Events</span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-100 mb-10 leading-relaxed max-w-2xl">
              Catering Union connects skilled workers with top event providers. Post jobs, get hired,
              and track your team — all from one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-white text-brand-700 hover:bg-brand-50 focus:ring-white w-full sm:w-auto"
                >
                  Get Started Free
                </Button>
              </Link>
              <Link to="/jobs">
                <Button
                  size="lg"
                  variant="secondary"
                  className="border-white text-white hover:bg-white/10 focus:ring-white w-full sm:w-auto"
                >
                  Browse Jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-3xl sm:text-4xl font-bold text-brand-600">{value}</dt>
                <dd className="mt-1 text-sm text-gray-500 font-medium">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need, In One Place
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Whether you&#39;re a catering professional or an event organizer, Catering Union has the tools to make your work seamless.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map(({ icon, title, description, cta, href }) => (
              <Card key={title} variant="elevated" className="flex flex-col">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed flex-1">{description}</p>
                <div className="mt-6">
                  <Link to={href}>
                    <Button variant="secondary" size="sm">{cta}</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-brand-100 mb-8 max-w-xl mx-auto">
            Join thousands of workers and providers who trust Catering Union for their staffing needs.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50 focus:ring-white w-full sm:w-auto">
                Sign Up as Worker
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="border-white text-white hover:bg-white/10 focus:ring-white w-full sm:w-auto">
                Sign Up as Provider
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
