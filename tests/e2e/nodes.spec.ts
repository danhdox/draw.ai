import { test, expect } from '@playwright/test'
import { gotoEditor, addNodeAt, clickEmpty } from './helpers'

test.describe('C. select & manipulate nodes', () => {
  test('click selects (shows handles); empty click deselects', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 200)
    await clickEmpty(page)
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(0)

    await page.locator('[data-node-id]').first().click()
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(1)

    await clickEmpty(page)
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(0)
  })

  test('shift-click selects multiple nodes', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)
    await clickEmpty(page)

    await page.locator('[data-node-id]').nth(0).click()
    await page.locator('[data-node-id]').nth(1).click({ modifiers: ['Shift'] })
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(2)
  })

  test('drag moves a node', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    const shape = page.locator('[data-node-id] rect').first()
    const before = await shape.boundingBox()
    await page.mouse.move(460, 200)
    await page.mouse.down()
    await page.mouse.move(700, 360, { steps: 6 })
    await page.mouse.up()
    const after = await shape.boundingBox()
    expect(after!.x).toBeGreaterThan(before!.x + 100)
    expect(after!.y).toBeGreaterThan(before!.y + 80)
  })

  test('resize via the south-east handle enlarges the node', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 500, 220)
    await page.locator('[data-node-id]').first().click()
    const shape = page.locator('[data-node-id] rect').first()
    const before = await shape.boundingBox()
    // SE corner = bottom-right of the shape, where the resize handle sits.
    await page.mouse.move(before!.x + before!.width, before!.y + before!.height)
    await page.mouse.down()
    await page.mouse.move(before!.x + before!.width + 120, before!.y + before!.height + 80, { steps: 8 })
    await page.mouse.up()
    const after = await shape.boundingBox()
    expect(after!.width).toBeGreaterThan(before!.width)
    expect(after!.height).toBeGreaterThan(before!.height)
  })

  test('double-click edits node text', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    const node = page.locator('[data-node-id]').first()
    await node.dblclick({ position: { x: 30, y: 20 } })
    const input = page.locator('foreignObject input')
    await expect(input).toBeVisible()
    await input.fill('Hello')
    await input.press('Enter')
    await expect(page.locator('[data-node-id] text')).toHaveText('Hello')
  })
})
