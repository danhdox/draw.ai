import { test, expect } from '@playwright/test'
import { gotoEditor, addNodeAt, nodeCount } from './helpers'

test.describe('G. keyboard shortcuts', () => {
  test('shortcuts are suppressed while typing in a field', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)

    // Select exactly one node.
    await page.locator('[data-node-id]').nth(0).click()
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(1)

    // Focus a form field (inspector grid-size input) and fire destructive keys.
    const gridInput = page.locator('input[type="number"]').first()
    await gridInput.click()
    await page.keyboard.press('Delete')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Control+a')

    // Nodes are untouched and select-all did not fire.
    expect(await nodeCount(page)).toBe(2)
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(1)
  })

  test('Delete works when the canvas (not a field) has focus', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    await page.locator('[data-node-id]').first().click()
    await page.keyboard.press('Delete')
    expect(await nodeCount(page)).toBe(0)
  })
})
