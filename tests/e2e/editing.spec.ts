import { test, expect } from '@playwright/test'
import { gotoEditor, addNodeAt, addShape, nodeCount, clickEmpty, openInspectorTab } from './helpers'

test.describe('E. editing operations', () => {
  test('copy/paste duplicates the selection', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    await page.locator('[data-node-id]').first().click()
    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    expect(await nodeCount(page)).toBe(2)
  })

  test('duplicate (Ctrl+D) clones the selection', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    await page.locator('[data-node-id]').first().click()
    await page.keyboard.press('Control+d')
    expect(await nodeCount(page)).toBe(2)
  })

  test('undo/redo via keyboard', async ({ page }) => {
    await gotoEditor(page)
    // No drag: a single addNode is one history entry so one undo removes it.
    await addShape(page, 'rect')
    expect(await nodeCount(page)).toBe(1)
    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-node-id]')).toHaveCount(0)
    await page.keyboard.press('Control+Shift+z')
    await expect(page.locator('[data-node-id]')).toHaveCount(1)
  })

  test('select all (Ctrl+A) selects every node', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)
    await clickEmpty(page)
    await page.keyboard.press('Control+a')
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(2)
  })

  test('z-order: bring to front reorders the node in the DOM', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)
    const firstId = await page.locator('[data-node-id]').nth(0).getAttribute('data-node-id')

    await page.locator('[data-node-id]').nth(0).click()
    await page.getByTestId('layers-button').click()
    await page.getByRole('menuitem', { name: 'Bring to front' }).click()

    await expect(page.locator('[data-node-id]').last()).toHaveAttribute('data-node-id', firstId!)
  })

  test('arrow keys nudge the selected node', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    await page.locator('[data-node-id]').first().click()
    const shape = page.locator('[data-node-id] rect').first()
    const x0 = parseFloat((await shape.getAttribute('x'))!)
    await page.keyboard.press('ArrowRight')
    const x1 = parseFloat((await shape.getAttribute('x'))!)
    expect(x1).toBeCloseTo(x0 + 1, 1)
    await page.keyboard.press('Shift+ArrowRight')
    const x2 = parseFloat((await shape.getAttribute('x'))!)
    expect(x2).toBeCloseTo(x1 + 20, 1) // grid size
  })

  test('a multi-step drag is a single undo step', async ({ page }) => {
    await gotoEditor(page)
    await addShape(page, 'rect') // single history entry, no drag
    const shape = page.locator('[data-node-id] rect').first()
    const x0 = parseFloat((await shape.getAttribute('x'))!)

    const box = await page.locator('[data-node-id]').first().boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2 + 160, box!.y + box!.height / 2 + 120, { steps: 12 })
    await page.mouse.up()

    const x1 = parseFloat((await shape.getAttribute('x'))!)
    expect(x1).not.toBe(x0)

    // ONE undo restores the original position and the node still exists.
    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-node-id]')).toHaveCount(1)
    expect(parseFloat((await shape.getAttribute('x'))!)).toBeCloseTo(x0, 0)
  })

  test('an inspector color edit is a single undo step', async ({ page }) => {
    await gotoEditor(page)
    await addShape(page, 'rect')
    await page.locator('[data-node-id]').first().click()
    await openInspectorTab(page, 'Style')
    const rect = page.locator('[data-node-id] rect').first()

    await page.locator('[data-testid="node-inspector"] input[type="color"]').first().fill('#ff0000')
    await expect(rect).toHaveAttribute('fill', '#ff0000')

    // Blur the field (so the shortcut isn't suppressed) and let the debounce commit.
    await clickEmpty(page)
    await page.waitForTimeout(450)
    await page.keyboard.press('Control+z')
    await expect(rect).not.toHaveAttribute('fill', '#ff0000')
  })
})
