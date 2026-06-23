import { test, expect } from '@playwright/test'
import { gotoEditor, addShape } from './helpers'

function parseViewBox(vb: string) {
  const [x, y, w, h] = vb.split(/\s+/).map(Number)
  return { x, y, w, h }
}

test.describe('A. canvas navigation', () => {
  test('middle-drag pans the view', async ({ page }) => {
    await gotoEditor(page)
    const canvas = page.getByTestId('diagram-canvas')
    const before = parseViewBox((await canvas.getAttribute('viewBox'))!)

    await page.mouse.move(520, 220)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(740, 360, { steps: 8 })
    await page.mouse.up({ button: 'middle' })

    const after = parseViewBox((await canvas.getAttribute('viewBox'))!)
    expect(after.x).toBeLessThan(before.x)
    expect(after.y).toBeLessThan(before.y)
  })

  test('plain wheel pans, not zooms', async ({ page }) => {
    await gotoEditor(page)
    const canvas = page.getByTestId('diagram-canvas')
    const before = parseViewBox((await canvas.getAttribute('viewBox'))!)
    await page.mouse.move(520, 300)
    await page.mouse.wheel(0, 200)
    await expect.poll(async () => parseViewBox((await canvas.getAttribute('viewBox'))!).y).toBeGreaterThan(before.y)
    // width unchanged (no zoom)
    expect(parseViewBox((await canvas.getAttribute('viewBox'))!).w).toBeCloseTo(before.w, 0)
  })

  test('zoom controls change the zoom level', async ({ page }) => {
    await gotoEditor(page)
    await expect(page.getByTestId('zoom-percent')).toHaveText('100%')
    await page.getByTestId('zoom-in').click()
    await expect(page.getByTestId('zoom-percent')).not.toHaveText('100%')
    await page.getByTestId('zoom-percent').click() // reset
    await expect(page.getByTestId('zoom-percent')).toHaveText('100%')
    await page.getByTestId('zoom-out').click()
    await expect(page.getByTestId('zoom-percent')).not.toHaveText('100%')
  })

  test('grid pattern scales with the configured grid size', async ({ page }) => {
    await gotoEditor(page)
    await addShape(page, 'rect')
    await expect(page.locator('#grid')).toHaveAttribute('width', '20')
  })
})
