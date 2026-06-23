import { test, expect } from '@playwright/test'
import { gotoEditor } from './helpers'

test.describe('K. responsive / mobile', () => {
  test.describe('mobile 390x844', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('add, select, and reach the agent panel on mobile', async ({ page }) => {
      await gotoEditor(page)
      await page.getByTestId('shape-rect').first().click()
      await expect(page.locator('[data-node-id]')).toHaveCount(1)
      await expect(page.getByTestId('mobile-inspector')).toBeVisible()

      // New shapes drop clear of the toolbar/sheet on mobile (K5 fix), so the
      // node is selectable on the canvas.
      await page.locator('[data-node-id]').first().click()
      await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(1)

      // Agent tab reachable in the bottom sheet (Tabs render plain buttons).
      await page.getByRole('button', { name: 'Agent', exact: true }).first().click()
      await expect(page.getByTestId('agent-panel')).toBeVisible()
    })
  })

  test.describe('desktop panel collapse', () => {
    test('palette collapse swaps to the compact rail', async ({ page }) => {
      await gotoEditor(page)
      await expect(page.getByTestId('drawio-shape-rect')).toBeVisible()
      await page.getByTestId('palette-collapse-toggle').click()
      await expect(page.getByTestId('drawio-shape-rect')).toBeHidden()
      await expect(page.getByTestId('shape-rect')).toBeVisible()
    })

    test('inspector collapse shows the compact rail', async ({ page }) => {
      await gotoEditor(page)
      await page.getByTestId('inspector-collapse-toggle').first().click()
      await expect(page.getByTestId('inspector-compact-rail')).toBeVisible()
    })
  })
})
