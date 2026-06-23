import { test, expect, Page } from '@playwright/test'
import fs from 'fs'
import { gotoEditor, addNodeAt, nodeCount } from './helpers'

async function download(page: Page, trigger: () => Promise<void>) {
  const [dl] = await Promise.all([page.waitForEvent('download'), trigger()])
  const path = await dl.path()
  return { name: dl.suggestedFilename(), size: fs.statSync(path).size, path }
}

test.describe('I. file operations', () => {
  test('save downloads valid JSON and round-trips through open', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)

    const saved = await download(page, () => page.getByRole('button', { name: 'Save' }).click())
    expect(saved.name).toBe('diagram.json')
    const json = fs.readFileSync(saved.path, 'utf-8')
    expect(JSON.parse(json).nodes).toHaveLength(2)
    await expect(page.getByTestId('toast-success')).toBeVisible()

    // New (confirm) clears the canvas.
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.locator('[data-node-id]')).toHaveCount(0)

    // Open the saved JSON restores it.
    await page.getByTestId('open-menu').click()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('menuitem', { name: /Open JSON/ }).click(),
    ])
    await chooser.setFiles({ name: 'd.json', mimeType: 'application/json', buffer: Buffer.from(json) })
    await expect(page.locator('[data-node-id]')).toHaveCount(2)
  })

  test('opening invalid JSON shows an error toast (no crash)', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('open-menu').click()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('menuitem', { name: /Open JSON/ }).click(),
    ])
    await chooser.setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{ not valid') })
    await expect(page.getByTestId('toast-error')).toBeVisible()
    expect(await nodeCount(page)).toBe(0)
  })

  test('imports a Mermaid flowchart from a file', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('open-menu').click()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('menuitem', { name: /Import Mermaid/ }).click(),
    ])
    const mermaid = 'flowchart TD\nA[Start] --> B{Decision}\nB -->|yes| C(Done)'
    await chooser.setFiles({ name: 'd.mmd', mimeType: 'text/plain', buffer: Buffer.from(mermaid) })
    await expect(page.locator('[data-node-id]')).toHaveCount(3)
    await expect(page.getByTestId('toast-success')).toBeVisible()
  })

  test('invalid Mermaid shows an error toast', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('open-menu').click()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('menuitem', { name: /Import Mermaid/ }).click(),
    ])
    await chooser.setFiles({ name: 'bad.mmd', mimeType: 'text/plain', buffer: Buffer.from('sequenceDiagram\nA->>B: hi') })
    await expect(page.getByTestId('toast-error')).toBeVisible()
  })

  test('exports SVG, PNG, and Mermaid', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 460, 200)
    await addNodeAt(page, 'ellipse', 760, 200)

    for (const [item, name, minSize] of [
      ['Export SVG', 'diagram.svg', 100],
      ['Export PNG', 'diagram.png', 1000],
      ['Export Mermaid', 'diagram.mmd', 10],
    ] as const) {
      await page.getByTestId('export-menu').click()
      const dl = await download(page, () => page.getByRole('menuitem', { name: item }).click())
      expect(dl.name).toBe(name)
      expect(dl.size).toBeGreaterThan(minSize)
    }
  })

  test('New cancel keeps the diagram', async ({ page }) => {
    await gotoEditor(page)
    await addNodeAt(page, 'rect', 520, 220)
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: 'New' }).click()
    expect(await nodeCount(page)).toBe(1)
  })

  test('export menu opens and closes on outside click', async ({ page }) => {
    await gotoEditor(page)
    await page.getByTestId('export-menu').click()
    await expect(page.getByRole('menuitem', { name: 'Export SVG' })).toBeVisible()
    await page.mouse.click(520, 300)
    await expect(page.getByRole('menuitem', { name: 'Export SVG' })).toHaveCount(0)
  })
})
