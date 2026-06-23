'use client'

import { useRef } from 'react'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { useViewportStore } from '@/lib/store/useViewportStore'

const W = 180
const H = 120
const PAD = 8

export function Minimap() {
  const nodes = useDiagramStore((s) => s.diagram.nodes)
  const { viewBox, setViewBox } = useViewportStore()
  const svgRef = useRef<SVGSVGElement>(null)

  if (nodes.length === 0) return null

  // World bounds = all nodes ∪ current viewport, so the viewport box is visible.
  let minX = viewBox.x, minY = viewBox.y, maxX = viewBox.x + viewBox.width, maxY = viewBox.y + viewBox.height
  for (const n of nodes) {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h)
  }
  const bw = Math.max(1, maxX - minX)
  const bh = Math.max(1, maxY - minY)
  const s = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh)
  const offX = PAD + ((W - PAD * 2) - bw * s) / 2
  const offY = PAD + ((H - PAD * 2) - bh * s) / 2
  const toMap = (x: number, y: number) => ({ x: offX + (x - minX) * s, y: offY + (y - minY) * s })

  const recenter = (clientX: number, clientY: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return
    const mx = clientX - r.left
    const my = clientY - r.top
    const worldX = minX + (mx - offX) / s
    const worldY = minY + (my - offY) / s
    setViewBox({ x: worldX - viewBox.width / 2, y: worldY - viewBox.height / 2, width: viewBox.width, height: viewBox.height })
  }

  const vb = toMap(viewBox.x, viewBox.y)

  return (
    <div className="absolute bottom-5 left-[300px] z-30 overflow-hidden rounded-lg border border-[#e5ded4] bg-white/95 shadow-lg shadow-black/5 backdrop-blur max-lg:hidden" data-testid="minimap">
      <svg ref={svgRef} width={W} height={H} className="block cursor-pointer touch-none"
        onPointerDown={(e) => { (e.target as SVGElement).setPointerCapture?.(e.pointerId); recenter(e.clientX, e.clientY) }}
        onPointerMove={(e) => { if (e.buttons === 1) recenter(e.clientX, e.clientY) }}>
        <rect x={0} y={0} width={W} height={H} fill="#fbfaf7" />
        {nodes.map((n) => {
          const p = toMap(n.x, n.y)
          return <rect key={n.id} x={p.x} y={p.y} width={Math.max(1, n.w * s)} height={Math.max(1, n.h * s)} fill="#c9d3df" stroke="#9aa7b6" strokeWidth={0.5} rx={1} />
        })}
        <rect x={vb.x} y={vb.y} width={viewBox.width * s} height={viewBox.height * s} fill="#3b82f6" fillOpacity={0.12} stroke="#3b82f6" strokeWidth={1} />
      </svg>
    </div>
  )
}
