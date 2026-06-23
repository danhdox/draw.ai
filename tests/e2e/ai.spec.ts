import { test, expect } from '@playwright/test'
import { gotoEditor, addNodeAt, nodeCount, openAgentPanel as openAgent } from './helpers'

// The e2e server runs with OPENAI_API_KEY="" so every AI action uses the
// deterministic offline path (no network, no credits).

test.describe('H. AI agent (offline)', () => {
  test('generate produces a diff preview that applies and undoes', async ({ page }) => {
    await gotoEditor(page)
    await openAgent(page)
    await page.getByTestId('agent-prompt').fill('login then dashboard then logout')
    await page.getByTestId('agent-submit').click()

    const apply = page.getByTestId('agent-diff-apply').first()
    await expect(apply).toBeVisible({ timeout: 20_000 })
    expect(await nodeCount(page)).toBe(0) // preview only, not yet applied

    await apply.click()
    expect(await nodeCount(page)).toBeGreaterThanOrEqual(2)

    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-node-id]')).toHaveCount(0)
  })

  test('reject discards the proposed diff', async ({ page }) => {
    await gotoEditor(page)
    await openAgent(page)
    await page.getByTestId('agent-prompt').fill('alpha then beta')
    await page.getByTestId('agent-submit').click()

    const reject = page.getByTestId('agent-diff-reject').first()
    await expect(reject).toBeVisible({ timeout: 20_000 })
    await reject.click()
    expect(await nodeCount(page)).toBe(0)
  })

  test('cleanup layout works without an API key', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 320)
    await openAgent(page)
    await page.getByTestId('agent-action-cleanup').click()

    // The sticky preview is bound to the store and reflects applied/rejected state.
    const apply = page.getByTestId('agent-diff-sticky').getByTestId('agent-diff-apply')
    await expect(apply).toBeVisible({ timeout: 20_000 })
    await apply.click()
    // Nodes survive the cleanup and the diff registers as applied.
    expect(await nodeCount(page)).toBe(2)
    await expect(apply).toHaveText(/Applied/)
  })

  test('explain returns offline guidance text', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    await openAgent(page)
    await page.getByTestId('agent-action-explain').click()
    await expect(page.getByTestId('agent-panel')).toContainText(/OPENAI_API_KEY/i, { timeout: 20_000 })
  })
})
