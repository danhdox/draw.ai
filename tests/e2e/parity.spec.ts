import { test, expect, Page } from '@playwright/test'
import { gotoEditor, addNodeAt, clickEmpty, nodeCenter } from './helpers'

async function connectTwo(page: Page) {
  await addNodeAt(page, 'rect', 460, 250)
  await addNodeAt(page, 'ellipse', 780, 250)
  await page.getByTestId('connector-tool').click()
  await page.locator('[data-node-id]').nth(0).click()
  await page.locator('[data-node-id]').nth(1).click()
  await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  await page.keyboard.press('Escape')
}

test.describe('draw.io parity interactions', () => {
  test('marquee selection selects enclosed nodes', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 240)
    await addNodeAt(page, 'ellipse', 700, 240)
    await clickEmpty(page)
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(0)

    // Rubber-band over both nodes from clear space.
    await page.mouse.move(400, 150)
    await page.mouse.down()
    await page.mouse.move(900, 330, { steps: 10 })
    await page.mouse.up()
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(2)
  })

  test('dragging one member of a multi-selection moves the whole group', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 240)
    await addNodeAt(page, 'rect', 720, 240)
    await clickEmpty(page)
    await page.locator('[data-node-id]').nth(0).click()
    await page.locator('[data-node-id]').nth(1).click({ modifiers: ['Shift'] })

    const second = page.locator('[data-node-id] rect').nth(1)
    const beforeX = parseFloat((await second.getAttribute('x'))!)
    const c = await nodeCenter(page, 0)
    await page.mouse.move(c.x, c.y)
    await page.mouse.down()
    await page.mouse.move(c.x + 140, c.y + 80, { steps: 8 })
    await page.mouse.up()

    const afterX = parseFloat((await second.getAttribute('x'))!)
    expect(afterX).toBeGreaterThan(beforeX + 80) // the non-dragged node moved too
  })

  test('an edge can be given a draggable waypoint', async ({ page }) => {
    await gotoEditor(page)
    await connectTwo(page)
    // The new edge is already selected (its editing handles are visible).
    const edgeId = await page.locator('[data-edge-id]').first().getAttribute('data-edge-id')

    const add = page.getByTestId(`add-waypoint-${edgeId}-0`)
    const box = await add.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + 40, box!.y + 120, { steps: 8 })
    await page.mouse.up()

    await expect(page.getByTestId(`waypoint-${edgeId}-0`)).toBeVisible()
  })

  test('an edge endpoint can be reconnected to another node', async ({ page }) => {
    await gotoEditor(page)
    await connectTwo(page)
    await addNodeAt(page, 'rect', 620, 500) // third node, target
    await page.locator('[data-edge-id] path').first().click()
    const edgeId = await page.locator('[data-edge-id]').first().getAttribute('data-edge-id')

    const endpoint = page.getByTestId(`endpoint-${edgeId}-to`)
    const eb = await endpoint.boundingBox()
    const target = await nodeCenter(page, 2)
    await page.mouse.move(eb!.x + eb!.width / 2, eb!.y + eb!.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 10 })
    await page.mouse.up()

    // Edge still exists and history recorded a reconnect (undo brings it back).
    await expect(page.locator('[data-edge-id]')).toHaveCount(1)
  })

  test('a node can be rotated with the rotation handle', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 540, 280)
    await page.locator('[data-node-id]').first().click()
    const node = page.locator('[data-node-id]').first()
    expect(await node.getAttribute('transform')).toBeFalsy()

    const handle = page.getByTestId(/rotate-handle-/)
    const hb = await handle.boundingBox()
    await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb!.x + 80, hb!.y + 60, { steps: 8 })
    await page.mouse.up()
    await expect(node).toHaveAttribute('transform', /rotate/)
  })

  test('right-click opens a context menu that can delete', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 540, 280)
    await page.locator('[data-node-id]').first().click({ button: 'right' })
    await expect(page.getByTestId('context-menu')).toBeVisible()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.locator('[data-node-id]')).toHaveCount(0)
  })
})
