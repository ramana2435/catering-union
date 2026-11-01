import { Link } from 'react-router-dom'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

export default function Signup() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-sm text-gray-500 mb-8">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Input label="Full name" type="text" placeholder="Jane Smith" autoComplete="name" />
        <Input label="Email address" type="email" placeholder="you@example.com" autoComplete="email" />
        <Input label="Password" type="password" placeholder="••••••••" autoComplete="new-password" />
        <Input label="Confirm password" type="password" placeholder="••••••••" autoComplete="new-password" />
        <Button type="submit" className="w-full">
          Create Account
        </Button>
      </form>
    </>
  )
}
