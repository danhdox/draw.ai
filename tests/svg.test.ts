import { describe, it, expect } from 'vitest'
import { createEmptyDiagram } from '@/lib/model/diagram'
import { exportSVG, escapeXml, diagramBounds } from '@/lib/export/svg'

describe('SVG export', () => {
  it('escapes XML-significant characters', () => {
    expect(escapeXml('a < b & c > d "e" \'f\'')).toBe(
      'a &lt; b &amp; c &gt; d &quot;e&quot; &apos;f&apos;'
    )
  })

  it('escapes node and edge labels so markup stays valid', () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push(
      { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50, text: '<script>&"x"' },
      { id: 'b', type: 'rect', x: 200, y: 0, w: 100, h: 50, text: 'B' }
    )
    diagram.edges.push({ id: 'e1', from: { nodeId: 'a' }, to: { nodeId: 'b' }, label: 'a & b < c' })

    const svg = exportSVG(diagram)
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).toContain('a &amp; b &lt; c')
  })

  it('renders an empty frame for an empty diagram', () => {
    const svg = exportSVG(createEmptyDiagram())
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="600"')
  })

  it('computes bounds with padding around node extents', () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push({ id: 'a', type: 'rect', x: 100, y: 100, w: 100, h: 50 })
    const bounds = diagramBounds(diagram, 50)
    expect(bounds.minX).toBe(50)
    expect(bounds.minY).toBe(50)
    expect(bounds.width).toBe(200) // 100 width + 2*50 padding
    expect(bounds.height).toBe(150) // 50 height + 2*50 padding
  })

  it('renders distinct shape primitives for shapeKinds', () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push(
      { id: 'cyl', type: 'rect', shapeKind: 'cylinder', x: 0, y: 0, w: 100, h: 80 },
      { id: 'hex', type: 'rect', shapeKind: 'hexagon', x: 200, y: 0, w: 100, h: 60 }
    )
    const svg = exportSVG(diagram)
    expect(svg).toContain('<path') // cylinder
    expect(svg).toContain('<polygon') // hexagon
  })
})
