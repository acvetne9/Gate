import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { launchComprehensiveAttack } from './comprehensiveAttack.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('launchComprehensiveAttack', () => {
  it('calls the test endpoint with target URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        timestamp: new Date().toISOString(),
        duration: 5000,
        summary: { total: 15, passed: 14, failed: 1, errors: 0, score: 93 },
        results: [
          { test: 'bot_ua', bot: 'GPTBot', passed: true, verdict: 'challenge_served', responseTime: 200 },
        ],
      }),
    })

    const result = await launchComprehensiveAttack('https://example.com')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/functions/v1/run-bot-tests')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.targetUrl).toBe('https://example.com')
  })

  it('returns summary with stats', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        timestamp: new Date().toISOString(),
        duration: 3000,
        summary: { total: 10, passed: 8, failed: 2, errors: 0, score: 80 },
        results: [],
      }),
    })

    const result = await launchComprehensiveAttack('https://example.com')
    expect(result.summary.total).toBe(10)
    expect(result.summary.passed).toBe(8)
    expect(result.summary.failed).toBe(2)
  })

  it('calls onLog callback for each result', async () => {
    const results = [
      { test: 'bot_ua', bot: 'curl', passed: true, verdict: 'challenge_served', responseTime: 100 },
      { test: 'bot_ua', bot: 'GPTBot', passed: true, verdict: 'redirected_to_payment', responseTime: 200 },
      { test: 'empty_ua', bot: 'No UA', passed: true, verdict: 'challenge_served', responseTime: 150 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        timestamp: new Date().toISOString(),
        duration: 1000,
        summary: { total: 3, passed: 3, failed: 0, errors: 0, score: 100 },
        results,
      }),
    })

    const logs = []
    await launchComprehensiveAttack('https://example.com', (log) => logs.push(log))

    expect(logs.length).toBe(3)
    expect(logs[0].bot).toBe('curl')
    expect(logs[0].testPassed).toBe(true)
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))

    const logs = []
    const result = await launchComprehensiveAttack('https://example.com', (log) => logs.push(log))

    expect(result.summary.errors).toBe(1)
    expect(result.summary.total).toBe(0)
    expect(logs.length).toBe(1)
    expect(logs[0].status).toBe('error')
  })

  it('handles non-200 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal server error'),
    })

    const result = await launchComprehensiveAttack('https://example.com')
    expect(result.summary.errors).toBe(1)
  })
})
