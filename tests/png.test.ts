import { describe, it, expect, vi, afterEach } from 'vitest'
import { createEmptyDiagram } from '@/lib/model/diagram'
import { exportPNG, svgToDataUri } from '@/lib/export/png'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PNG export', () => {
  it('encodes SVG as a base64 data URI', () => {
    const uri = svgToDataUri('<svg></svg>')
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
    const base64 = uri.replace('data:image/svg+xml;base64,', '')
    expect(Buffer.from(base64, 'base64').toString('utf-8')).toBe('<svg></svg>')
  })

  it('rasterizes the diagram to a PNG blob sized to its bounds', async () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push({ id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50, text: 'A' })

    const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
    let canvasWidth = 0
    let canvasHeight = 0
    const fakeCanvas = {
      set width(v: number) { canvasWidth = v },
      get width() { return canvasWidth },
      set height(v: number) { canvasHeight = v },
      get height() { return canvasHeight },
      getContext: () => ctx,
      toBlob: (cb: (blob: Blob) => void) => cb(new Blob(['png'], { type: 'image/png' })),
    }

    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        if (tag === 'canvas') return fakeCanvas
        throw new Error(`unexpected element ${tag}`)
      },
    })

    // Image that resolves onload synchronously when src is assigned.
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 0
      height = 0
      set src(_value: string) {
        if (this.onload) this.onload()
      }
    }
    vi.stubGlobal('Image', FakeImage)

    const blob = await exportPNG(diagram, { scale: 2 })
    expect(blob.type).toBe('image/png')
    // bounds: (100 + 2*50) x (50 + 2*50) = 200 x 150, scaled by 2.
    expect(canvasWidth).toBe(400)
    expect(canvasHeight).toBe(300)
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(ctx.drawImage).toHaveBeenCalled()
  })

  it('rejects when rasterization fails', async () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push({ id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50 })

    vi.stubGlobal('document', {
      createElement: () => ({
        set width(_v: number) {},
        set height(_v: number) {},
        getContext: () => ({ fillStyle: '', fillRect: () => {}, drawImage: () => {} }),
        toBlob: (cb: (b: Blob | null) => void) => cb(null),
      }),
    })
    class FailingImage {
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
      set src(_v: string) {
        if (this.onerror) this.onerror()
      }
    }
    vi.stubGlobal('Image', FailingImage)

    await expect(exportPNG(diagram)).rejects.toThrow(/rasterize/)
  })
})
