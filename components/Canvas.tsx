'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { Node as DiagramNode } from '@/lib/model/diagram'
import { nodePrimitive } from '@/lib/render/shapes'
import { edgeAnchors, edgePath, edgeMidpoint, nodeBox } from '@/lib/render/edges'

export function Canvas() {
  const canvasRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizingNode, setResizingNode] = useState<{ id: string; handle: string } | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const [connectDragging, setConnectDragging] = useState(false)

  // Active pointers (for pinch-zoom on touch).
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ dist: number } | null>(null)
  // Pointer captured once a drag/resize actually moves (capturing on pointerdown
  // would suppress click/dblclick).
  const capturedPointer = useRef<number | null>(null)

  const {
    diagram,
    selectedNodeIds,
    selectedEdgeIds,
    selectNodes,
    selectEdges,
    clearSelection,
    tool,
    setTool,
    isConnecting,
    connectingFrom,
    startConnecting,
    finishConnecting,
    cancelConnecting,
    beginInteraction,
    updateLive,
    commitInteraction,
  } = useDiagramStore()

  // Render back-to-front by z-order; ties keep insertion order.
  const orderedNodes = useMemo(
    () => diagram.nodes.map((n, i) => ({ n, i })).sort((a, b) => (a.n.zIndex ?? 0) - (b.n.zIndex ?? 0) || a.i - b.i).map((e) => e.n),
    [diagram.nodes]
  )

  const screenToSVG = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const ctm = canvasRef.current.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = canvasRef.current.createSVGPoint()
    pt.x = screenX
    pt.y = screenY
    const svgPt = pt.matrixTransform(ctm.inverse())
    return { x: svgPt.x, y: svgPt.y }
  }, [])

  const snapToGrid = useCallback((x: number, y: number) => {
    if (!diagram.meta.snap) return { x, y }
    const gridSize = diagram.meta.gridSize
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    }
  }, [diagram.meta.snap, diagram.meta.gridSize])

  const zoomAround = useCallback((factor: number) => {
    setViewBox((prev) => {
      const newWidth = prev.width * factor
      const newHeight = prev.height * factor
      return {
        x: prev.x - (newWidth - prev.width) / 2,
        y: prev.y - (newHeight - prev.height) / 2,
        width: newWidth,
        height: newHeight,
      }
    })
  }, [])

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const target = e.target as SVGElement
    if (target === canvasRef.current || target.classList.contains('canvas-bg')) {
      if (connectingFrom) cancelConnecting()
      // Two fingers on empty canvas → start a pinch, not a pan.
      if (pointersRef.current.size >= 2) {
        const pts = [...pointersRef.current.values()]
        pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) }
        setIsPanning(false)
        return
      }
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      clearSelection()
    }
  }

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    // Pinch-zoom when two pointers are down.
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (dist > 0) {
        zoomAround(pinchRef.current.dist / dist)
        pinchRef.current.dist = dist
      }
      return
    }

    if (isConnecting && connectingFrom) {
      setPointerPos(screenToSVG(e.clientX, e.clientY))
    }

    // Capture the pointer the moment a drag/resize starts moving, so it keeps
    // tracking even over overlapping panels or outside the window.
    if ((draggedNodeId || resizingNode) && capturedPointer.current === null && canvasRef.current) {
      try {
        canvasRef.current.setPointerCapture(e.pointerId)
        capturedPointer.current = e.pointerId
      } catch {
        /* capture is best-effort */
      }
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }))
      setPanStart({ x: e.clientX, y: e.clientY })
    } else if (draggedNodeId) {
      const svgCoords = screenToSVG(e.clientX, e.clientY)
      const snapped = snapToGrid(svgCoords.x - dragOffset.x, svgCoords.y - dragOffset.y)
      updateLive({ ops: [{ type: 'updateNode', id: draggedNodeId, patch: { x: snapped.x, y: snapped.y } }] })
    } else if (resizingNode) {
      const node = diagram.nodes.find((n) => n.id === resizingNode.id)
      if (!node) return
      const svgCoords = screenToSVG(e.clientX, e.clientY)
      let newW = node.w
      let newH = node.h
      let newX = node.x
      let newY = node.y
      if (resizingNode.handle.includes('e')) newW = Math.max(50, svgCoords.x - node.x)
      if (resizingNode.handle.includes('w')) {
        newW = Math.max(50, node.w + (node.x - svgCoords.x))
        newX = svgCoords.x
      }
      if (resizingNode.handle.includes('s')) newH = Math.max(30, svgCoords.y - node.y)
      if (resizingNode.handle.includes('n')) {
        newH = Math.max(30, node.h + (node.y - svgCoords.y))
        newY = svgCoords.y
      }
      updateLive({ ops: [{ type: 'updateNode', id: resizingNode.id, patch: { x: newX, y: newY, w: newW, h: newH } }] })
    }
  }, [isConnecting, connectingFrom, isPanning, panStart, draggedNodeId, dragOffset, resizingNode, diagram.nodes, updateLive, snapToGrid, screenToSVG, zoomAround])

  const endPointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (capturedPointer.current !== null) {
      canvasRef.current?.releasePointerCapture?.(capturedPointer.current)
      capturedPointer.current = null
    }

    if (draggedNodeId) commitInteraction('Move node')
    if (resizingNode) commitInteraction('Resize node')

    setIsPanning(false)
    setDraggedNodeId(null)
    setResizingNode(null)
    if (connectDragging) {
      cancelConnecting()
      setConnectDragging(false)
      setPointerPos(null)
    }
  }, [draggedNodeId, resizingNode, connectDragging, commitInteraction, cancelConnecting])

  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
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

    if (e.shiftKey) selectNodes([nodeId], true)
    else if (!selectedNodeIds.has(nodeId)) selectNodes([nodeId])

    const svgCoords = screenToSVG(e.clientX, e.clientY)
    beginInteraction()
    setDraggedNodeId(nodeId)
    setDragOffset({ x: svgCoords.x - node.x, y: svgCoords.y - node.y })
  }

  const handleNodePointerUp = (e: React.PointerEvent, nodeId: string) => {
    if (connectDragging && connectingFrom) {
      e.stopPropagation()
      finishConnecting(nodeId)
      setConnectDragging(false)
      setPointerPos(null)
    }
  }

  const handleConnectHandlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    const node = diagram.nodes.find((n) => n.id === nodeId)
    if (!node) return
    startConnecting(nodeId)
    setConnectDragging(true)
    // Intentionally NOT capturing the pointer: the target node's own pointerup
    // must fire to complete the connection.
    setPointerPos({ x: node.x + node.w / 2, y: node.y + node.h / 2 })
  }

  const handleResizeHandlePointerDown = (e: React.PointerEvent, nodeId: string, handle: string) => {
    e.stopPropagation()
    beginInteraction()
    setResizingNode({ id: nodeId, handle })
  }

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (tool === 'connect') return
    beginInteraction()
    setEditingNodeId(nodeId)
  }

  const handleTextChange = (nodeId: string, text: string) => {
    updateLive({ ops: [{ type: 'updateNode', id: nodeId, patch: { text } }] })
  }

  const exitEditing = useCallback(() => {
    setEditingNodeId(null)
    commitInteraction('Edit text')
  }, [commitInteraction])

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    zoomAround(e.deltaY > 0 ? 1.1 : 0.9)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingNodeId) {
          exitEditing()
        } else if (connectingFrom || tool === 'connect') {
          cancelConnecting()
          setTool('select')
          setConnectDragging(false)
          setPointerPos(null)
        } else {
          clearSelection()
        }
      } else if (e.key === 'Enter' && editingNodeId) {
        exitEditing()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool, connectingFrom, cancelConnecting, setTool, clearSelection, editingNodeId, exitEditing])

  const cursor = tool === 'connect' ? 'crosshair' : 'default'

  return (
    <svg
      ref={canvasRef}
      data-testid="diagram-canvas"
      data-tool={tool}
      className="h-full w-full bg-[#fbfaf7]"
      style={{ cursor, touchAction: 'none' }}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={handleWheel}
    >
      {diagram.meta.gridSize && (
        <defs>
          <pattern id="grid" width={diagram.meta.gridSize} height={diagram.meta.gridSize} patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#ded8ce" opacity="0.55" />
          </pattern>
        </defs>
      )}
      <rect
        className="canvas-bg"
        x={viewBox.x}
        y={viewBox.y}
        width={viewBox.width}
        height={viewBox.height}
        fill={diagram.meta.gridSize ? 'url(#grid)' : '#fbfaf7'}
      />

      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#7b756b" />
        </marker>
        <marker id="arrowhead-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse">
          <polygon points="0 0, 10 3, 0 6" fill="#7b756b" />
        </marker>
        <marker id="arrowhead-sel" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
        </marker>
        <marker id="arrowhead-start-sel" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse">
          <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
        </marker>
      </defs>

      {/* Edges */}
      {diagram.edges.map((edge) => {
        const fromNode = diagram.nodes.find((n) => n.id === edge.from.nodeId)
        const toNode = diagram.nodes.find((n) => n.id === edge.to.nodeId)
        if (!fromNode || !toNode) return null

        const anchors = edgeAnchors(nodeBox(fromNode), nodeBox(toNode))
        const d = edgePath(anchors, edge.routing)
        const mid = edgeMidpoint(anchors)

        const isSelected = selectedEdgeIds.has(edge.id)
        const stroke = isSelected ? '#3b82f6' : (edge.style?.stroke || '#000000')
        const strokeWidth = (edge.style?.strokeWidth || 2) + (isSelected ? 1 : 0)
        const showEnd = edge.arrowEnd !== false
        const showStart = edge.arrowStart === true
        const dash = edge.style?.strokeDasharray

        return (
          <g key={edge.id} data-edge-id={edge.id}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(12, strokeWidth + 10)}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                selectEdges([edge.id], e.shiftKey)
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dash}
              markerEnd={showEnd ? `url(#${isSelected ? 'arrowhead-sel' : 'arrowhead'})` : undefined}
              markerStart={showStart ? `url(#${isSelected ? 'arrowhead-start-sel' : 'arrowhead-start'})` : undefined}
              pointerEvents="none"
            />
            {edge.label && (
              <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize="12" pointerEvents="none">
                <tspan dx="0" dy="-4" className="select-none">{edge.label}</tspan>
              </text>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {orderedNodes.map((node) => {
        const isSelected = selectedNodeIds.has(node.id)
        const isEditing = editingNodeId === node.id

        return (
          <g
            key={node.id}
            data-node-id={node.id}
            data-node-type={node.type}
            data-shape-kind={node.shapeKind ?? node.type}
            onPointerDown={(e) => handleNodePointerDown(e, node.id)}
            onPointerUp={(e) => handleNodePointerUp(e, node.id)}
            onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
            style={{ cursor: tool === 'connect' ? 'crosshair' : 'move' }}
          >
            <NodeShape node={node} />

            {!isEditing && node.text && (
              <text
                x={node.x + node.w / 2}
                y={node.y + node.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={node.style?.fontSize || 14}
                fontFamily={node.style?.fontFamily || 'Geist, ui-sans-serif'}
                fontWeight={node.style?.fontWeight}
                fill="#26221d"
                opacity={node.style?.opacity ?? 1}
                pointerEvents="none"
              >
                {node.text}
              </text>
            )}

            {isEditing && (
              <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}>
                <input
                  autoFocus
                  className="w-full h-full text-center bg-transparent border-none outline-none"
                  value={node.text || ''}
                  onChange={(e) => handleTextChange(node.id, e.target.value)}
                  onBlur={exitEditing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') exitEditing()
                  }}
                />
              </foreignObject>
            )}

            {isSelected && (
              <>
                <rect
                  x={node.x - 2}
                  y={node.y - 2}
                  width={node.w + 4}
                  height={node.h + 4}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  pointerEvents="none"
                />
                {['nw', 'ne', 'se', 'sw'].map((handle) => {
                  const x = handle.includes('e') ? node.x + node.w : node.x
                  const y = handle.includes('s') ? node.y + node.h : node.y
                  return (
                    <rect
                      key={handle}
                      x={x - 4}
                      y={y - 4}
                      width="8"
                      height="8"
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth="1"
                      style={{ cursor: `${handle}-resize` }}
                      onPointerDown={(e) => handleResizeHandlePointerDown(e, node.id, handle)}
                    />
                  )
                })}
                <circle
                  data-testid={`connect-handle-${node.id}`}
                  cx={node.x + node.w}
                  cy={node.y + node.h / 2}
                  r="5"
                  fill="#16a34a"
                  stroke="#fff"
                  strokeWidth="1.5"
                  style={{ cursor: 'crosshair' }}
                  onPointerDown={(e) => handleConnectHandlePointerDown(e, node.id)}
                />
              </>
            )}
          </g>
        )
      })}

      {/* Connecting preview line */}
      {connectingFrom && pointerPos && (() => {
        const fromNode = diagram.nodes.find((n) => n.id === connectingFrom.nodeId)
        if (!fromNode) return null
        const start = edgeAnchors(nodeBox(fromNode), { x: pointerPos.x, y: pointerPos.y, w: 1, h: 1 })
        return (
          <line
            x1={start.x1}
            y1={start.y1}
            x2={pointerPos.x}
            y2={pointerPos.y}
            stroke="#16a34a"
            strokeWidth="2"
            strokeDasharray="5,5"
            markerEnd="url(#arrowhead)"
            pointerEvents="none"
          />
        )
      })()}
    </svg>
  )
}

function NodeShape({ node }: { node: DiagramNode }) {
  const prim = nodePrimitive(node)
  const fill = node.type === 'text' ? 'transparent' : (node.style?.fill || '#ffffff')
  const stroke = node.style?.stroke || '#000000'
  const strokeWidth = node.style?.strokeWidth ?? 2
  const opacity = node.style?.opacity ?? 1

  const common = { fill, stroke, strokeWidth, opacity }

  switch (prim.kind) {
    case 'rect':
      return <rect x={prim.x} y={prim.y} width={prim.w} height={prim.h} rx={prim.rx || undefined} {...common} />
    case 'ellipse':
      return <ellipse cx={prim.cx} cy={prim.cy} rx={prim.rx} ry={prim.ry} {...common} />
    case 'polygon':
      return <polygon points={prim.points.map(([px, py]) => `${px},${py}`).join(' ')} {...common} />
    case 'path':
      return <path d={prim.d} {...common} />
    case 'none':
      return <rect x={node.x} y={node.y} width={node.w} height={node.h} fill="transparent" stroke="none" />
  }
}
