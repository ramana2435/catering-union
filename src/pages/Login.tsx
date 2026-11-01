import { Link } from 'react-router-dom'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

export default function Login() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
      <p className="text-sm text-gray-500 mb-8">
        Don&#39;t have an account?{' '}
        <Link to="/signup" className="text-brand-600 font-medium hover:underline">
          Sign up
        </Link>
      </p>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Input label="Email address" type="email" placeholder="you@example.com" autoComplete="email" />
        <Input label="Password" type="password" placeholder="••••••••" autoComplete="current-password" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            Remember me
          </label>
          <Link to="/" className="text-sm text-brand-600 font-medium hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    </>
  )
}
