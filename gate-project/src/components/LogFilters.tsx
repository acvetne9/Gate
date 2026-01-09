import { useState } from 'react'
import { X, Search, Calendar, Filter } from 'lucide-react'
import { LogFilters as LogFiltersType } from '../hooks/useEnhancedLogs'

interface Site {
  id: string
  name: string
  domain: string
}

interface LogFiltersProps {
  filters: LogFiltersType
  onFiltersChange: (filters: Partial<LogFiltersType>) => void
  onClearFilters: () => void
  sites: Site[]
}

export const LogFilters = ({ filters, onFiltersChange, onClearFilters, sites }: LogFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false)

  const activeFiltersCount = [
    filters.siteIds.length > 0,
    filters.dateRange.start !== null || filters.dateRange.end !== null,
    filters.type !== 'all',
    filters.status !== 'all',
    filters.ipSearch !== '',
    filters.pageSearch !== ''
  ].filter(Boolean).length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6">
      {/* Filter Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {showFilters && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Multi-Site Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sites
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
              {sites.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No sites available</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.siteIds.length === 0}
                      onChange={() => onFiltersChange({ siteIds: [] })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">All Sites</span>
                  </label>
                  {sites.map((site) => (
                    <label key={site.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.siteIds.includes(site.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onFiltersChange({ siteIds: [...filters.siteIds, site.id] })
                          } else {
                            onFiltersChange({ siteIds: filters.siteIds.filter(id => id !== site.id) })
                          }
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{site.name}</p>
                        <p className="text-xs text-gray-500 truncate">{site.domain}</p>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date Range
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const newStart = e.target.value ? new Date(e.target.value) : null
                    onFiltersChange({
                      dateRange: { ...filters.dateRange, start: newStart }
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const newEnd = e.target.value ? new Date(e.target.value) : null
                    onFiltersChange({
                      dateRange: { ...filters.dateRange, end: newEnd }
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {(filters.dateRange.start || filters.dateRange.end) && (
                <button
                  onClick={() => onFiltersChange({ dateRange: { start: null, end: null } })}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => onFiltersChange({ type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Types</option>
              <option value="bot">Bot</option>
              <option value="human">Human</option>
              <option value="scraper">Scraper</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Statuses</option>
              <option value="allowed">Allowed</option>
              <option value="blocked">Blocked</option>
              <option value="challenged">Challenged</option>
            </select>
          </div>

          {/* IP Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              IP Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.ipSearch}
                onChange={(e) => {
                  // Sanitize input - allow only valid IP characters
                  const sanitized = e.target.value.replace(/[^0-9.:a-fA-F]/g, '').slice(0, 45)
                  onFiltersChange({ ipSearch: sanitized })
                }}
                placeholder="Search by IP..."
                maxLength={45}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {filters.ipSearch && (
                <button
                  onClick={() => onFiltersChange({ ipSearch: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Page Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Page Path
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.pageSearch}
                onChange={(e) => {
                  // Limit length to prevent abuse
                  const sanitized = e.target.value.slice(0, 200)
                  onFiltersChange({ pageSearch: sanitized })
                }}
                placeholder="Search by page..."
                maxLength={200}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {filters.pageSearch && (
                <button
                  onClick={() => onFiltersChange({ pageSearch: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary (when collapsed) */}
      {!showFilters && activeFiltersCount > 0 && (
        <div className="px-6 py-3 bg-gray-50 flex flex-wrap gap-2">
          {filters.siteIds.length > 0 && (
            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700">
              {filters.siteIds.length} site{filters.siteIds.length !== 1 ? 's' : ''} selected
            </span>
          )}
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700">
              Date range active
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700 capitalize">
              Type: {filters.type}
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700 capitalize">
              Status: {filters.status}
            </span>
          )}
          {filters.ipSearch && (
            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700">
              IP: {filters.ipSearch}
            </span>
          )}
          {filters.pageSearch && (
            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-700">
              Page: {filters.pageSearch}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
