import { Diagram } from '@/lib/model/diagram'

// Export diagram as SVG
export function exportSVG(diagram: Diagram): string {
  // Calculate bounds
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

  // Add padding
  const padding = 50
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  const offsetX = -minX + padding
  const offsetY = -minY + padding

  // Start SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`
  
  // Add background
  svg += `  <rect width="${width}" height="${height}" fill="white"/>\n`

  // Render edges first (so they're below nodes)
  diagram.edges.forEach((edge) => {
    const fromNode = diagram.nodes.find((n) => n.id === edge.from.nodeId)
    const toNode = diagram.nodes.find((n) => n.id === edge.to.nodeId)
    
    if (!fromNode || !toNode) return

    const x1 = fromNode.x + fromNode.w / 2 + offsetX
    const y1 = fromNode.y + fromNode.h / 2 + offsetY
    const x2 = toNode.x + toNode.w / 2 + offsetX
    const y2 = toNode.y + toNode.h / 2 + offsetY

    const stroke = edge.style?.stroke || '#000'
    const strokeWidth = edge.style?.strokeWidth || 2

    if (edge.points && edge.points.length > 0) {
      // Draw path with points
      let pathData = `M ${x1} ${y1}`
      edge.points.forEach((p) => {
        pathData += ` L ${p.x + offsetX} ${p.y + offsetY}`
      })
      pathData += ` L ${x2} ${y2}`
      svg += `  <path d="${pathData}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" marker-end="url(#arrowhead)"/>\n`
    } else {
      // Direct line
      svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)"/>\n`
    }

    // Add label if present
    if (edge.label) {
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      svg += `  <text x="${midX}" y="${midY}" text-anchor="middle" fill="${stroke}" font-size="12">${edge.label}</text>\n`
    }
  })

  // Define arrowhead marker
  svg += `  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#000"/>
    </marker>
  </defs>\n`

  // Render nodes
  diagram.nodes.forEach((node) => {
    const x = node.x + offsetX
    const y = node.y + offsetY
    const fill = node.style?.fill || '#fff'
    const stroke = node.style?.stroke || '#000'
    const strokeWidth = node.style?.strokeWidth || 2
    const fontSize = node.style?.fontSize || 14

    if (node.type === 'rect') {
      svg += `  <rect x="${x}" y="${y}" width="${node.w}" height="${node.h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
    } else if (node.type === 'ellipse') {
      const cx = x + node.w / 2
      const cy = y + node.h / 2
      const rx = node.w / 2
      const ry = node.h / 2
      svg += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
    } else if (node.type === 'diamond') {
      const cx = x + node.w / 2
      const cy = y + node.h / 2
      const points = `${cx},${y} ${x + node.w},${cy} ${cx},${y + node.h} ${x},${cy}`
      svg += `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`
    }

    // Add text
    if (node.text) {
      const textX = x + node.w / 2
      const textY = y + node.h / 2
      svg += `  <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="#000" font-size="${fontSize}">${node.text}</text>\n`
    }
  })

  svg += '</svg>'
  return svg
}

// Download SVG file
export function downloadSVG(diagram: Diagram, filename = 'diagram.svg') {
  const svg = exportSVG(diagram)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
