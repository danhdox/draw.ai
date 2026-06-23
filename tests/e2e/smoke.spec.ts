import { test, expect, Page } from '@playwright/test'

async function addShape(page: Page, testId: string) {
  const before = await page.locator('[data-node-id]').count()
  await page.getByTestId(testId).first().click()
  await expect(page.locator('[data-node-id]')).toHaveCount(before + 1)
}

test.describe('draw.ai smoke', () => {
  test('renders the editor without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/')
    await expect(page.getByTestId('diagram-canvas')).toBeVisible()
    await expect(page.getByTestId('left-palette-dock')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('adds a shape from the palette', async ({ page }) => {
    await page.goto('/')
    await addShape(page, 'drawio-shape-rect')
    await expect(page.locator('[data-node-id]')).toHaveCount(1)
  })

  test('connects two nodes with the connector tool', async ({ page }) => {
    await page.goto('/')

    // Add the first node and drag it clear of the default drop position.
    await addShape(page, 'drawio-shape-rect')
    const first = page.locator('[data-node-id]').first()
    const box = await first.boundingBox()
    if (!box) throw new Error('node has no bounding box')
    // Move down into the clear canvas band (away from the left palette and
    // right inspector) so the dragged node stays clickable.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 240, { steps: 8 })
    await page.mouse.up()

    // Add the second node at the default position.
    await addShape(page, 'drawio-shape-ellipse')
    await expect(page.locator('[data-node-id]')).toHaveCount(2)

    // Enter connector mode and click source then target.
    await page.getByTestId('connector-tool').click()
    await expect(page.getByTestId('diagram-canvas')).toHaveAttribute('data-tool', 'connect')

    await page.locator('[data-node-id]').nth(0).click()
    await page.locator('[data-node-id]').nth(1).click()

    await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  })

  test('delete + undo shortcuts operate on the selection', async ({ page }) => {
    await page.goto('/')
    await addShape(page, 'drawio-shape-rect')

    await page.locator('[data-node-id]').first().click()
    await page.keyboard.press('Delete')
    await expect(page.locator('[data-node-id]')).toHaveCount(0)

    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-node-id]')).toHaveCount(1)
  })

  test('mobile viewport can add and style a shape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByTestId('shape-rect').first().click()
    await expect(page.locator('[data-node-id]')).toHaveCount(1)
    await expect(page.getByTestId('mobile-inspector')).toBeVisible()
  })
})
