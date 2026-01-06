/**
 * Reusable Card Component with Corner Decorations
 * Provides consistent card styling across the application
 */

import { CornerDecorations } from './CornerDecorations'

interface CardProps {
  children: React.ReactNode
  className?: string
  cornerSize?: 'sm' | 'md' | 'lg'
  withCorners?: boolean
  variant?: 'default' | 'bordered'
}

export function Card({
  children,
  className = '',
  cornerSize = 'md',
  withCorners = true,
  variant = 'default',
}: CardProps) {
  const baseClasses = 'border-2 border-black bg-white relative'
  const variantClasses = {
    default: '',
    bordered: 'shadow-lg',
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {withCorners && <CornerDecorations size={cornerSize} />}
      {children}
    </div>
  )
}
