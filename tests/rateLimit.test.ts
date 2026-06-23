import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, resetRateLimits } from '@/lib/rateLimit'

beforeEach(() => resetRateLimits())

describe('rateLimit', () => {
  it('allows requests under the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('k', 5, 1000, 1000).ok).toBe(true)
    }
  })

  it('blocks once the limit is reached and reports retryAfter', () => {
    for (let i = 0; i < 5; i++) rateLimit('k', 5, 1000, 1000)
    const blocked = rateLimit('k', 5, 1000, 1500)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('resets after the window elapses', () => {
    rateLimit('k', 1, 1000, 1000)
    expect(rateLimit('k', 1, 1000, 1500).ok).toBe(false)
    expect(rateLimit('k', 1, 1000, 2500).ok).toBe(true)
  })

  it('tracks separate keys independently', () => {
    rateLimit('a', 1, 1000, 1000)
    expect(rateLimit('a', 1, 1000, 1000).ok).toBe(false)
    expect(rateLimit('b', 1, 1000, 1000).ok).toBe(true)
  })
})
