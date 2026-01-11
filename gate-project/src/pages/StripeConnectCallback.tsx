import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function StripeConnectCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state') // state contains userId
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      // Handle user declining authorization
      if (error) {
        setStatus('error')
        setMessage(errorDescription || 'Failed to connect Stripe account. Authorization was declined.')
        return
      }

      // Validate required parameters
      if (!code) {
        setStatus('error')
        setMessage('Invalid callback parameters. Please try again.')
        return
      }

      if (!user) {
        setStatus('error')
        setMessage('User not authenticated. Please log in and try again.')
        return
      }

      try {
        setMessage('Connecting your Stripe account...')

        // Get Supabase URL from environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bakzzkadgmyvvvnpuvki.supabase.co'
        const functionUrl = `${supabaseUrl}/functions/v1/stripe-connect-oauth`

        // Call the edge function to complete OAuth
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            userId: user.id,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to connect Stripe account')
        }

        setStatus('success')
        setMessage('Stripe account connected successfully! Redirecting to dashboard...')

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } catch (err: any) {
        console.error('Stripe Connect error:', err)
        setStatus('error')
        setMessage(err.message || 'Failed to connect Stripe account. Please try again.')
      }
    }

    handleCallback()
  }, [searchParams, user, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-800 rounded-2xl shadow-lg mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gate</h1>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader className="w-12 h-12 text-green-800 mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting Stripe</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-12 h-12 text-green-800 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Failed</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                >
                  Return to Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
