/**
 * Reusable Button Component
 * Provides consistent button styling across the application
 */

import { Loader } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all'

  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-800 border-2 border-black',
    secondary: 'bg-white text-black border-2 border-black hover:bg-gray-50',
    ghost: 'text-black hover:bg-gray-100',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  const widthClass = fullWidth ? 'w-full' : ''
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${widthClass}
        ${disabledClass}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}
