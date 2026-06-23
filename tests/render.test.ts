import { describe, it, expect } from 'vitest'
import { resolveShapeKind, shapeGeometry, nodePrimitive, primitiveToSvg } from '@/lib/render/shapes'
import { borderPoint, edgeAnchors, edgePath, edgeMidpoint } from '@/lib/render/edges'

describe('resolveShapeKind (legacy fallback)', () => {
  it('prefers explicit shapeKind', () => {
    expect(resolveShapeKind({ type: 'rect', shapeKind: 'cylinder' })).toBe('cylinder')
  })

  it('maps legacy type to a kind when shapeKind is absent', () => {
    expect(resolveShapeKind({ type: 'rect' })).toBe('rect')
    expect(resolveShapeKind({ type: 'ellipse' })).toBe('ellipse')
    expect(resolveShapeKind({ type: 'diamond' })).toBe('diamond')
    expect(resolveShapeKind({ type: 'text' })).toBe('text')
  })
})

describe('shapeGeometry primitives', () => {
  it('returns rect with no corner radius for rect', () => {
    const p = shapeGeometry('rect', 0, 0, 100, 50)
    expect(p).toMatchObject({ kind: 'rect', rx: 0 })
  })

  it('returns a rounded rect for rounded', () => {
    const p = shapeGeometry('rounded', 0, 0, 100, 60)
    expect(p.kind).toBe('rect')
    if (p.kind === 'rect') expect(p.rx).toBeGreaterThan(0)
  })

  it('returns an ellipse centered in the box', () => {
    const p = shapeGeometry('ellipse', 0, 0, 100, 50)
    expect(p).toEqual({ kind: 'ellipse', cx: 50, cy: 25, rx: 50, ry: 25 })
  })

  it('returns polygons for diamond/hexagon/triangle/parallelogram/trapezoid/chevron', () => {
    for (const kind of ['diamond', 'hexagon', 'triangle', 'parallelogram', 'trapezoid', 'chevron'] as const) {
      expect(shapeGeometry(kind, 0, 0, 120, 80).kind).toBe('polygon')
    }
  })

  it('returns paths for cylinder/cloud/document/note', () => {
    for (const kind of ['cylinder', 'cloud', 'document', 'note'] as const) {
      const p = shapeGeometry(kind, 0, 0, 120, 80)
      expect(p.kind).toBe('path')
      if (p.kind === 'path') expect(p.d.length).toBeGreaterThan(0)
    }
  })

  it('returns none for text (no outline)', () => {
    expect(shapeGeometry('text', 0, 0, 100, 40)).toEqual({ kind: 'none' })
  })

  it('nodePrimitive honors the node geometry', () => {
    const p = nodePrimitive({ type: 'rect', shapeKind: 'rect', x: 10, y: 20, w: 100, h: 50 })
    expect(p).toMatchObject({ kind: 'rect', x: 10, y: 20, w: 100, h: 50 })
  })
})

describe('primitiveToSvg', () => {
  it('serializes each primitive type', () => {
    expect(primitiveToSvg({ kind: 'rect', x: 0, y: 0, w: 10, h: 10, rx: 0 }, 'fill="red"')).toContain('<rect')
    expect(primitiveToSvg({ kind: 'ellipse', cx: 5, cy: 5, rx: 5, ry: 5 }, '')).toContain('<ellipse')
    expect(primitiveToSvg({ kind: 'polygon', points: [[0, 0], [1, 1]] }, '')).toContain('<polygon')
    expect(primitiveToSvg({ kind: 'path', d: 'M0 0' }, '')).toContain('<path')
    expect(primitiveToSvg({ kind: 'none' }, '')).toBe('')
  })
})

describe('edge geometry', () => {
  it('borderPoint lands on the box edge toward a target', () => {
    const box = { x: 0, y: 0, w: 100, h: 100 } // center (50,50)
    const right = borderPoint(box, 1000, 50)
    expect(right.x).toBe(100)
    expect(right.y).toBe(50)
  })

  it('edgeAnchors clip to both node borders, not centers', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 } // center (50,50)
    const b = { x: 300, y: 0, w: 100, h: 100 } // center (350,50)
    const anchors = edgeAnchors(a, b)
    expect(anchors.x1).toBe(100) // exits A's right edge
    expect(anchors.x2).toBe(300) // enters B's left edge
    expect(anchors.y1).toBe(50)
    expect(anchors.y2).toBe(50)
  })

  it('edgePath produces straight, orthogonal, and curved variants', () => {
    const anchors = { x1: 0, y1: 0, x2: 100, y2: 100 }
    expect(edgePath(anchors, 'straight')).toBe('M 0 0 L 100 100')
    expect(edgePath(anchors, 'orthogonal')).toContain('L 50 0')
    expect(edgePath(anchors, 'curved')).toContain('C')
  })

  it('edgeMidpoint is the midpoint of the anchors', () => {
    expect(edgeMidpoint({ x1: 0, y1: 0, x2: 100, y2: 50 })).toEqual({ x: 50, y: 25 })
  })
})
