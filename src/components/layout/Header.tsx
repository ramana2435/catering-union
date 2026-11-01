import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Button from '@/components/common/Button'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/utils'

export default function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Define nav links based on auth state and role
  const getNavLinks = () => {
    if (!isAuthenticated || !profile) {
      return [
        { to: '/jobs', label: 'Find Jobs' },
        { to: '/workers', label: 'Find Workers' },
        { to: '/providers', label: 'Providers' },
      ]
    }

    const links: Array<{ to: string; label: string }> = []

    if (profile.role === 'worker') {
      links.push({ to: '/jobs', label: 'Find Jobs' })
    } else if (profile.role === 'provider') {
      links.push({ to: '/workers', label: 'Find Workers' })
    }

    if (profile.role === 'admin') {
      links.push({ to: '/admin', label: 'Admin Panel' })
    }

    return links
  }

  const navLinks = getNavLinks()

  const handleLogout = async () => {
    await signOut()
    setUserMenuOpen(false)
    setMenuOpen(false)
    navigate('/login')
  }

  const firstName = profile?.full_name.split(' ')[0] || 'User'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-600">🍽️</span>
            <span className="text-xl font-bold text-gray-900">Catering Union</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'text-brand-600' : 'text-gray-600 hover:text-brand-600'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-600">Hi, {firstName}</span>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    {profile?.profile_image_url ? (
                      <img
                        src={profile.profile_image_url}
                        alt={profile.full_name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
                        {profile && getInitials(profile.full_name)}
                      </div>
                    )}
                    <svg
                      className={`h-4 w-4 text-gray-600 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* User dropdown menu */}
                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <hr className="my-2 border-gray-200" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className="block text-base font-medium text-gray-700 hover:text-brand-600"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          <div className="pt-3 border-t border-gray-100">
            {!isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-2 py-2">
                  {profile?.profile_image_url ? (
                    <img
                      src={profile.profile_image_url}
                      alt={profile.full_name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold">
                      {profile && getInitials(profile.full_name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500">{profile?.role}</p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/dashboard"
                  className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-gray-100 rounded"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
