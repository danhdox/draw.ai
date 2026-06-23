import { test, expect, Page } from '@playwright/test'
import { gotoEditor, addNodeAt, clickEmpty, openInspectorTab } from './helpers'

async function connect(page: Page) {
  await addNodeAt(page, 'rect', 460, 250)
  await addNodeAt(page, 'ellipse', 780, 250)
  await page.getByTestId('connector-tool').click()
  await page.locator('[data-node-id]').nth(0).click()
  await page.locator('[data-node-id]').nth(1).click()
  await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  await page.keyboard.press('Escape')
}

test.describe('F. inspector & styling', () => {
  test('diagram tab: counts, grid size, snap toggle', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)
    await clickEmpty(page)

    const grid = page.locator('input[type="number"]').first()
    await grid.fill('40')
    await expect(page.locator('#grid')).toHaveAttribute('width', '40')

    const snap = page.getByRole('button', { name: /^On$|^Off$/ })
    await expect(snap).toHaveText('On')
    await snap.click()
    await expect(snap).toHaveText('Off')
  })

  test('node inspector edits text, size, fill', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    await page.locator('[data-node-id]').first().click()
    await openInspectorTab(page, 'Style')
    await expect(page.getByTestId('node-inspector')).toBeVisible()

    await page.locator('[data-testid="node-inspector"] input[type="text"]').first().fill('Renamed')
    await expect(page.locator('[data-node-id] text')).toHaveText('Renamed')

    await page.locator('[data-testid="node-inspector"] input[type="number"]').nth(2).fill('250') // Width
    await expect(page.locator('[data-node-id] rect').first()).toHaveAttribute('width', '250')

    await page.locator('[data-testid="node-inspector"] input[type="color"]').first().fill('#ff0000')
    await expect(page.locator('[data-node-id] rect').first()).toHaveAttribute('fill', '#ff0000')
  })

  test('multi-select shows mixed values and applies batch edits', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'database', 460, 200) // text "Data"
    await addNodeAt(page, 'cloud', 760, 200) // text "Cloud"
    await clickEmpty(page)

    await page.locator('[data-node-id]').nth(0).click()
    await page.locator('[data-node-id]').nth(1).click({ modifiers: ['Shift'] })
    await openInspectorTab(page, 'Style')

    const textInput = page.locator('[data-testid="node-inspector"] input[type="text"]').first()
    await expect(textInput).toHaveAttribute('placeholder', 'Mixed')

    await textInput.fill('Same')
    await expect(page.locator('[data-node-id] text')).toHaveText(['Same', 'Same'])
  })

  test('edge inspector edits label, route, dashed, and arrowhead', async ({ page }) => {
    await gotoEditor(page)
    await connect(page)
    await openInspectorTab(page, 'Style')
    await expect(page.getByTestId('edge-inspector')).toBeVisible()

    // Label
    await page.locator('[data-testid="edge-inspector"] input[type="text"]').first().fill('yes')
    await expect(page.locator('[data-edge-id] text')).toHaveText('yes')

    // Route -> orthogonal produces an elbow path (more L segments)
    await page.locator('[data-testid="edge-inspector"] select').selectOption('orthogonal')
    const d = await page.locator('[data-edge-id] path').first().getAttribute('d')
    expect((d!.match(/L/g) || []).length).toBeGreaterThanOrEqual(3)

    // Dashed toggle
    await page.locator('[data-testid="edge-inspector"] input[type="checkbox"]').nth(2).check()
    await expect(page.locator('[data-edge-id] path').nth(1)).toHaveAttribute('stroke-dasharray', /.+/)

    // End arrowhead off removes the marker
    await page.locator('[data-testid="edge-inspector"] input[type="checkbox"]').nth(1).uncheck()
    await expect(page.locator('[data-edge-id] path').nth(1)).not.toHaveAttribute('marker-end', /.+/)
  })

  test('inspector swaps between node and edge panels', async ({ page }) => {
    await gotoEditor(page)
    await connect(page)
    await openInspectorTab(page, 'Style')
    await expect(page.getByTestId('edge-inspector')).toBeVisible()

    await clickEmpty(page)
    await page.locator('[data-node-id]').nth(0).click()
    await expect(page.getByTestId('node-inspector')).toBeVisible()
    await expect(page.getByTestId('edge-inspector')).toHaveCount(0)
  })
})
