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

// ---------------------------------------------------------------------------
// Waypoint + port aware routing (used by the interactive canvas and exporter).
// ---------------------------------------------------------------------------

export type PortId = 'n' | 's' | 'e' | 'w' | 'c'
export const PORT_IDS: PortId[] = ['n', 's', 'e', 'w']

export interface Pt {
  x: number
  y: number
}

// Fixed connection port on a node's perimeter.
export function portPoint(box: Box, port: PortId): Pt {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  switch (port) {
    case 'n':
      return { x: cx, y: box.y }
    case 's':
      return { x: cx, y: box.y + box.h }
    case 'e':
      return { x: box.x + box.w, y: cy }
    case 'w':
      return { x: box.x, y: cy }
    default:
      return { x: cx, y: cy }
  }
}

function endpointAnchor(box: Box, port: PortId | undefined, toward: Pt): Pt {
  if (port && port !== 'c') return portPoint(box, port)
  return borderPoint(box, toward.x, toward.y)
}

// Full routed point list (endpoints clipped to node border/port, with waypoints
// in between). `edge.points` holds user-dragged waypoints.
export function routeEdgePoints(
  fromBox: Box,
  toBox: Box,
  edge: Pick<Edge, 'from' | 'to' | 'points'>
): Pt[] {
  const waypoints = edge.points ?? []
  const toCenter = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 }
  const fromCenter = { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }
  const fromToward = waypoints[0] ?? toCenter
  const toToward = waypoints[waypoints.length - 1] ?? fromCenter
  const start = endpointAnchor(fromBox, edge.from.portId as PortId | undefined, fromToward)
  const end = endpointAnchor(toBox, edge.to.portId as PortId | undefined, toToward)
  return [start, ...waypoints, end]
}

function orthogonalPathFromPoints(points: Pt[]): string {
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    // Mid-split elbow per segment (two bends), like draw.io's default orthogonal.
    if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) {
      const midX = round((a.x + b.x) / 2)
      d += ` L ${midX} ${round(a.y)} L ${midX} ${round(b.y)} L ${round(b.x)} ${round(b.y)}`
    } else {
      const midY = round((a.y + b.y) / 2)
      d += ` L ${round(a.x)} ${midY} L ${round(b.x)} ${midY} L ${round(b.x)} ${round(b.y)}`
    }
  }
  return d
}

function curvedPathFromPoints(points: Pt[]): string {
  if (points.length === 2) {
    const [a, b] = points
    const cx = (a.x + b.x) / 2
    return `M ${round(a.x)} ${round(a.y)} C ${round(cx)} ${round(a.y)}, ${round(cx)} ${round(b.y)}, ${round(b.x)} ${round(b.y)}`
  }
  // Catmull-Rom -> cubic Bézier through all points.
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(p2.y)}`
  }
  return d
}

export function pointsToPath(points: Pt[], routing: Edge['routing'] = 'straight'): string {
  if (points.length < 2) return ''
  if (routing === 'orthogonal') return orthogonalPathFromPoints(points)
  if (routing === 'curved') return curvedPathFromPoints(points)
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' ')
}

// Point at half the total polyline length — for placing the label on the path.
export function polylineMidpoint(points: Pt[]): Pt {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  let total = 0
  const segs: number[] = []
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    segs.push(len)
    total += len
  }
  let target = total / 2
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const t = segs[i] === 0 ? 0 : target / segs[i]
      return {
        x: round(points[i].x + (points[i + 1].x - points[i].x) * t),
        y: round(points[i].y + (points[i + 1].y - points[i].y) * t),
      }
    }
    target -= segs[i]
  }
  return points[Math.floor(points.length / 2)]
}

// Midpoints of each segment — virtual handles for inserting a new waypoint.
export function segmentMidpoints(points: Pt[]): Pt[] {
  const mids: Pt[] = []
  for (let i = 1; i < points.length; i++) {
    mids.push({
      x: round((points[i - 1].x + points[i].x) / 2),
      y: round((points[i - 1].y + points[i].y) / 2),
    })
  }
  return mids
}

// Nearest port on a box to a given point, within a snap radius (screen-independent
// world units). Returns null if no port is close enough.
export function nearestPort(box: Box, p: Pt, radius: number): PortId | null {
  let best: PortId | null = null
  let bestDist = radius
  for (const port of PORT_IDS) {
    const pp = portPoint(box, port)
    const d = Math.hypot(pp.x - p.x, pp.y - p.y)
    if (d < bestDist) {
      bestDist = d
      best = port
    }
  }
  return best
}
