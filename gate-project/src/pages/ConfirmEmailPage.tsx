import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check if there's a hash in the URL (email confirmation)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    if (type === 'signup' && accessToken) {
      // Email confirmation successful
      setStatus('success')
      setMessage('Your email has been confirmed successfully!')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } else {
      // Check session to see if user is already logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('success')
          setMessage('Email confirmed! You are already logged in.')
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('Invalid or expired confirmation link.')
        }
      })
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 rounded-lg bg-green-800 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-semibold text-gray-900">Gate</span>
            </Link>
          </div>

          <div className="rounded-3xl bg-white border border-gray-200 shadow-2xl p-8">
            <div className="text-center">
              {status === 'loading' && (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                    <Loader className="w-8 h-8 text-green-800 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Confirming your email...</h2>
                  <p className="text-gray-600">Please wait a moment.</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-4">
                    <CheckCircle className="w-8 h-8 text-green-800" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email Confirmed!</h2>
                  <p className="text-gray-600 mb-4">{message}</p>
                  <p className="text-sm text-gray-500">Redirecting you to login...</p>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Confirmation Failed</h2>
                  <p className="text-gray-600 mb-6">{message}</p>
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/signup"
                      className="w-full bg-green-800 text-white py-3 px-6 font-medium hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 text-center rounded-full"
                    >
                      Sign Up Again
                    </Link>
                    <Link
                      to="/login"
                      className="w-full bg-white text-gray-700 py-3 px-6 font-medium hover:bg-gray-50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 text-center rounded-full border border-gray-300"
                    >
                      Go to Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
