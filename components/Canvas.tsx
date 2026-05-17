'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { generateId } from '@/lib/model/diagram'
import { Node as DiagramNode } from '@/lib/model/diagram'

interface CanvasProps {
  onAddNode?: (type: DiagramNode['type']) => void
}

export function Canvas({ onAddNode }: CanvasProps) {
  const canvasRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizingNode, setResizingNode] = useState<{ id: string; handle: string } | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  const {
    diagram,
    selectedNodeIds,
    selectedEdgeIds,
    applyDiffWithHistory,
    selectNodes,
    selectEdges,
    clearSelection,
    isConnecting,
    connectingFrom,
    finishConnecting,
    cancelConnecting,
  } = useDiagramStore()

  // Convert screen coordinates to SVG coordinates
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

  // Snap to grid
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!diagram.meta.snap) return { x, y }
    const gridSize = diagram.meta.gridSize
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    }
  }, [diagram.meta.snap, diagram.meta.gridSize])

  // Handle mouse down on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return // Only left click

    const target = e.target as SVGElement
    if (target === canvasRef.current || target.classList.contains('canvas-bg')) {
      // Start panning
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      clearSelection()
    }
  }

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }))
      setPanStart({ x: e.clientX, y: e.clientY })
    } else if (draggedNodeId) {
      const svgCoords = screenToSVG(e.clientX, e.clientY)
      const snapped = snapToGrid(svgCoords.x - dragOffset.x, svgCoords.y - dragOffset.y)
      
      applyDiffWithHistory({
        ops: [{
          type: 'updateNode',
          id: draggedNodeId,
          patch: { x: snapped.x, y: snapped.y },
        }],
        summary: 'Move node',
      })
    } else if (resizingNode) {
      const node = diagram.nodes.find(n => n.id === resizingNode.id)
      if (!node) return

      const svgCoords = screenToSVG(e.clientX, e.clientY)
      
      let newW = node.w
      let newH = node.h
      let newX = node.x
      let newY = node.y

      if (resizingNode.handle.includes('e')) {
        newW = Math.max(50, svgCoords.x - node.x)
      }
      if (resizingNode.handle.includes('w')) {
        newW = Math.max(50, node.w + (node.x - svgCoords.x))
        newX = svgCoords.x
      }
      if (resizingNode.handle.includes('s')) {
        newH = Math.max(30, svgCoords.y - node.y)
      }
      if (resizingNode.handle.includes('n')) {
        newH = Math.max(30, node.h + (node.y - svgCoords.y))
        newY = svgCoords.y
      }

      applyDiffWithHistory({
        ops: [{
          type: 'updateNode',
          id: resizingNode.id,
          patch: { x: newX, y: newY, w: newW, h: newH },
        }],
        summary: 'Resize node',
      })
    }
  }, [isPanning, panStart, draggedNodeId, dragOffset, resizingNode, diagram.nodes, applyDiffWithHistory, snapToGrid, screenToSVG])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDraggedNodeId(null)
    setResizingNode(null)
  }, [])

  // Handle node click
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    
    const node = diagram.nodes.find(n => n.id === nodeId)
    if (!node) return

    if (e.shiftKey) {
      selectNodes([nodeId], true)
    } else if (!selectedNodeIds.has(nodeId)) {
      selectNodes([nodeId])
    }

    const svgCoords = screenToSVG(e.clientX, e.clientY)
    setDraggedNodeId(nodeId)
    setDragOffset({
      x: svgCoords.x - node.x,
      y: svgCoords.y - node.y,
    })
  }

  // Handle node double click to edit text
  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setEditingNodeId(nodeId)
  }

  // Handle text change
  const handleTextChange = (nodeId: string, text: string) => {
    applyDiffWithHistory({
      ops: [{
        type: 'updateNode',
        id: nodeId,
        patch: { text },
      }],
      summary: 'Edit text',
    })
  }

  // Handle resize handle mouse down
  const handleResizeHandleMouseDown = (e: React.MouseEvent, nodeId: string, handle: string) => {
    e.stopPropagation()
    setResizingNode({ id: nodeId, handle })
  }

  // Handle node connection
  const handleNodeConnectionClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (isConnecting && connectingFrom) {
      finishConnecting(nodeId)
    }
  }

  // Zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 1.1 : 0.9
    setViewBox((prev) => {
      const newWidth = prev.width * delta
      const newHeight = prev.height * delta
      const dx = (newWidth - prev.width) / 2
      const dy = (newHeight - prev.height) / 2
      return {
        x: prev.x - dx,
        y: prev.y - dy,
        width: newWidth,
        height: newHeight,
      }
    })
  }

  // Render node shape
  const renderNodeShape = (node: DiagramNode) => {
    const fill = node.style?.fill || '#ffffff'
    const stroke = node.style?.stroke || '#000000'
    const strokeWidth = node.style?.strokeWidth || 2

    if (node.type === 'rect') {
      return (
        <rect
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          rx={14}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
    } else if (node.type === 'ellipse') {
      return (
        <ellipse
          cx={node.x + node.w / 2}
          cy={node.y + node.h / 2}
          rx={node.w / 2}
          ry={node.h / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
    } else if (node.type === 'diamond') {
      const cx = node.x + node.w / 2
      const cy = node.y + node.h / 2
      const points = `${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
    } else if (node.type === 'text') {
      return (
        <rect
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          fill="transparent"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray="5,5"
        />
      )
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isConnecting) {
          cancelConnecting()
        } else {
          clearSelection()
          setEditingNodeId(null)
        }
      } else if (e.key === 'Enter' && editingNodeId) {
        setEditingNodeId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConnecting, cancelConnecting, clearSelection, editingNodeId])

  return (
    <svg
      ref={canvasRef}
      data-testid="diagram-canvas"
      className="h-full w-full bg-[#fbfaf7]"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid */}
      {diagram.meta.gridSize && (
        <defs>
          <pattern
            id="grid"
            width={diagram.meta.gridSize}
            height={diagram.meta.gridSize}
            patternUnits="userSpaceOnUse"
          >
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

      {/* Edges */}
      {diagram.edges.map((edge) => {
        const fromNode = diagram.nodes.find(n => n.id === edge.from.nodeId)
        const toNode = diagram.nodes.find(n => n.id === edge.to.nodeId)
        if (!fromNode || !toNode) return null

        const x1 = fromNode.x + fromNode.w / 2
        const y1 = fromNode.y + fromNode.h / 2
        const x2 = toNode.x + toNode.w / 2
        const y2 = toNode.y + toNode.h / 2

        const isSelected = selectedEdgeIds.has(edge.id)
        const stroke = edge.style?.stroke || '#000000'
        const strokeWidth = edge.style?.strokeWidth || 2

        return (
          <g key={edge.id}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isSelected ? '#3b82f6' : stroke}
              strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
              markerEnd="url(#arrowhead)"
              onClick={(e) => {
                e.stopPropagation()
                selectEdges([edge.id], e.shiftKey)
              }}
              style={{ cursor: 'pointer' }}
            />
            {edge.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={stroke}
                fontSize="12"
                pointerEvents="none"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Arrow marker */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#7b756b" />
        </marker>
      </defs>

      {/* Nodes */}
      {diagram.nodes.map((node) => {
        const isSelected = selectedNodeIds.has(node.id)
        const isEditing = editingNodeId === node.id

        return (
          <g
            key={node.id}
            data-node-id={node.id}
            data-node-type={node.type}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
            onClick={(e) => handleNodeConnectionClick(e, node.id)}
            style={{ cursor: 'move' }}
          >
            {renderNodeShape(node)}
            
            {/* Text */}
            {!isEditing && node.text && (
              <text
                x={node.x + node.w / 2}
                y={node.y + node.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={node.style?.fontSize || 14}
                fontFamily={node.style?.fontFamily || 'Geist, ui-sans-serif'}
                fill="#26221d"
                pointerEvents="none"
              >
                {node.text}
              </text>
            )}

            {/* Editing text */}
            {isEditing && (
              <foreignObject
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
              >
                <input
                  autoFocus
                  className="w-full h-full text-center bg-transparent border-none outline-none"
                  value={node.text || ''}
                  onChange={(e) => handleTextChange(node.id, e.target.value)}
                  onBlur={() => setEditingNodeId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingNodeId(null)
                  }}
                />
              </foreignObject>
            )}

            {/* Selection and resize handles */}
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
                {/* Resize handles */}
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
                      onMouseDown={(e) => handleResizeHandleMouseDown(e, node.id, handle)}
                    />
                  )
                })}
              </>
            )}
          </g>
        )
      })}

      {/* Connecting line */}
      {isConnecting && connectingFrom && (() => {
        const fromNode = diagram.nodes.find(n => n.id === connectingFrom.nodeId)
        if (!fromNode) return null
        
        return (
          <line
            x1={fromNode.x + fromNode.w / 2}
            y1={fromNode.y + fromNode.h / 2}
            x2={viewBox.x + viewBox.width / 2}
            y2={viewBox.y + viewBox.height / 2}
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5,5"
            pointerEvents="none"
          />
        )
      })()}
    </svg>
  )
}
