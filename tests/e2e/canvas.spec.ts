import { test, expect } from '@playwright/test'
import { gotoEditor, addShape } from './helpers'

function parseViewBox(vb: string) {
  const [x, y, w, h] = vb.split(/\s+/).map(Number)
  return { x, y, w, h }
}

test.describe('A. canvas navigation', () => {
  test('dragging empty canvas pans the view', async ({ page }) => {
    await gotoEditor(page)
    const canvas = page.getByTestId('diagram-canvas')
    const before = parseViewBox((await canvas.getAttribute('viewBox'))!)

    // Drag across empty canvas (clear of palette/inspector/toolbar).
    await page.mouse.move(520, 200)
    await page.mouse.down()
    await page.mouse.move(720, 320, { steps: 8 })
    await page.mouse.up()

    const after = parseViewBox((await canvas.getAttribute('viewBox'))!)
    // Panning right/down moves the viewBox origin left/up.
    expect(after.x).toBeLessThan(before.x)
    expect(after.y).toBeLessThan(before.y)
  })

  test('mouse wheel zooms the view', async ({ page }) => {
    await gotoEditor(page)
    const canvas = page.getByTestId('diagram-canvas')
    const width = async () => parseViewBox((await canvas.getAttribute('viewBox'))!).w
    const before = await width()

    await page.mouse.move(520, 300)
    await page.mouse.wheel(0, 200) // zoom out -> viewBox grows
    await expect.poll(width).toBeGreaterThan(before)
    const out = await width()

    await page.mouse.wheel(0, -400) // zoom in -> viewBox shrinks
    await expect.poll(width).toBeLessThan(out)
  })

  test('grid pattern scales with the configured grid size', async ({ page }) => {
    await gotoEditor(page)
    await addShape(page, 'rect')
    // Default grid size is 20.
    await expect(page.locator('#grid')).toHaveAttribute('width', '20')
  })
})
