/**
 * Corner Decorations Component
 * Adds decorative corner borders to cards
 */

interface CornerDecorationsProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CornerDecorations({ size = 'md', className = '' }: CornerDecorationsProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }

  const borderClasses = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-4',
  }

  const sizeClass = sizeClasses[size]
  const borderClass = borderClasses[size]

  return (
    <>
      {/* Top left */}
      <div className={`absolute top-0 left-0 ${sizeClass} border-t-${borderClass === 'border-2' ? '2' : '4'} border-l-${borderClass === 'border-2' ? '2' : '4'} border-black -translate-x-1 -translate-y-1 ${className}`} />
      {/* Top right */}
      <div className={`absolute top-0 right-0 ${sizeClass} border-t-${borderClass === 'border-2' ? '2' : '4'} border-r-${borderClass === 'border-2' ? '2' : '4'} border-black translate-x-1 -translate-y-1 ${className}`} />
      {/* Bottom left */}
      <div className={`absolute bottom-0 left-0 ${sizeClass} border-b-${borderClass === 'border-2' ? '2' : '4'} border-l-${borderClass === 'border-2' ? '2' : '4'} border-black -translate-x-1 translate-y-1 ${className}`} />
      {/* Bottom right */}
      <div className={`absolute bottom-0 right-0 ${sizeClass} border-b-${borderClass === 'border-2' ? '2' : '4'} border-r-${borderClass === 'border-2' ? '2' : '4'} border-black translate-x-1 translate-y-1 ${className}`} />
    </>
  )
}
