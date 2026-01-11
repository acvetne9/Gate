import { describe, it, expect } from 'vitest'
import { planLimits, stripeConfig } from './stripe'

describe('planLimits', () => {
  describe('keeper plan', () => {
    it('has features defined', () => {
      expect(planLimits.keeper.features.length).toBeGreaterThan(0)
    })

    it('mentions $1.00 bot payment price', () => {
      const hasPrice = planLimits.keeper.features.some(f => f.includes('$1.00'))
      expect(hasPrice).toBe(true)
    })

    it('mentions 50/50 revenue split', () => {
      const hasSplit = planLimits.keeper.features.some(f => f.includes('50/50'))
      expect(hasSplit).toBe(true)
    })
  })

  describe('max plan', () => {
    it('has features defined', () => {
      expect(planLimits.max.features.length).toBeGreaterThan(0)
    })

    it('mentions setting any price', () => {
      const hasCustomPrice = planLimits.max.features.some(f => f.toLowerCase().includes('any'))
      expect(hasCustomPrice).toBe(true)
    })

    it('mentions 90/10 revenue split', () => {
      const hasSplit = planLimits.max.features.some(f => f.includes('90'))
      expect(hasSplit).toBe(true)
    })
  })
})

describe('stripeConfig', () => {
  it('has publishable key', () => {
    expect(stripeConfig.publishableKey).toBeTruthy()
    expect(stripeConfig.publishableKey).toMatch(/^pk_/)
  })

  it('has product IDs for both plans', () => {
    expect(stripeConfig.prices.keeper).toMatch(/^prod_/)
    expect(stripeConfig.prices.max).toMatch(/^prod_/)
  })

  it('keeper and max have different product IDs', () => {
    expect(stripeConfig.prices.keeper).not.toBe(stripeConfig.prices.max)
  })
})
