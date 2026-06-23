'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { useViewportStore } from '@/lib/store/useViewportStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { Node as DiagramNode } from '@/lib/model/diagram'
import { nodePrimitive } from '@/lib/render/shapes'
import {
  routeEdgePoints,
  pointsToPath,
  polylineMidpoint,
  segmentMidpoints,
  nearestPort,
  nodeBox,
  type Pt,
  type PortId,
} from '@/lib/render/edges'

interface Box { x: number; y: number; w: number; h: number }

type Gesture =
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'marquee'; start: Pt; additive: boolean }
  | { kind: 'dragNodes'; start: Pt; origins: Map<string, Pt>; primary: string; additive: boolean; moved: boolean }
  | { kind: 'resize'; id: string; handle: string; box: Box; rotation: number; grab: Pt; aspect: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; startRotation: number }
  | { kind: 'connect'; fromId: string }
  | { kind: 'waypoint'; edgeId: string; index: number }
  | { kind: 'endpoint'; edgeId: string; which: 'from' | 'to' }
  | null

const round = (n: number) => Math.round(n * 100) / 100

function unrotate(p: Pt, cx: number, cy: number, deg: number): Pt {
  if (!deg) return p
  const r = (-deg * Math.PI) / 180
  const dx = p.x - cx
  const dy = p.y - cy
  return { x: cx + dx * Math.cos(r) - dy * Math.sin(r), y: cy + dx * Math.sin(r) + dy * Math.cos(r) }
}

function nodeAtPoint(nodes: DiagramNode[], p: Pt, excludeId?: string): DiagramNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (n.id === excludeId) continue
    if (p.x >= n.x && p.x <= n.x + n.w && p.y >= n.y && p.y <= n.y + n.h) return n
  }
  return null
}

export function Canvas() {
  const canvasRef = useRef<SVGSVGElement>(null)
  const { viewBox, setViewBox, panBySvg } = useViewportStore()
  const showContextMenu = useContextMenuStore((s) => s.show)

  const [clientW, setClientW] = useState(1200)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [pointerPos, setPointerPos] = useState<Pt | null>(null)
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [guides, setGuides] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([])
  const [snapTarget, setSnapTarget] = useState<{ nodeId: string; port: PortId | null } | null>(null)
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)

  const gestureRef = useRef<Gesture>(null)
  const spaceRef = useRef(false)
  const pointersRef = useRef<Map<number, Pt>>(new Map())
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null)
  const capturedRef = useRef<number | null>(null)

  const {
    diagram,
    selectedNodeIds,
    selectedEdgeIds,
    selectNodes,
    selectEdges,
    toggleNodeSelection,
    clearSelection,
    tool,
    setTool,
    connectingFrom,
    startConnecting,
    finishConnecting,
    cancelConnecting,
    beginInteraction,
    updateLive,
    commitInteraction,
    cancelInteraction,
    applyDiffWithHistory,
  } = useDiagramStore()

  const scale = viewBox.width / Math.max(1, clientW) // world units per screen px
  const H = (px: number) => px * scale // handle dims constant in screen px

  const orderedNodes = useMemo(
    () => diagram.nodes.map((n, i) => ({ n, i })).sort((a, b) => (a.n.zIndex ?? 0) - (b.n.zIndex ?? 0) || a.i - b.i).map((e) => e.n),
    [diagram.nodes]
  )

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const update = () => setClientW(el.clientWidth || 1200)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const screenToSVG = useCallback((sx: number, sy: number): Pt => {
    const svg = canvasRef.current
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = sx
    pt.y = sy
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const snap = useCallback(
    (v: number) => (diagram.meta.snap ? Math.round(v / diagram.meta.gridSize) * diagram.meta.gridSize : v),
    [diagram.meta.snap, diagram.meta.gridSize]
  )

  const capture = (e: React.PointerEvent) => {
    try {
      canvasRef.current?.setPointerCapture(e.pointerId)
      capturedRef.current = e.pointerId
    } catch { /* best effort */ }
  }

  // ---- pointer down on empty canvas ----
  const onCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return // context menu
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const target = e.target as SVGElement
    const onBackground = target === canvasRef.current || target.classList.contains('canvas-bg')
    if (!onBackground) return

    if (connectingFrom) cancelConnecting()

    if (pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 }
      gestureRef.current = null
      return
    }

    if (spaceRef.current || e.button === 1) {
      gestureRef.current = { kind: 'pan', lastX: e.clientX, lastY: e.clientY }
      capture(e)
      return
    }
    // Empty-canvas left drag = marquee selection.
    gestureRef.current = { kind: 'marquee', start: screenToSVG(e.clientX, e.clientY), additive: e.shiftKey }
    capture(e)
  }

  // ---- node interactions ----
  const onNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (e.button === 2) return
    e.stopPropagation()
    const node = diagram.nodes.find((n) => n.id === nodeId)
    if (!node) return

    if (tool === 'connect') {
      if (!connectingFrom) {
        startConnecting(nodeId)
        setPointerPos({ x: node.x + node.w / 2, y: node.y + node.h / 2 })
      } else {
        finishConnecting(nodeId)
        setPointerPos(null)
      }
      return
    }

    // Resolve the selection that will be dragged.
    let sel: Set<string>
    if (e.shiftKey) {
      sel = new Set(selectedNodeIds)
      if (sel.has(nodeId)) sel.delete(nodeId)
      else sel.add(nodeId)
      toggleNodeSelection(nodeId)
      if (!sel.has(nodeId)) return // shift-deselected; no drag
    } else if (selectedNodeIds.has(nodeId)) {
      sel = new Set(selectedNodeIds)
    } else {
      sel = new Set([nodeId])
      selectNodes([nodeId])
    }

    // Include group members.
    diagram.groups.forEach((g) => {
      if (g.nodeIds.some((id) => sel.has(id))) g.nodeIds.forEach((id) => sel.add(id))
    })

    const origins = new Map<string, Pt>()
    diagram.nodes.forEach((n) => { if (sel.has(n.id)) origins.set(n.id, { x: n.x, y: n.y }) })

    beginInteraction()
    // Capture is deferred to the first move (capturing on pointerdown suppresses dblclick).
    gestureRef.current = { kind: 'dragNodes', start: screenToSVG(e.clientX, e.clientY), origins, primary: nodeId, additive: e.shiftKey, moved: false }
  }

  const onResizePointerDown = (e: React.PointerEvent, nodeId: string, handle: string) => {
    e.stopPropagation()
    const node = diagram.nodes.find((n) => n.id === nodeId)
    if (!node) return
    beginInteraction()
    capture(e)
    gestureRef.current = {
      kind: 'resize',
      id: nodeId,
      handle,
      box: { x: node.x, y: node.y, w: node.w, h: node.h },
      rotation: node.rotation ?? 0,
      grab: screenToSVG(e.clientX, e.clientY),
      aspect: node.w / Math.max(1, node.h),
    }
  }

  const onRotatePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    const node = diagram.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const cx = node.x + node.w / 2
    const cy = node.y + node.h / 2
    const p = screenToSVG(e.clientX, e.clientY)
    beginInteraction()
    capture(e)
    gestureRef.current = {
      kind: 'rotate', id: nodeId, cx, cy,
      startAngle: Math.atan2(p.y - cy, p.x - cx),
      startRotation: node.rotation ?? 0,
    }
  }

  const onConnectHandlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    const node = diagram.nodes.find((n) => n.id === nodeId)
    if (!node) return
    startConnecting(nodeId)
    capture(e) // capture so we get the release even over another node (touch-safe)
    gestureRef.current = { kind: 'connect', fromId: nodeId }
    setPointerPos({ x: node.x + node.w / 2, y: node.y + node.h / 2 })
  }

  // ---- edge handle interactions ----
  const onEndpointPointerDown = (e: React.PointerEvent, edgeId: string, which: 'from' | 'to') => {
    e.stopPropagation()
    capture(e)
    gestureRef.current = { kind: 'endpoint', edgeId, which }
    setPointerPos(screenToSVG(e.clientX, e.clientY))
  }

  const onWaypointPointerDown = (e: React.PointerEvent, edgeId: string, index: number) => {
    e.stopPropagation()
    beginInteraction()
    capture(e)
    gestureRef.current = { kind: 'waypoint', edgeId, index }
  }

  const onAddWaypointPointerDown = (e: React.PointerEvent, edgeId: string, segIndex: number) => {
    e.stopPropagation()
    const edge = diagram.edges.find((ed) => ed.id === edgeId)
    if (!edge) return
    const p = screenToSVG(e.clientX, e.clientY)
    const wps = [...(edge.points ?? [])]
    wps.splice(segIndex, 0, { x: snap(p.x), y: snap(p.y) })
    beginInteraction()
    capture(e)
    updateLive({ ops: [{ type: 'updateEdge', id: edgeId, patch: { points: wps } }] })
    gestureRef.current = { kind: 'waypoint', edgeId, index: segIndex }
  }

  // ---- smart guides for node dragging ----
  const computeDrag = (g: Extract<Gesture, { kind: 'dragNodes' }>, svg: Pt) => {
    let dx = snap(svg.x - g.start.x)
    let dy = snap(svg.y - g.start.y)
    // moving bbox at proposed delta
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    g.origins.forEach((o, id) => {
      const n = diagram.nodes.find((nn) => nn.id === id)!
      minX = Math.min(minX, o.x + dx); minY = Math.min(minY, o.y + dy)
      maxX = Math.max(maxX, o.x + dx + n.w); maxY = Math.max(maxY, o.y + dy + n.h)
    })
    const movCxs = [minX, (minX + maxX) / 2, maxX]
    const movCys = [minY, (minY + maxY) / 2, maxY]
    const tol = 6 * scale
    const newGuides: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    let bestX: number | null = null, bestXd = tol
    let bestY: number | null = null, bestYd = tol
    diagram.nodes.forEach((n) => {
      if (g.origins.has(n.id)) return
      const xs = [n.x, n.x + n.w / 2, n.x + n.w]
      const ys = [n.y, n.y + n.h / 2, n.y + n.h]
      movCxs.forEach((mc) => xs.forEach((x) => { const d = Math.abs(mc - x); if (d < bestXd) { bestXd = d; bestX = x - (mc - minX) } }))
      movCys.forEach((mc) => ys.forEach((y) => { const d = Math.abs(mc - y); if (d < bestYd) { bestYd = d; bestY = y - (mc - minY) } }))
    })
    if (bestX !== null) { dx += bestX - minX; }
    if (bestY !== null) { dy += bestY - minY; }
    // guide lines after snap
    if (bestX !== null || bestY !== null) {
      const fminX = minX + (bestX !== null ? bestX - minX : 0)
      const fminY = minY + (bestY !== null ? bestY - minY : 0)
      diagram.nodes.forEach((n) => {
        if (g.origins.has(n.id)) return
        const xs = [n.x, n.x + n.w / 2, n.x + n.w]
        const ys = [n.y, n.y + n.h / 2, n.y + n.h]
        ;[fminX, fminX + (maxX - minX) / 2, fminX + (maxX - minX)].forEach((mc) => xs.forEach((x) => {
          if (Math.abs(mc - x) < 0.5) newGuides.push({ x1: x, y1: Math.min(n.y, fminY), x2: x, y2: Math.max(n.y + n.h, fminY + (maxY - minY)) })
        }))
        ;[fminY, fminY + (maxY - minY) / 2, fminY + (maxY - minY)].forEach((mc) => ys.forEach((y) => {
          if (Math.abs(mc - y) < 0.5) newGuides.push({ x1: Math.min(n.x, fminX), y1: y, x2: Math.max(n.x + n.w, fminX + (maxX - minX)), y2: y })
        }))
      })
    }
    setGuides(newGuides)
    const ops = [...g.origins.entries()].map(([id, o]) => ({ type: 'updateNode' as const, id, patch: { x: o.x + dx, y: o.y + dy } }))
    updateLive({ ops })
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const cx = (pts[0].x + pts[1].x) / 2
      const cy = (pts[0].y + pts[1].y) / 2
      if (dist > 0) {
        const anchor = screenToSVG(cx, cy)
        const factor = pinchRef.current.dist / dist
        const vb = useViewportStore.getState().viewBox
        const w = Math.min(19200, Math.max(75, vb.width * factor))
        const ratio = w / vb.width
        const h = vb.height * ratio
        const fx = (anchor.x - vb.x) / vb.width
        const fy = (anchor.y - vb.y) / vb.height
        setViewBox({ x: anchor.x - fx * w, y: anchor.y - fy * h, width: w, height: h })
        // pan by centroid movement
        panBySvg((cx - pinchRef.current.cx) * scale, (cy - pinchRef.current.cy) * scale)
        pinchRef.current = { dist, cx, cy }
      }
      return
    }

    const g = gestureRef.current
    const svg = screenToSVG(e.clientX, e.clientY)

    // Connect tool (click source, then move): track the rubber-band preview.
    if (!g && connectingFrom) {
      setPointerPos(svg)
      const target = nodeAtPoint(orderedNodes, svg, connectingFrom.nodeId)
      setSnapTarget(target ? { nodeId: target.id, port: nearestPort(nodeBox(target), svg, 14 * scale) } : null)
      return
    }

    if (!g) return
    if (g.kind === 'pan') {
      panBySvg((e.clientX - g.lastX) * scale, (e.clientY - g.lastY) * scale)
      g.lastX = e.clientX; g.lastY = e.clientY
      return
    }
    if (g.kind === 'marquee') {
      setMarquee({ x: Math.min(g.start.x, svg.x), y: Math.min(g.start.y, svg.y), w: Math.abs(svg.x - g.start.x), h: Math.abs(svg.y - g.start.y) })
      return
    }
    if (g.kind === 'dragNodes') {
      if (capturedRef.current === null) capture(e) // defer capture until actual movement
      g.moved = true
      computeDrag(g, svg)
      return
    }
    if (g.kind === 'resize') {
      const cx = g.box.x + g.box.w / 2
      const cy = g.box.y + g.box.h / 2
      const local = unrotate(svg, cx, cy, g.rotation)
      const grabLocal = unrotate(g.grab, cx, cy, g.rotation)
      const ddx = local.x - grabLocal.x
      const ddy = local.y - grabLocal.y
      let { x, y, w, h } = g.box
      if (g.handle.includes('e')) w = g.box.w + ddx
      if (g.handle.includes('w')) { w = g.box.w - ddx; x = g.box.x + ddx }
      if (g.handle.includes('s')) h = g.box.h + ddy
      if (g.handle.includes('n')) { h = g.box.h - ddy; y = g.box.y + ddy }
      if (e.shiftKey && g.handle.length === 2) { // corner: keep aspect
        if (Math.abs(w / g.aspect) > Math.abs(h)) h = w / g.aspect
        else w = h * g.aspect
        if (g.handle.includes('w')) x = g.box.x + g.box.w - w
        if (g.handle.includes('n')) y = g.box.y + g.box.h - h
      }
      const MIN = 20
      if (w < MIN) { if (g.handle.includes('w')) x = g.box.x + g.box.w - MIN; w = MIN }
      if (h < MIN) { if (g.handle.includes('n')) y = g.box.y + g.box.h - MIN; h = MIN }
      if (diagram.meta.snap && !g.rotation) {
        if (g.handle.includes('e')) w = snap(x + w) - x
        if (g.handle.includes('s')) h = snap(y + h) - y
        if (g.handle.includes('w')) { const nx = snap(x); w += x - nx; x = nx }
        if (g.handle.includes('n')) { const ny = snap(y); h += y - ny; y = ny }
      }
      updateLive({ ops: [{ type: 'updateNode', id: g.id, patch: { x: round(x), y: round(y), w: round(Math.max(MIN, w)), h: round(Math.max(MIN, h)) } }] })
      return
    }
    if (g.kind === 'rotate') {
      const angle = Math.atan2(svg.y - g.cy, svg.x - g.cx)
      let deg = g.startRotation + ((angle - g.startAngle) * 180) / Math.PI
      if (e.shiftKey) deg = Math.round(deg / 15) * 15
      deg = ((deg % 360) + 360) % 360
      updateLive({ ops: [{ type: 'updateNode', id: g.id, patch: { rotation: round(deg) } }] })
      return
    }
    if (g.kind === 'connect') {
      setPointerPos(svg)
      const target = nodeAtPoint(orderedNodes, svg, g.fromId)
      if (target) setSnapTarget({ nodeId: target.id, port: nearestPort(nodeBox(target), svg, 14 * scale) })
      else setSnapTarget(null)
      return
    }
    if (g.kind === 'endpoint') {
      setPointerPos(svg)
      const edge = diagram.edges.find((ed) => ed.id === g.edgeId)
      const otherId = edge ? (g.which === 'from' ? edge.to.nodeId : edge.from.nodeId) : undefined
      const target = nodeAtPoint(orderedNodes, svg, undefined)
      if (target && target.id !== otherId) setSnapTarget({ nodeId: target.id, port: nearestPort(nodeBox(target), svg, 14 * scale) })
      else setSnapTarget(null)
      return
    }
    if (g.kind === 'waypoint') {
      const edge = diagram.edges.find((ed) => ed.id === g.edgeId)
      const wps = [...(edge?.points ?? [])]
      wps[g.index] = { x: snap(svg.x), y: snap(svg.y) }
      updateLive({ ops: [{ type: 'updateEdge', id: g.edgeId, patch: { points: wps } }] })
      return
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (capturedRef.current !== null) {
      canvasRef.current?.releasePointerCapture?.(capturedRef.current)
      capturedRef.current = null
    }
    const g = gestureRef.current
    gestureRef.current = null
    setGuides([])

    if (!g) return

    if (g.kind === 'dragNodes') {
      if (g.moved) commitInteraction('Move')
      else {
        cancelInteraction()
        if (!g.additive) selectNodes([g.primary]) // collapse multi-select to clicked node
      }
    } else if (g.kind === 'resize') {
      commitInteraction('Resize')
    } else if (g.kind === 'rotate') {
      commitInteraction('Rotate')
    } else if (g.kind === 'waypoint') {
      commitInteraction('Edit edge')
    } else if (g.kind === 'marquee') {
      const m = marquee
      setMarquee(null)
      if (m && (m.w > 2 || m.h > 2)) {
        const nodeIds = diagram.nodes.filter((n) => n.x < m.x + m.w && n.x + n.w > m.x && n.y < m.y + m.h && n.y + n.h > m.y).map((n) => n.id)
        const edgeIds = diagram.edges.filter((ed) => {
          const f = diagram.nodes.find((n) => n.id === ed.from.nodeId)
          const t = diagram.nodes.find((n) => n.id === ed.to.nodeId)
          if (!f || !t) return false
          const mid = polylineMidpoint(routeEdgePoints(nodeBox(f), nodeBox(t), ed))
          return mid.x >= m.x && mid.x <= m.x + m.w && mid.y >= m.y && mid.y <= m.y + m.h
        }).map((ed) => ed.id)
        selectNodes(nodeIds, g.additive)
        if (edgeIds.length) selectEdges(edgeIds, true)
      } else if (!g.additive) {
        clearSelection()
      }
    } else if (g.kind === 'connect') {
      const target = nodeAtPoint(orderedNodes, screenToSVG(e.clientX, e.clientY), g.fromId)
      if (target) {
        const port = snapTarget?.nodeId === target.id ? snapTarget.port : null
        finishConnecting(target.id, port ?? undefined)
      } else {
        cancelConnecting()
      }
      setPointerPos(null)
      setSnapTarget(null)
    } else if (g.kind === 'endpoint') {
      const t = snapTarget
      setSnapTarget(null)
      setPointerPos(null)
      if (t) {
        const ref = { nodeId: t.nodeId, ...(t.port ? { portId: t.port } : {}) }
        applyDiffWithHistory({ ops: [{ type: 'updateEdge', id: g.edgeId, patch: g.which === 'from' ? { from: ref } : { to: ref } }], summary: 'Reconnect edge' })
      }
    }
  }

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const vb = useViewportStore.getState().viewBox
    if (e.ctrlKey || e.metaKey) {
      const anchor = screenToSVG(e.clientX, e.clientY)
      const factor = e.deltaY > 0 ? 1.1 : 0.9
      const w = Math.min(19200, Math.max(75, vb.width * factor))
      const ratio = w / vb.width
      const h = vb.height * ratio
      const fx = (anchor.x - vb.x) / vb.width
      const fy = (anchor.y - vb.y) / vb.height
      setViewBox({ x: anchor.x - fx * w, y: anchor.y - fy * h, width: w, height: h })
    } else {
      const k = scale
      if (e.shiftKey) setViewBox({ ...vb, x: vb.x + e.deltaY * k })
      else setViewBox({ ...vb, x: vb.x + e.deltaX * k, y: vb.y + e.deltaY * k })
    }
  }

  const onCanvasContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement
    if (target === canvasRef.current || target.classList.contains('canvas-bg')) {
      e.preventDefault()
      clearSelection()
      showContextMenu(e.clientX, e.clientY, 'canvas')
    }
  }

  const handleTextChange = (nodeId: string, text: string) => updateLive({ ops: [{ type: 'updateNode', id: nodeId, patch: { text } }] })
  const exitNodeEditing = useCallback(() => { setEditingNodeId(null); commitInteraction('Edit text') }, [commitInteraction])
  const handleEdgeTextChange = (edgeId: string, label: string) => updateLive({ ops: [{ type: 'updateEdge', id: edgeId, patch: { label } }] })
  const exitEdgeEditing = useCallback(() => { setEditingEdgeId(null); commitInteraction('Edit label') }, [commitInteraction])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = true
      if (e.key === 'Escape') {
        if (editingNodeId) exitNodeEditing()
        else if (editingEdgeId) exitEdgeEditing()
        else if (connectingFrom || tool === 'connect') { cancelConnecting(); setTool('select'); setPointerPos(null); setSnapTarget(null); gestureRef.current = null }
        else clearSelection()
      } else if (e.key === 'Enter' && editingNodeId) exitNodeEditing()
      else if (e.key === 'Enter' && editingEdgeId) exitEdgeEditing()
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [tool, connectingFrom, cancelConnecting, setTool, clearSelection, editingNodeId, editingEdgeId, exitNodeEditing, exitEdgeEditing])

  const singleEdgeSelected = selectedEdgeIds.size === 1 ? [...selectedEdgeIds][0] : null

  return (
    <svg
      ref={canvasRef}
      data-testid="diagram-canvas"
      data-tool={tool}
      className="h-full w-full bg-[#fbfaf7]"
      style={{ cursor: tool === 'connect' ? 'crosshair' : 'default', touchAction: 'none' }}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onContextMenu={onCanvasContextMenu}
    >
      <defs>
        <pattern id="grid" width={diagram.meta.gridSize} height={diagram.meta.gridSize} patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#ded8ce" opacity="0.55" />
        </pattern>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#7b756b" /></marker>
        <marker id="arrowhead-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse"><polygon points="0 0, 10 3, 0 6" fill="#7b756b" /></marker>
        <marker id="arrowhead-sel" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#3b82f6" /></marker>
        <marker id="arrowhead-start-sel" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse"><polygon points="0 0, 10 3, 0 6" fill="#3b82f6" /></marker>
      </defs>
      <rect className="canvas-bg" x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#grid)" />

      {/* Edges */}
      {diagram.edges.map((edge) => {
        const fromNode = diagram.nodes.find((n) => n.id === edge.from.nodeId)
        const toNode = diagram.nodes.find((n) => n.id === edge.to.nodeId)
        if (!fromNode || !toNode) return null
        const pts = routeEdgePoints(nodeBox(fromNode), nodeBox(toNode), edge)
        const d = pointsToPath(pts, edge.routing)
        const mid = polylineMidpoint(pts)
        const isSelected = selectedEdgeIds.has(edge.id)
        const stroke = isSelected ? '#3b82f6' : (edge.style?.stroke || '#000000')
        const strokeWidth = (edge.style?.strokeWidth || 2) + (isSelected ? 1 : 0)
        const showEnd = edge.arrowEnd !== false
        const showStart = edge.arrowStart === true

        return (
          <g key={edge.id} data-edge-id={edge.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(H(14), strokeWidth + H(10))} style={{ cursor: 'pointer' }}
              onPointerDown={(ev) => { if (ev.button === 2) return; ev.stopPropagation(); selectEdges([edge.id], ev.shiftKey) }}
              onDoubleClick={(ev) => { ev.stopPropagation(); selectEdges([edge.id]); beginInteraction(); setEditingEdgeId(edge.id) }}
              onContextMenu={(ev) => { ev.preventDefault(); ev.stopPropagation(); selectEdges([edge.id]); showContextMenu(ev.clientX, ev.clientY, 'edge') }} />
            <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={edge.style?.strokeDasharray}
              markerEnd={showEnd ? `url(#${isSelected ? 'arrowhead-sel' : 'arrowhead'})` : undefined}
              markerStart={showStart ? `url(#${isSelected ? 'arrowhead-start-sel' : 'arrowhead-start'})` : undefined}
              pointerEvents="none" />
            {edge.label && editingEdgeId !== edge.id && (
              <text x={mid.x} y={mid.y - H(4)} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize={H(12)} pointerEvents="none">{edge.label}</text>
            )}
            {editingEdgeId === edge.id && (
              <foreignObject x={mid.x - H(60)} y={mid.y - H(14)} width={H(120)} height={H(26)}>
                <input autoFocus className="w-full h-full rounded border border-[#3b82f6] bg-white px-1 text-center text-[12px] outline-none"
                  style={{ fontSize: H(12) }} value={edge.label || ''} onChange={(ev) => handleEdgeTextChange(edge.id, ev.target.value)}
                  onBlur={exitEdgeEditing} onKeyDown={(ev) => { if (ev.key === 'Enter') exitEdgeEditing() }} />
              </foreignObject>
            )}
            {/* edge editing handles */}
            {singleEdgeSelected === edge.id && (
              <>
                {segmentMidpoints(pts).map((mp, i) => (
                  <circle key={`add-${i}`} data-testid={`add-waypoint-${edge.id}-${i}`} cx={mp.x} cy={mp.y} r={H(4)} fill="#fff" stroke="#3b82f6" strokeWidth={H(1)} opacity={0.7}
                    style={{ cursor: 'pointer' }} onPointerDown={(ev) => onAddWaypointPointerDown(ev, edge.id, i)} />
                ))}
                {(edge.points ?? []).map((wp, i) => (
                  <rect key={`wp-${i}`} data-testid={`waypoint-${edge.id}-${i}`} x={wp.x - H(5)} y={wp.y - H(5)} width={H(10)} height={H(10)} fill="#3b82f6" stroke="#fff" strokeWidth={H(1.5)}
                    style={{ cursor: 'move' }} onPointerDown={(ev) => onWaypointPointerDown(ev, edge.id, i)} />
                ))}
                {[['from', pts[0]] as const, ['to', pts[pts.length - 1]] as const].map(([which, p]) => (
                  <circle key={which} data-testid={`endpoint-${edge.id}-${which}`} cx={p.x} cy={p.y} r={H(6)} fill="#fff" stroke="#16a34a" strokeWidth={H(2)}
                    style={{ cursor: 'crosshair' }} onPointerDown={(ev) => onEndpointPointerDown(ev, edge.id, which)} />
                ))}
              </>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {orderedNodes.map((node) => {
        const isSelected = selectedNodeIds.has(node.id)
        const isEditing = editingNodeId === node.id
        const cx = node.x + node.w / 2
        const cy = node.y + node.h / 2
        const rot = node.rotation ? `rotate(${node.rotation} ${cx} ${cy})` : undefined
        return (
          <g key={node.id} data-node-id={node.id} data-node-type={node.type} data-shape-kind={node.shapeKind ?? node.type} transform={rot}
            onPointerDown={(e) => onNodePointerDown(e, node.id)}
            onPointerEnter={() => setHoverNodeId(node.id)} onPointerLeave={() => setHoverNodeId((h) => (h === node.id ? null : h))}
            onDoubleClick={(e) => { e.stopPropagation(); if (tool !== 'connect') { beginInteraction(); setEditingNodeId(node.id) } }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!selectedNodeIds.has(node.id)) selectNodes([node.id]); showContextMenu(e.clientX, e.clientY, 'node') }}
            style={{ cursor: tool === 'connect' ? 'crosshair' : 'move' }}>
            <NodeShape node={node} />
            {!isEditing && node.text && (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={node.style?.fontSize || 14}
                fontFamily={node.style?.fontFamily || 'Geist, ui-sans-serif'} fontWeight={node.style?.fontWeight}
                fill={node.style?.fontColor || '#26221d'} opacity={node.style?.opacity ?? 1} pointerEvents="none">{node.text}</text>
            )}
            {isEditing && (
              <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}>
                <input autoFocus className="w-full h-full text-center bg-transparent border-none outline-none" value={node.text || ''}
                  onChange={(e) => handleTextChange(node.id, e.target.value)} onBlur={exitNodeEditing}
                  onKeyDown={(e) => { if (e.key === 'Enter') exitNodeEditing() }} />
              </foreignObject>
            )}
            {/* hover connect affordance (select mode) */}
            {!isSelected && hoverNodeId === node.id && tool !== 'connect' && (
              <circle cx={node.x + node.w} cy={cy} r={H(5)} fill="#16a34a" stroke="#fff" strokeWidth={H(1.5)} opacity={0.85}
                style={{ cursor: 'crosshair' }} onPointerDown={(e) => onConnectHandlePointerDown(e, node.id)} />
            )}
            {isSelected && (
              <>
                <rect x={node.x - H(2)} y={node.y - H(2)} width={node.w + H(4)} height={node.h + H(4)} fill="none" stroke="#3b82f6" strokeWidth={H(1.5)} pointerEvents="none" />
                {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => {
                  const hx = handle.includes('e') ? node.x + node.w : handle.includes('w') ? node.x : cx
                  const hy = handle.includes('s') ? node.y + node.h : handle.includes('n') ? node.y : cy
                  return <rect key={handle} x={hx - H(4)} y={hy - H(4)} width={H(8)} height={H(8)} fill="#fff" stroke="#3b82f6" strokeWidth={H(1.5)}
                    style={{ cursor: `${handle}-resize` }} onPointerDown={(e) => onResizePointerDown(e, node.id, handle)} />
                })}
                <line x1={cx} y1={node.y - H(2)} x2={cx} y2={node.y - H(22)} stroke="#3b82f6" strokeWidth={H(1.5)} pointerEvents="none" />
                <circle data-testid={`rotate-handle-${node.id}`} cx={cx} cy={node.y - H(22)} r={H(5)} fill="#fff" stroke="#3b82f6" strokeWidth={H(1.5)}
                  style={{ cursor: 'grab' }} onPointerDown={(e) => onRotatePointerDown(e, node.id)} />
                <circle data-testid={`connect-handle-${node.id}`} cx={node.x + node.w} cy={cy} r={H(5)} fill="#16a34a" stroke="#fff" strokeWidth={H(1.5)}
                  style={{ cursor: 'crosshair' }} onPointerDown={(e) => onConnectHandlePointerDown(e, node.id)} />
              </>
            )}
          </g>
        )
      })}

      {/* connect / endpoint preview */}
      {(connectingFrom || gestureRef.current?.kind === 'connect' || gestureRef.current?.kind === 'endpoint') && pointerPos && (() => {
        const fromId = connectingFrom?.nodeId ?? (gestureRef.current?.kind === 'connect' ? gestureRef.current.fromId : null)
        const from = fromId ? diagram.nodes.find((n) => n.id === fromId) : null
        const start = from ? { x: from.x + from.w / 2, y: from.y + from.h / 2 } : pointerPos
        return <line x1={start.x} y1={start.y} x2={pointerPos.x} y2={pointerPos.y} stroke="#16a34a" strokeWidth={H(2)} strokeDasharray={`${H(5)},${H(5)}`} markerEnd="url(#arrowhead)" pointerEvents="none" />
      })()}

      {/* snap target highlight + ports */}
      {snapTarget && (() => {
        const n = diagram.nodes.find((nn) => nn.id === snapTarget.nodeId)
        if (!n) return null
        return (
          <g pointerEvents="none">
            <rect x={n.x - H(2)} y={n.y - H(2)} width={n.w + H(4)} height={n.h + H(4)} fill="none" stroke="#16a34a" strokeWidth={H(2)} />
            {(['n', 's', 'e', 'w'] as PortId[]).map((p) => {
              const pp = p === 'n' ? { x: n.x + n.w / 2, y: n.y } : p === 's' ? { x: n.x + n.w / 2, y: n.y + n.h } : p === 'e' ? { x: n.x + n.w, y: n.y + n.h / 2 } : { x: n.x, y: n.y + n.h / 2 }
              return <circle key={p} cx={pp.x} cy={pp.y} r={H(4)} fill={snapTarget.port === p ? '#16a34a' : '#fff'} stroke="#16a34a" strokeWidth={H(1.5)} />
            })}
          </g>
        )
      })()}

      {/* smart guides */}
      {guides.map((gl, i) => <line key={i} x1={gl.x1} y1={gl.y1} x2={gl.x2} y2={gl.y2} stroke="#f43f5e" strokeWidth={H(1)} pointerEvents="none" />)}

      {/* marquee */}
      {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#3b82f6" fillOpacity={0.08} stroke="#3b82f6" strokeWidth={H(1)} strokeDasharray={`${H(4)},${H(3)}`} pointerEvents="none" />}
    </svg>
  )
}

function NodeShape({ node }: { node: DiagramNode }) {
  const prim = nodePrimitive(node)
  const fill = node.type === 'text' ? 'transparent' : (node.style?.fill || '#ffffff')
  const stroke = node.style?.stroke || '#000000'
  const strokeWidth = node.style?.strokeWidth ?? 2
  const opacity = node.style?.opacity ?? 1
  const dash = node.style?.strokeDasharray
  const common = { fill, stroke, strokeWidth, opacity, strokeDasharray: dash }
  switch (prim.kind) {
    case 'rect': return <rect x={prim.x} y={prim.y} width={prim.w} height={prim.h} rx={prim.rx || undefined} {...common} />
    case 'ellipse': return <ellipse cx={prim.cx} cy={prim.cy} rx={prim.rx} ry={prim.ry} {...common} />
    case 'polygon': return <polygon points={prim.points.map(([px, py]) => `${px},${py}`).join(' ')} {...common} />
    case 'path': return <path d={prim.d} {...common} />
    case 'none': return <rect x={node.x} y={node.y} width={node.w} height={node.h} fill="transparent" stroke="none" />
  }
}
