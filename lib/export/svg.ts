import { Diagram } from '@/lib/model/diagram'
import { downloadBlob } from '@/lib/export/download'
import { nodePrimitive, primitiveToSvg } from '@/lib/render/shapes'
import { edgeAnchors, edgePath, edgeMidpoint, nodeBox } from '@/lib/render/edges'

// Escape text for safe inclusion in SVG/XML. Without this, labels containing
// `<`, `>`, `&`, or quotes would produce invalid markup.
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface DiagramBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

// Bounding box of all nodes plus padding. Returns a default frame when empty.
export function diagramBounds(diagram: Diagram, padding = 50): DiagramBounds {
  if (diagram.nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  diagram.nodes.forEach((node) => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.w)
    maxY = Math.max(maxY, node.y + node.h)
  })

  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

// Export diagram as SVG
export function exportSVG(diagram: Diagram): string {
  if (diagram.nodes.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">\n  <rect width="800" height="600" fill="white"/>\n</svg>'
  }

  const { minX, minY, width, height } = diagramBounds(diagram)
  const offsetX = -minX
  const offsetY = -minY

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`
  svg += `  <rect width="${width}" height="${height}" fill="white"/>\n`

  // Arrowhead markers
  svg += `  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#7b756b"/>
    </marker>
    <marker id="arrowhead-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse">
      <polygon points="0 0, 10 3, 0 6" fill="#7b756b"/>
    </marker>
  </defs>\n`

  // Render edges first (so they're below nodes)
  diagram.edges.forEach((edge) => {
    const fromNode = diagram.nodes.find((n) => n.id === edge.from.nodeId)
    const toNode = diagram.nodes.find((n) => n.id === edge.to.nodeId)
    if (!fromNode || !toNode) return

    const from = nodeBox(fromNode)
    const to = nodeBox(toNode)
    const anchors = edgeAnchors(
      { ...from, x: from.x + offsetX, y: from.y + offsetY },
      { ...to, x: to.x + offsetX, y: to.y + offsetY }
    )
    const d = edgePath(anchors, edge.routing)

    const stroke = edge.style?.stroke || '#000'
    const strokeWidth = edge.style?.strokeWidth || 2
    const dash = edge.style?.strokeDasharray ? ` stroke-dasharray="${edge.style.strokeDasharray}"` : ''
    const markerEnd = edge.arrowEnd !== false ? ' marker-end="url(#arrowhead)"' : ''
    const markerStart = edge.arrowStart === true ? ' marker-start="url(#arrowhead-start)"' : ''

    svg += `  <path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none"${dash}${markerStart}${markerEnd}/>\n`

    if (edge.label) {
      const mid = edgeMidpoint(anchors)
      svg += `  <text x="${mid.x}" y="${mid.y - 4}" text-anchor="middle" fill="${stroke}" font-size="12">${escapeXml(edge.label)}</text>\n`
    }
  })

  // Render nodes
  diagram.nodes.forEach((node) => {
    const fill = node.type === 'text' ? 'transparent' : (node.style?.fill || '#fff')
    const stroke = node.style?.stroke || '#000'
    const strokeWidth = node.style?.strokeWidth ?? 2
    const opacity = node.style?.opacity ?? 1
    const fontSize = node.style?.fontSize || 14
    const fontFamily = node.style?.fontFamily || 'sans-serif'
    const fontWeight = node.style?.fontWeight ? ` font-weight="${escapeXml(node.style.fontWeight)}"` : ''

    const prim = nodePrimitive({ ...node, x: node.x + offsetX, y: node.y + offsetY })
    const attrs = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"`
    const shapeMarkup = primitiveToSvg(prim, attrs)
    if (shapeMarkup) svg += `  ${shapeMarkup}\n`

    if (node.text) {
      const textX = node.x + offsetX + node.w / 2
      const textY = node.y + offsetY + node.h / 2
      svg += `  <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="#000" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}"${fontWeight}>${escapeXml(node.text)}</text>\n`
    }
  })

  svg += '</svg>'
  return svg
}

// Download SVG file
export function downloadSVG(diagram: Diagram, filename = 'diagram.svg') {
  const svg = exportSVG(diagram)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  downloadBlob(blob, filename)
}
