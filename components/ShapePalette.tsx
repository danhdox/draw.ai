'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { generateId, Node, ShapeKind } from '@/lib/model/diagram'
import { shapeGeometry } from '@/lib/render/shapes'

type PaletteShape = {
  label: string
  id: string
  type: Node['type']
  shapeKind?: ShapeKind
  connector?: boolean
  text?: string
  w?: number
  h?: number
  fill?: string
  stroke?: string
}

// Only shapes the renderer can actually draw; previews come from the real
// renderer, so a palette item always matches the inserted node.
const generalShapes: PaletteShape[] = [
  { label: 'Rectangle', id: 'rect', type: 'rect', shapeKind: 'rect', w: 168, h: 72 },
  { label: 'Rounded Rectangle', id: 'rounded', type: 'rect', shapeKind: 'rounded', w: 168, h: 72 },
  { label: 'Text', id: 'text', type: 'text', shapeKind: 'text', text: 'Text', w: 120, h: 44, fill: 'transparent', stroke: 'transparent' },
  { label: 'Ellipse', id: 'ellipse', type: 'ellipse', shapeKind: 'ellipse', w: 152, h: 76 },
  { label: 'Square', id: 'square', type: 'rect', shapeKind: 'rect', w: 120, h: 120 },
  { label: 'Circle', id: 'circle', type: 'ellipse', shapeKind: 'ellipse', w: 120, h: 120 },
  { label: 'Diamond', id: 'diamond', type: 'diamond', shapeKind: 'diamond', w: 132, h: 132 },
  { label: 'Parallelogram', id: 'parallelogram', type: 'rect', shapeKind: 'parallelogram', w: 168, h: 72 },
  { label: 'Hexagon', id: 'hexagon', type: 'rect', shapeKind: 'hexagon', w: 160, h: 86 },
  { label: 'Triangle', id: 'triangle', type: 'diamond', shapeKind: 'triangle', w: 120, h: 110 },
  { label: 'Trapezoid', id: 'trapezoid', type: 'rect', shapeKind: 'trapezoid', w: 168, h: 84 },
  { label: 'Chevron', id: 'chevron', type: 'rect', shapeKind: 'chevron', w: 168, h: 72 },
  { label: 'Database', id: 'database', type: 'rect', shapeKind: 'cylinder', text: 'Data', w: 144, h: 112 },
  { label: 'Cloud', id: 'cloud', type: 'ellipse', shapeKind: 'cloud', text: 'Cloud', w: 168, h: 100 },
  { label: 'Document', id: 'document', type: 'rect', shapeKind: 'document', text: 'Document', w: 160, h: 100 },
  { label: 'Note', id: 'note', type: 'rect', shapeKind: 'note', w: 140, h: 152 },
  { label: 'Stadium', id: 'stadium', type: 'rect', shapeKind: 'stadium', w: 168, h: 64 },
  { label: 'Card', id: 'card', type: 'rect', shapeKind: 'card', w: 160, h: 92 },
  { label: 'Step', id: 'step', type: 'rect', shapeKind: 'step', w: 160, h: 72 },
  { label: 'Callout', id: 'callout', type: 'rect', shapeKind: 'callout', w: 160, h: 96 },
  { label: 'Manual Input', id: 'manualInput', type: 'rect', shapeKind: 'manualInput', w: 160, h: 84 },
  { label: 'Display', id: 'display', type: 'rect', shapeKind: 'display', w: 168, h: 84 },
  { label: 'Predefined Process', id: 'predefinedProcess', type: 'rect', shapeKind: 'predefinedProcess', w: 168, h: 80 },
  { label: 'Internal Storage', id: 'internalStorage', type: 'rect', shapeKind: 'internalStorage', w: 140, h: 110 },
]

const connectorShapes: PaletteShape[] = [
  { label: 'Connector (click two nodes)', id: 'arrow', type: 'rect', connector: true },
]

const compactShapes = generalShapes.slice(0, 6)

function dragPayload(shape: PaletteShape): string {
  return JSON.stringify({ type: shape.type, shapeKind: shape.shapeKind, text: shape.text, w: shape.w, h: shape.h })
}

export function ShapePalette({ collapsed = false }: { collapsed?: boolean }) {
  const { applyDiffWithHistory, setTool, diagram } = useDiagramStore()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const match = (s: PaletteShape) => !q || s.label.toLowerCase().includes(q)
  const visibleShapes = generalShapes.filter(match)
  const visibleConnectors = connectorShapes.filter(match)

  const addShape = (shape: PaletteShape) => {
    if (shape.connector) {
      setTool('connect')
      return
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024
    const cascade = (diagram.nodes.length % 6) * 24
    const nodeId = generateId('node')
    applyDiffWithHistory({
      ops: [{
        type: 'addNode',
        node: {
          id: nodeId,
          type: shape.type,
          shapeKind: shape.shapeKind,
          x: 360 + cascade,
          y: (isMobile ? 110 : 260) + cascade,
          w: shape.w ?? (shape.type === 'diamond' ? 132 : 168),
          h: shape.h ?? (shape.type === 'diamond' ? 132 : 78),
          text: shape.text ?? '',
          style: { fill: shape.fill ?? '#ffffff', stroke: shape.stroke ?? '#4a4a4a', strokeWidth: 2, fontSize: 14, fontFamily: 'Geist, ui-sans-serif' },
        },
      }],
      summary: `Add ${shape.label}`,
    })
  }

  const dragProps = (shape: PaletteShape) =>
    shape.connector
      ? {}
      : { draggable: true, onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('application/draw-shape', dragPayload(shape)); e.dataTransfer.effectAllowed = 'copy' } }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={`border-b border-[#e3ddd2] p-3 max-lg:hidden ${collapsed ? 'hidden' : ''}`}>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-[#e3ddd2] bg-[#f7f5f0] px-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shapes" aria-label="Search shapes" data-testid="palette-search"
            className="h-full w-full bg-transparent text-[13px] text-[#333] outline-none placeholder:text-[#9a9388]" />
          <Search className="h-4 w-4 shrink-0 text-[#7a7a7a]" />
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-1 border-b border-[#eee8de] p-2 ${collapsed ? '' : 'hidden max-lg:grid'}`}>
        {compactShapes.map((shape) => (
          <Button key={shape.label} data-testid={`shape-${shape.id}`} variant="outline" size="icon" className="h-9 w-9 rounded-md max-lg:w-full" title={shape.label} onClick={() => addShape(shape)} {...dragProps(shape)}>
            <ShapePreview kind={shape.shapeKind!} />
          </Button>
        ))}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 max-lg:hidden ${collapsed ? 'hidden' : ''}`}>
        <section className="mb-5">
          <PaletteSectionHeader title="General" />
          {visibleShapes.length === 0 ? (
            <p className="mt-3 text-[12px] text-[#9a9388]">No shapes match “{query}”.</p>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-3" data-testid="drawio-general-shape-grid">
              {visibleShapes.map((shape) => (
                <button key={shape.label} type="button" title={shape.label} data-testid={`drawio-shape-${shape.id}`} {...dragProps(shape)}
                  className="flex h-9 cursor-pointer items-center justify-center rounded-md text-[#45484a] transition hover:bg-[#f4f2ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                  onClick={() => addShape(shape)}>
                  <ShapePreview kind={shape.shapeKind!} />
                </button>
              ))}
            </div>
          )}
        </section>

        {visibleConnectors.length > 0 && (
          <section className="mb-5">
            <PaletteSectionHeader title="Connectors" />
            <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-3">
              {visibleConnectors.map((shape) => (
                <button key={shape.label} type="button" title={shape.label} data-testid={`drawio-connector-${shape.id}`}
                  className="flex h-9 cursor-pointer items-center justify-center rounded-md text-[#45484a] transition hover:bg-[#f4f2ee]"
                  onClick={() => addShape(shape)}>
                  <svg viewBox="0 0 64 44" className="h-7 w-10"><path d="M12 34 48 8M48 8H36M48 8v12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-[#9a9388]">Pick the connector, then click a source and a target node — or drag a shape onto the canvas.</p>
          </section>
        )}
      </div>
    </div>
  )
}

function PaletteSectionHeader({ title }: { title: string }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8378]">{title}</div>
}

function ShapePreview({ kind }: { kind: ShapeKind }) {
  if (kind === 'text') {
    return <svg viewBox="0 0 64 44" className="h-7 w-10" aria-hidden><text x="32" y="27" textAnchor="middle" className="fill-current text-[11px]">Text</text></svg>
  }
  const prim = shapeGeometry(kind, 7, 9, 50, 26)
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 64 44" className="h-7 w-10 overflow-visible" aria-hidden>
      {prim.kind === 'rect' && <rect x={prim.x} y={prim.y} width={prim.w} height={prim.h} rx={prim.rx || undefined} {...common} />}
      {prim.kind === 'ellipse' && <ellipse cx={prim.cx} cy={prim.cy} rx={prim.rx} ry={prim.ry} {...common} />}
      {prim.kind === 'polygon' && <polygon points={prim.points.map(([px, py]) => `${px},${py}`).join(' ')} {...common} />}
      {prim.kind === 'path' && <path d={prim.d} {...common} />}
    </svg>
  )
}
