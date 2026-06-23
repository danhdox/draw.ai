import { Node, ShapeKind } from '@/lib/model/diagram'

// A framework-agnostic description of a shape's geometry. Both the interactive
// canvas (React/JSX) and the SVG exporter consume these so a palette item is
// guaranteed to render identically in the editor and in exports.
export type ShapePrimitive =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: Array<[number, number]> }
  | { kind: 'path'; d: string }
  | { kind: 'none' }

// Map the legacy `type` field onto a visual shape kind. When a node carries an
// explicit `shapeKind` it always wins; otherwise we fall back to `type` so
// older diagrams (rect | ellipse | diamond | text) keep rendering correctly.
export function resolveShapeKind(node: Pick<Node, 'type' | 'shapeKind'>): ShapeKind {
  if (node.shapeKind) return node.shapeKind
  switch (node.type) {
    case 'ellipse':
      return 'ellipse'
    case 'diamond':
      return 'diamond'
    case 'text':
      return 'text'
    default:
      return 'rect'
  }
}

const round = (n: number) => Math.round(n * 100) / 100

export function shapeGeometry(
  kind: ShapeKind,
  x: number,
  y: number,
  w: number,
  h: number
): ShapePrimitive {
  const cx = x + w / 2
  const cy = y + h / 2

  switch (kind) {
    case 'rect':
      return { kind: 'rect', x, y, w, h, rx: 0 }

    case 'rounded':
      return { kind: 'rect', x, y, w, h, rx: Math.min(16, h / 3) }

    case 'ellipse':
      return { kind: 'ellipse', cx, cy, rx: w / 2, ry: h / 2 }

    case 'diamond':
      return {
        kind: 'polygon',
        points: [
          [cx, y],
          [x + w, cy],
          [cx, y + h],
          [x, cy],
        ],
      }

    case 'parallelogram': {
      const skew = Math.min(w * 0.25, 40)
      return {
        kind: 'polygon',
        points: [
          [x + skew, y],
          [x + w, y],
          [x + w - skew, y + h],
          [x, y + h],
        ],
      }
    }

    case 'hexagon': {
      const inset = Math.min(w * 0.22, 30)
      return {
        kind: 'polygon',
        points: [
          [x + inset, y],
          [x + w - inset, y],
          [x + w, cy],
          [x + w - inset, y + h],
          [x + inset, y + h],
          [x, cy],
        ],
      }
    }

    case 'triangle':
      return {
        kind: 'polygon',
        points: [
          [cx, y],
          [x + w, y + h],
          [x, y + h],
        ],
      }

    case 'trapezoid': {
      const inset = Math.min(w * 0.22, 32)
      return {
        kind: 'polygon',
        points: [
          [x + inset, y],
          [x + w - inset, y],
          [x + w, y + h],
          [x, y + h],
        ],
      }
    }

    case 'chevron': {
      const tip = Math.min(w * 0.28, 34)
      return {
        kind: 'polygon',
        points: [
          [x, y],
          [x + w - tip, y],
          [x + w, cy],
          [x + w - tip, y + h],
          [x, y + h],
          [x + tip, cy],
        ],
      }
    }

    case 'cylinder': {
      const rx = w / 2
      const ry = Math.min(h * 0.18, 18)
      const top = y + ry
      const bottom = y + h - ry
      const d = [
        `M ${round(x)} ${round(top)}`,
        `L ${round(x)} ${round(bottom)}`,
        `A ${round(rx)} ${round(ry)} 0 0 0 ${round(x + w)} ${round(bottom)}`,
        `L ${round(x + w)} ${round(top)}`,
        `A ${round(rx)} ${round(ry)} 0 0 0 ${round(x)} ${round(top)}`,
        'Z',
        `M ${round(x)} ${round(top)}`,
        `A ${round(rx)} ${round(ry)} 0 0 1 ${round(x + w)} ${round(top)}`,
      ].join(' ')
      return { kind: 'path', d }
    }

    case 'cloud': {
      const d = [
        `M ${round(x + 0.25 * w)} ${round(y + 0.85 * h)}`,
        `C ${round(x + 0.03 * w)} ${round(y + 0.82 * h)}, ${round(x + 0.03 * w)} ${round(y + 0.48 * h)}, ${round(x + 0.22 * w)} ${round(y + 0.45 * h)}`,
        `C ${round(x + 0.18 * w)} ${round(y + 0.16 * h)}, ${round(x + 0.5 * w)} ${round(y + 0.08 * h)}, ${round(x + 0.58 * w)} ${round(y + 0.32 * h)}`,
        `C ${round(x + 0.74 * w)} ${round(y + 0.12 * h)}, ${round(x + 0.98 * w)} ${round(y + 0.36 * h)}, ${round(x + 0.82 * w)} ${round(y + 0.52 * h)}`,
        `C ${round(x + 1.0 * w)} ${round(y + 0.58 * h)}, ${round(x + 0.92 * w)} ${round(y + 0.9 * h)}, ${round(x + 0.7 * w)} ${round(y + 0.85 * h)}`,
        'Z',
      ].join(' ')
      return { kind: 'path', d }
    }

    case 'document': {
      const wy = y + h * 0.82
      const d = [
        `M ${round(x)} ${round(y)}`,
        `L ${round(x + w)} ${round(y)}`,
        `L ${round(x + w)} ${round(wy)}`,
        `C ${round(x + 0.66 * w)} ${round(y + h * 1.05)}, ${round(x + 0.34 * w)} ${round(y + h * 0.6)}, ${round(x)} ${round(wy)}`,
        'Z',
      ].join(' ')
      return { kind: 'path', d }
    }

    case 'note': {
      const fold = Math.min(w, h) * 0.26
      const d = [
        `M ${round(x)} ${round(y)}`,
        `L ${round(x + w - fold)} ${round(y)}`,
        `L ${round(x + w)} ${round(y + fold)}`,
        `L ${round(x + w)} ${round(y + h)}`,
        `L ${round(x)} ${round(y + h)}`,
        'Z',
        `M ${round(x + w - fold)} ${round(y)}`,
        `L ${round(x + w - fold)} ${round(y + fold)}`,
        `L ${round(x + w)} ${round(y + fold)}`,
      ].join(' ')
      return { kind: 'path', d }
    }

    case 'text':
      return { kind: 'none' }

    default:
      return { kind: 'rect', x, y, w, h, rx: 0 }
  }
}

export function nodePrimitive(node: Pick<Node, 'type' | 'shapeKind' | 'x' | 'y' | 'w' | 'h'>): ShapePrimitive {
  return shapeGeometry(resolveShapeKind(node), node.x, node.y, node.w, node.h)
}

// Serialize a primitive to an SVG element string (used by the exporter).
export function primitiveToSvg(prim: ShapePrimitive, attrs: string): string {
  switch (prim.kind) {
    case 'rect':
      return `<rect x="${prim.x}" y="${prim.y}" width="${prim.w}" height="${prim.h}"${prim.rx ? ` rx="${round(prim.rx)}"` : ''} ${attrs}/>`
    case 'ellipse':
      return `<ellipse cx="${round(prim.cx)}" cy="${round(prim.cy)}" rx="${round(prim.rx)}" ry="${round(prim.ry)}" ${attrs}/>`
    case 'polygon':
      return `<polygon points="${prim.points.map(([px, py]) => `${round(px)},${round(py)}`).join(' ')}" ${attrs}/>`
    case 'path':
      return `<path d="${prim.d}" ${attrs}/>`
    case 'none':
      return ''
  }
}
