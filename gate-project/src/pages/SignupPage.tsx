import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Starting signup process...')
      await signUp(email, password, name, website)
      console.log('Signup successful, showing success message')
      setSuccess(true)

      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      console.error('Signup failed:', err)
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
        </div>
        
        <div className="max-w-md w-full relative">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-semibold text-gray-900 mb-3 tracking-tight">Account Created!</h2>
            <p className="text-gray-600 mb-6 font-light text-lg">
              Your account has been created successfully.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
              <p className="text-sm text-green-900 font-semibold mb-2 flex items-center justify-center gap-2">
                <span className="text-lg">📧</span>
                Check your email
              </p>
              <p className="text-sm text-green-800 font-light">
                We sent a confirmation link to <strong className="font-semibold">{email}</strong>
              </p>
            </div>
            <p className="text-sm text-gray-600 font-light">
              After confirming your email, you can sign in.
            </p>
            <p className="text-xs text-gray-500 mt-4 font-light">Redirecting to login in 3 seconds...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
      </div>
      
      <div className="max-w-md w-full relative">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-300 mb-8 font-medium group hover:-translate-x-1"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm">Back to home</span>
        </Link>
        
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 justify-center group">
            <div className="w-10 h-10 rounded-lg bg-green-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900">Gate</span>
          </Link>
          <h1 className="text-4xl font-semibold text-gray-900 mb-3 tracking-tight">Create your account</h1>
          <p className="text-gray-600 text-lg font-light">Get started with bot protection</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-10">
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm text-red-800 font-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-2 font-light">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-900 mb-2">
                Website <span className="text-gray-500 font-light">(optional)</span>
              </label>
              <input
                id="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                placeholder="example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-800 text-white py-3.5 font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 font-light">
              Already have an account?{' '}
              <Link to="/login" className="text-green-800 hover:text-green-700 font-medium hover:underline transition-colors duration-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6 font-light">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
