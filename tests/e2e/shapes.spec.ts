import { test, expect } from '@playwright/test'
import { gotoEditor, nodeCount } from './helpers'

// icon -> expected data-shape-kind rendered on canvas
const SHAPES: Array<[string, string]> = [
  ['rect', 'rect'],
  ['rounded', 'rounded'],
  ['text', 'text'],
  ['ellipse', 'ellipse'],
  ['square', 'rect'],
  ['circle', 'ellipse'],
  ['diamond', 'diamond'],
  ['parallelogram', 'parallelogram'],
  ['hexagon', 'hexagon'],
  ['triangle', 'triangle'],
  ['trapezoid', 'trapezoid'],
  ['chevron', 'chevron'],
  ['database', 'cylinder'],
  ['cloud', 'cloud'],
  ['document', 'document'],
  ['note', 'note'],
]

test.describe('B. shape library render parity', () => {
  test('every palette shape adds a node with the matching shapeKind', async ({ page }) => {
    await gotoEditor(page)
    for (let i = 0; i < SHAPES.length; i++) {
      const [icon, expectedKind] = SHAPES[i]
      await page.getByTestId(`drawio-shape-${icon}`).first().click()
      await expect(page.locator('[data-node-id]')).toHaveCount(i + 1)
      const last = page.locator('[data-node-id]').last()
      await expect(last).toHaveAttribute('data-shape-kind', expectedKind)
    }
  })

  test('text node is rendered and selectable', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('drawio-shape-text').first().click()
    const textNode = page.locator('[data-node-type="text"]').first()
    await textNode.click({ position: { x: 12, y: 12 } })
    // selection shows a connection handle
    await expect(page.locator('[data-testid^="connect-handle-"]')).toHaveCount(1)
  })

  test('connector palette item enters connect mode without adding a node', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('drawio-connector-arrow').first().click()
    await expect(page.getByTestId('diagram-canvas')).toHaveAttribute('data-tool', 'connect')
    expect(await nodeCount(page)).toBe(0)
  })

  test('palette search filters the shape grid', async ({ page }) => {
    await gotoEditor(page)
    await expect(page.getByTestId('drawio-shape-rect')).toBeVisible()
    await page.getByTestId('palette-search').fill('cloud')
    await expect(page.getByTestId('drawio-shape-cloud')).toBeVisible()
    await expect(page.getByTestId('drawio-shape-rect')).toHaveCount(0)
    await page.getByTestId('palette-search').fill('zzz no match')
    await expect(page.getByTestId('drawio-general-shape-grid')).toHaveCount(0)
  })
})
