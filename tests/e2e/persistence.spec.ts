import { test, expect } from '@playwright/test'
import { gotoEditor, addShape } from './helpers'

test.describe('Persistence (autosave/restore)', () => {
  test('autosaves the diagram and restores it after a reload', async ({ page }) => {
    await gotoEditor(page)
    await addShape(page, 'rect')
    await addShape(page, 'ellipse')
    await expect(page.locator('[data-node-id]')).toHaveCount(2)

    // Autosave is debounced (~500ms).
    await page.waitForTimeout(800)
    await page.reload()
    await expect(page.getByTestId('diagram-canvas')).toBeVisible()

    // Restored from localStorage.
    await expect(page.locator('[data-node-id]')).toHaveCount(2)
  })

  test('starts empty in a fresh context', async ({ page }) => {
    await gotoEditor(page)
    await expect(page.locator('[data-node-id]')).toHaveCount(0)
  })
})
