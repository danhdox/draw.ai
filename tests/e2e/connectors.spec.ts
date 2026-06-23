import { test, expect } from '@playwright/test'
import { gotoEditor, addNodeAt, edgeCount, clickEmpty, nodeCenter } from './helpers'

test.describe('D. connectors', () => {
  test('connector tool: click source then target creates an edge', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 250)
    await addNodeAt(page, 'ellipse', 780, 250)
    await page.getByTestId('connector-tool').click()
    await expect(page.getByTestId('diagram-canvas')).toHaveAttribute('data-tool', 'connect')
    await page.locator('[data-node-id]').nth(0).click()
    await page.locator('[data-node-id]').nth(1).click()
    await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  })

  test('preview line follows the pointer between clicks', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 250)
    await addNodeAt(page, 'ellipse', 780, 250)
    await page.getByTestId('connector-tool').click()
    await page.locator('[data-node-id]').nth(0).click()

    const preview = page.locator('line[stroke="#16a34a"]')
    await page.mouse.move(600, 300)
    await expect(preview).toBeVisible()
    const x1 = await preview.getAttribute('x2')
    await page.mouse.move(700, 450)
    const x2 = await preview.getAttribute('x2')
    expect(x1).not.toBe(x2)
  })

  test('drag from a node connection handle creates an edge', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 250)
    await addNodeAt(page, 'ellipse', 780, 250)
    await page.locator('[data-node-id]').nth(0).click()

    const handle = page.locator('[data-testid^="connect-handle-"]').first()
    const hb = await handle.boundingBox()
    const target = await nodeCenter(page, 1)
    await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 8 })
    await page.mouse.up()
    await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  })

  test('self-connection is rejected', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 250)
    await page.getByTestId('connector-tool').click()
    await page.locator('[data-node-id]').first().click()
    await page.locator('[data-node-id]').first().click()
    expect(await edgeCount(page)).toBe(0)
  })

  test('releasing a handle drag over empty canvas creates no edge', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 250)
    await page.locator('[data-node-id]').first().click()
    const handle = page.locator('[data-testid^="connect-handle-"]').first()
    const hb = await handle.boundingBox()
    await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2)
    await page.mouse.down()
    await page.mouse.move(850, 500, { steps: 6 })
    await page.mouse.up()
    expect(await edgeCount(page)).toBe(0)
  })

  test('Escape exits connect mode', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('connector-tool').click()
    await expect(page.getByTestId('diagram-canvas')).toHaveAttribute('data-tool', 'connect')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('diagram-canvas')).toHaveAttribute('data-tool', 'select')
  })

  test('edge can be selected, deleted, and restored with undo', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 250)
    await addNodeAt(page, 'ellipse', 780, 250)
    await page.getByTestId('connector-tool').click()
    await page.locator('[data-node-id]').nth(0).click()
    await page.locator('[data-node-id]').nth(1).click()
    await expect(page.locator('[data-edge-id]')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await clickEmpty(page)
    await page.locator('[data-edge-id] path').first().click()
    await page.keyboard.press('Delete')
    await expect(page.locator('[data-edge-id]')).toHaveCount(0)

    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  })
})
