import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { NavigationHeader } from './components'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PublicDemoPage from './pages/PublicDemoPage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import BillingPage from './pages/BillingPage'

import BlogListingPage from './pages/BlogListingPage'
import BlogPostPage from './pages/BlogPostPage'
import BotPaymentPage from './pages/BotPaymentPage'
import LogsPage from './pages/LogsPage'
import OnboardingPage from './pages/OnboardingPage'
import StripeConnectCallback from './pages/StripeConnectCallback'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />

  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <BrowserRouter>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/demo" element={<PublicDemoPage />} />
            <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
            
            <Route path="/blog" element={<BlogListingPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/bot-payment" element={<BotPaymentPage />} />
            <Route path="/stripe/connect/callback" element={
              <ProtectedRoute>
                <StripeConnectCallback />
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/logs" element={
              <ProtectedRoute>
                <LogsPage />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/onboarding" element={<OnboardingPage />} />

            <Route path="/billing" element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            } />

            <Route path="/admin/*" element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}

export default App
