import { Page, expect } from '@playwright/test'

// Clear canvas band on the 1280x720 desktop viewport (between the left palette
// ~280px and the right inspector starting ~940px, below the 49px top nav and
// above the bottom toolbar).
export const CLEAR = { x: 520, y: 150 }

export async function gotoEditor(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('diagram-canvas')).toBeVisible()
}

export async function nodeCount(page: Page) {
  return page.locator('[data-node-id]').count()
}

export async function edgeCount(page: Page) {
  return page.locator('[data-edge-id]').count()
}

// Click a palette shape and wait for the node count to increase by one.
export async function addShape(page: Page, icon: string) {
  const before = await nodeCount(page)
  await page.getByTestId(`drawio-shape-${icon}`).first().click()
  await expect(page.locator('[data-node-id]')).toHaveCount(before + 1)
}

// Add a shape then drag the new (top-most, last) node to a clear screen target.
export async function addNodeAt(page: Page, icon: string, tx: number, ty: number) {
  await addShape(page, icon)
  const node = page.locator('[data-node-id]').last()
  const box = await node.boundingBox()
  if (!box) throw new Error('node has no bounding box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(tx, ty, { steps: 6 })
  await page.mouse.up()
}

export async function clickEmpty(page: Page) {
  await page.mouse.click(CLEAR.x, CLEAR.y)
}

// Center of a node's on-screen bounding box.
export async function nodeCenter(page: Page, index: number) {
  const box = await page.locator('[data-node-id]').nth(index).boundingBox()
  if (!box) throw new Error('node has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export async function openInspectorTab(page: Page, name: 'Diagram' | 'Style') {
  await page.getByRole('tab', { name, exact: true }).first().click()
}

export async function openAgentPanel(page: Page) {
  await page.getByRole('tab', { name: 'Agent', exact: true }).first().click()
  await expect(page.getByTestId('agent-panel')).toBeVisible()
}

// Click a node at its shape center (avoids the bbox corners that fall outside
// ellipses/paths and land on the canvas background).
export async function clickNode(page: Page, index: number, opts: { shift?: boolean } = {}) {
  await page
    .locator('[data-node-id]')
    .nth(index)
    .click(opts.shift ? { modifiers: ['Shift'] } : {})
}
