import { Diagram, Node } from '@/lib/model/diagram'
import { resolveShapeKind } from '@/lib/render/shapes'

// Mermaid node ids must be simple tokens. Map our (possibly hyphenated / UUID)
// ids onto stable, unique, mermaid-safe identifiers.
function buildIdMap(diagram: Diagram): Map<string, string> {
  const map = new Map<string, string>()
  const used = new Set<string>()
  diagram.nodes.forEach((node, index) => {
    let base = node.id.replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+/, '')
    if (!base || /^[0-9]/.test(base)) base = `n_${base || index}`
    let candidate = base
    let suffix = 1
    while (used.has(candidate)) candidate = `${base}_${suffix++}`
    used.add(candidate)
    map.set(node.id, candidate)
  })
  return map
}

// Mermaid escapes double quotes inside quoted labels as the HTML entity.
function escapeLabel(text: string): string {
  return text.replace(/"/g, '#quot;').replace(/\n/g, ' ')
}

// Wrap a node label in the bracket syntax that matches its visual shape.
function mermaidNode(id: string, node: Node): string {
  const label = `"${escapeLabel(node.text || id)}"`
  switch (resolveShapeKind(node)) {
    case 'rounded':
      return `${id}(${label})`
    case 'ellipse':
      return `${id}((${label}))`
    case 'diamond':
      return `${id}{${label}}`
    case 'hexagon':
      return `${id}{{${label}}}`
    case 'parallelogram':
      return `${id}[/${label}/]`
    case 'trapezoid':
      return `${id}[/${label}\\]`
    case 'cylinder':
      return `${id}[(${label})]`
    default:
      // rect, triangle, chevron, cloud, document, note, text
      return `${id}[${label}]`
  }
}

export function exportToMermaid(diagram: Diagram): string {
  const idMap = buildIdMap(diagram)
  const lines: string[] = ['flowchart TD']

  diagram.nodes.forEach((node) => {
    const id = idMap.get(node.id)!
    lines.push(`  ${mermaidNode(id, node)}`)
  })

  diagram.edges.forEach((edge) => {
    const from = idMap.get(edge.from.nodeId)
    const to = idMap.get(edge.to.nodeId)
    if (!from || !to) return
    const connector = edge.style?.strokeDasharray ? '-.->' : '-->'
    if (edge.label) {
      lines.push(`  ${from} ${connector}|${escapeLabel(edge.label)}| ${to}`)
    } else {
      lines.push(`  ${from} ${connector} ${to}`)
    }
  })

  return lines.join('\n')
}
