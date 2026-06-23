import { test, expect } from '@playwright/test'

test.describe('Launch hardening', () => {
  test('serves security headers', async ({ page }) => {
    const res = await page.goto('/')
    const headers = res!.headers()
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('exposes favicon, OG image, and robots', async ({ request }) => {
    expect((await request.get('/icon.svg')).status()).toBe(200)
    expect((await request.get('/opengraph-image')).status()).toBe(200)
    const robots = await request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect((await robots.text()).toLowerCase()).toContain('user-agent: *')
  })
})
