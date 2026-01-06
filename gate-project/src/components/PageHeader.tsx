/**
 * Reusable Page Header Component
 * Provides consistent page headers with optional underline
 */

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  withUnderline?: boolean
}

export function PageHeader({ title, subtitle, actions, withUnderline = false }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-4xl font-bold text-black mb-2">{title}</h1>
        {withUnderline && <div className="w-24 h-1 bg-black mb-2" />}
        {subtitle && (
          <p className="text-xl text-gray-600 max-w-2xl font-mono">{subtitle}</p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )
}
