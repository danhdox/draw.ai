import { Edge, Node } from '@/lib/model/diagram'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

const round = (n: number) => Math.round(n * 100) / 100

// Point on the border of `box` in the direction of (tx, ty) from its centre.
// Used so edges terminate on a node's edge rather than its centre, which keeps
// arrowheads visible instead of hidden behind the target shape.
export function borderPoint(box: Box, tx: number, ty: number): { x: number; y: number } {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  const scaleX = dx !== 0 ? box.w / 2 / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? box.h / 2 / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

export interface EdgeAnchors {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function edgeAnchors(from: Box, to: Box): EdgeAnchors {
  const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 }
  const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 }
  const start = borderPoint(from, toCenter.x, toCenter.y)
  const end = borderPoint(to, fromCenter.x, fromCenter.y)
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
}

export function edgePath(
  { x1, y1, x2, y2 }: EdgeAnchors,
  routing: Edge['routing'] = 'straight'
): string {
  const a = { x: round(x1), y: round(y1) }
  const b = { x: round(x2), y: round(y2) }

  if (routing === 'orthogonal') {
    const midX = round((x1 + x2) / 2)
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`
  }

  if (routing === 'curved') {
    const cx = round(x1 + (x2 - x1) / 2)
    return `M ${a.x} ${a.y} C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`
  }

  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}

// Midpoint along the routed path, used to position edge labels.
export function edgeMidpoint({ x1, y1, x2, y2 }: EdgeAnchors): { x: number; y: number } {
  return { x: round((x1 + x2) / 2), y: round((y1 + y2) / 2) }
}

export function nodeBox(node: Pick<Node, 'x' | 'y' | 'w' | 'h'>): Box {
  return { x: node.x, y: node.y, w: node.w, h: node.h }
}
