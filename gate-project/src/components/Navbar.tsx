import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user } = useAuth()

  const dashboardLink = user?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <nav className="border-b border-white/10 bg-gradient-to-r from-slate-900/80 via-blue-900/80 to-purple-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg group-hover:shadow-blue-500/50 transition-all">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Gate
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              to="/demo"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
            >
              Demo
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300" />
            </Link>
            {user && (
              <Link
                to={dashboardLink}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
              >
                Dashboard
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300" />
              </Link>
            )}
            {!user && (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-purple-500/50"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
