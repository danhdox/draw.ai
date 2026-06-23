import { test, expect, Page } from '@playwright/test'
import { gotoEditor, addNodeAt, nodeCount, openInspectorTab } from './helpers'

async function connect(page: Page) {
  await addNodeAt(page, 'rect', 460, 250)
  await addNodeAt(page, 'ellipse', 780, 250)
  await page.getByTestId('connector-tool').click()
  await page.locator('[data-node-id]').nth(0).click()
  await page.locator('[data-node-id]').nth(1).click()
  await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  await page.keyboard.press('Escape')
}

test.describe('parity backlog', () => {
  test('drag a shape from the palette onto the canvas', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('drawio-shape-rect').dragTo(page.getByTestId('diagram-canvas'), { targetPosition: { x: 560, y: 320 } })
    await expect(page.locator('[data-node-id]')).toHaveCount(1)
  })

  test('new flowchart shapes render with their shapeKind', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('drawio-shape-stadium').click()
    await expect(page.locator('[data-node-id]').last()).toHaveAttribute('data-shape-kind', 'stadium')
    await page.getByTestId('drawio-shape-step').click()
    await expect(page.locator('[data-node-id]').last()).toHaveAttribute('data-shape-kind', 'step')
  })

  test('lock protects a node from move and delete', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 540, 280)
    await page.locator('[data-node-id]').first().click()
    await openInspectorTab(page, 'Style')
    await page.getByTestId('lock-toggle').click()
    await expect(page.locator('[data-node-id]').first()).toHaveAttribute('aria-label', /locked/)

    await page.keyboard.press('Delete')
    await expect(page.locator('[data-node-id]')).toHaveCount(1) // protected
  })

  test('edge arrowhead glyph type can be changed', async ({ page }) => {
    await gotoEditor(page)
    await connect(page)
    await openInspectorTab(page, 'Style')
    await page.getByTestId('edge-inspector').locator('select').nth(2).selectOption('diamond') // End arrow type
    await expect(page.locator('[data-edge-id] path').nth(1)).toHaveAttribute('marker-end', /diamond/)
  })

  test('node text can be bolded and aligned', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 540, 280)
    await page.locator('[data-node-id]').first().click()
    await openInspectorTab(page, 'Style')
    await page.locator('[data-testid="node-inspector"] input[type="text"]').first().fill('Hi')
    await page.getByTestId('node-text-style').getByTitle('Bold').click()
    await expect(page.locator('[data-node-id] text').first()).toHaveAttribute('font-weight', 'bold')
  })

  test('minimap appears once there is content', async ({ page }) => {
    await gotoEditor(page)
    await expect(page.getByTestId('minimap')).toHaveCount(0)
    await addNodeAt(page, 'rect', 540, 280)
    await expect(page.getByTestId('minimap')).toBeVisible()
  })
})
