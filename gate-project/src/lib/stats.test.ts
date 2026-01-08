import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ count: 5, error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ count: 10, error: null })),
      })),
    })),
  },
}))

// Mock fetch for worker stats
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { getSiteStats, getGlobalStats, getAdminStats } from './stats'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSiteStats', () => {
  it('returns stats for a site', async () => {
    const { supabase } = await import('./supabase')
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation((field, values) => {
        if (values.includes('challenged')) return Promise.resolve({ count: 3, error: null })
        if (values.includes('allowed_paid')) return Promise.resolve({ count: 7, error: null })
        return Promise.resolve({ count: 10, error: null })
      }),
    }
    vi.mocked(supabase.from).mockReturnValue(mockChain as any)

    const stats = await getSiteStats('site-123')
    expect(stats).toHaveProperty('totalRequests')
    expect(stats).toHaveProperty('botsBlocked')
    expect(stats).toHaveProperty('requestsAllowed')
  })
})

describe('getGlobalStats', () => {
  it('fetches from worker stats endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        totalRequests: 500,
        totals: { bots_blocked: 100, bots_challenged: 200, humans_allowed: 150, humans_challenged: 50 },
      })),
    })

    const stats = await getGlobalStats()
    expect(stats.totalRequests).toBe(500)
    expect(stats.botsBlocked).toBe(300) // bots_blocked + bots_challenged
  })

  it('returns zeros when worker stats fail', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    const stats = await getGlobalStats()
    expect(stats.totalRequests).toBe(0)
    expect(stats.botsBlocked).toBe(0)
  })
})

describe('getAdminStats', () => {
  it('returns admin metrics', async () => {
    const { supabase } = await import('./supabase')
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ count: 5, error: null }),
      gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
    }
    // Chain: select -> in -> gte
    mockChain.select.mockReturnValue({
      ...mockChain,
      in: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue(mockChain as any)

    const stats = await getAdminStats()
    expect(stats).toHaveProperty('totalCustomers')
    expect(stats).toHaveProperty('totalSites')
    expect(stats).toHaveProperty('requestsToday')
    expect(stats).toHaveProperty('botsBlockedToday')
  })
})
