import { Diagram, Node, Edge, createEmptyDiagram, generateId } from '@/lib/model/diagram'
import { applyDiff } from '@/lib/model/diff'
import { runLayout } from '@/lib/layout/layout'

type Direction = 'TD' | 'TB' | 'LR' | 'RL' | 'BT'

interface ParsedNode {
  id: string
  label: string
  shapeKind: Node['shapeKind']
  type: Node['type']
}

// Map a mermaid bracket wrapper onto our shape model.
function shapeFromWrapper(wrapper: string): { shapeKind: Node['shapeKind']; type: Node['type'] } {
  if (wrapper.startsWith('((')) return { shapeKind: 'ellipse', type: 'ellipse' }
  if (wrapper.startsWith('([')) return { shapeKind: 'rounded', type: 'rect' }
  if (wrapper.startsWith('[(')) return { shapeKind: 'cylinder', type: 'rect' }
  if (wrapper.startsWith('[[')) return { shapeKind: 'rect', type: 'rect' }
  if (wrapper.startsWith('{{')) return { shapeKind: 'hexagon', type: 'rect' }
  if (wrapper.startsWith('{')) return { shapeKind: 'diamond', type: 'diamond' }
  if (wrapper.startsWith('[/') && wrapper.endsWith('/]')) return { shapeKind: 'parallelogram', type: 'rect' }
  if (wrapper.startsWith('[/') && wrapper.endsWith('\\]')) return { shapeKind: 'trapezoid', type: 'rect' }
  if (wrapper.startsWith('(')) return { shapeKind: 'rounded', type: 'rect' }
  return { shapeKind: 'rect', type: 'rect' }
}

function stripLabel(raw: string): string {
  let label = raw.trim()
  // Remove the outermost matching wrapper characters already handled; here we
  // only strip surrounding quotes and mermaid quote entities.
  if (
    (label.startsWith('"') && label.endsWith('"')) ||
    (label.startsWith("'") && label.endsWith("'"))
  ) {
    label = label.slice(1, -1)
  }
  return label.replace(/#quot;/g, '"').trim()
}

// Token: a node with optional shape wrapper, a connector, or a |pipe label|.
const TOKEN_RE = new RegExp(
  [
    // node id + optional shape wrapper
    '([A-Za-z0-9_]+)(\\(\\([^)]*\\)\\)|\\[\\([^\\]]*\\)\\]|\\(\\[[^\\]]*\\]\\)|\\[\\[[^\\]]*\\]\\]|\\{\\{[^}]*\\}\\}|\\[/[^\\]]*[/\\\\]\\]|\\[[^\\]]*\\]|\\([^)]*\\)|\\{[^}]*\\})?',
    // connector
    '(-\\.->|-->|---|==>|===)',
    // pipe label
    '\\|([^|]*)\\|',
  ].join('|'),
  'g'
)

function innerLabel(wrapper: string): string {
  // Drop the leading/trailing bracket characters of any supported wrapper.
  const m = wrapper.match(/^[([{/\\]+(.*?)[)\]}/\\]+$/)
  return stripLabel(m ? m[1] : wrapper)
}

export function importFromMermaid(mermaidText: string): Diagram {
  if (!mermaidText || !mermaidText.trim()) {
    throw new Error('Mermaid input is empty')
  }

  const rawLines = mermaidText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'))

  if (rawLines.length === 0) {
    throw new Error('No Mermaid statements found')
  }

  // Header: `flowchart TD`, `graph LR`, etc.
  let direction: Direction = 'TD'
  const header = rawLines[0]
  const headerMatch = header.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i)
  if (!headerMatch) {
    if (!/^(?:flowchart|graph)\b/i.test(header)) {
      throw new Error('Unsupported Mermaid diagram: expected "flowchart" or "graph"')
    }
  } else {
    direction = headerMatch[1].toUpperCase() as Direction
  }

  const nodeMap = new Map<string, ParsedNode>()
  const edges: Array<{ from: string; to: string; label?: string; dashed?: boolean }> = []

  const ensureNode = (id: string, wrapper?: string): ParsedNode => {
    let node = nodeMap.get(id)
    if (!node) {
      node = { id, label: id, shapeKind: 'rect', type: 'rect' }
      nodeMap.set(id, node)
    }
    if (wrapper) {
      const shape = shapeFromWrapper(wrapper)
      node.shapeKind = shape.shapeKind
      node.type = shape.type
      node.label = innerLabel(wrapper) || id
    }
    return node
  }

  for (const line of rawLines.slice(1)) {
    if (/^(subgraph|end)\b/i.test(line)) continue

    // Walk tokens left-to-right, wiring edges between consecutive nodes and
    // attaching any pipe label to the connector that precedes it.
    TOKEN_RE.lastIndex = 0
    let match: RegExpExecArray | null
    let prevNodeId: string | null = null
    let pendingConnector: { dashed: boolean } | null = null
    let pendingLabel: string | undefined

    while ((match = TOKEN_RE.exec(line)) !== null) {
      const [, nodeId, wrapper, connector, pipeLabel] = match

      if (nodeId) {
        ensureNode(nodeId, wrapper)
        if (prevNodeId && pendingConnector) {
          edges.push({ from: prevNodeId, to: nodeId, label: pendingLabel, dashed: pendingConnector.dashed })
        }
        prevNodeId = nodeId
        pendingConnector = null
        pendingLabel = undefined
      } else if (connector) {
        pendingConnector = { dashed: connector.startsWith('-.') }
      } else if (pipeLabel !== undefined) {
        pendingLabel = stripLabel(pipeLabel)
      }
    }
  }

  if (nodeMap.size === 0) {
    throw new Error('No diagram nodes found in Mermaid input')
  }

  // Build the diagram with placeholder positions, then run layout.
  let diagram: Diagram = createEmptyDiagram()
  const idMap = new Map<string, string>()

  const nodes: Node[] = Array.from(nodeMap.values()).map((parsed) => {
    const id = generateId('node')
    idMap.set(parsed.id, id)
    const isDiamond = parsed.shapeKind === 'diamond'
    return {
      id,
      type: parsed.type,
      shapeKind: parsed.shapeKind,
      x: 0,
      y: 0,
      w: isDiamond ? 120 : 160,
      h: isDiamond ? 120 : 64,
      text: parsed.label,
      style: { fill: '#ffffff', stroke: '#4a4a4a', strokeWidth: 2, fontSize: 14 },
    }
  })

  const diagramEdges: Edge[] = edges
    .filter((e) => idMap.has(e.from) && idMap.has(e.to))
    .map((e) => ({
      id: generateId('edge'),
      from: { nodeId: idMap.get(e.from)! },
      to: { nodeId: idMap.get(e.to)! },
      label: e.label || undefined,
      arrowEnd: true,
      style: e.dashed
        ? { stroke: '#4a4a4a', strokeWidth: 2, strokeDasharray: '6 4' }
        : { stroke: '#4a4a4a', strokeWidth: 2 },
    }))

  diagram = { ...diagram, nodes, edges: diagramEdges }

  // Position nodes via the deterministic hierarchical layout.
  const layoutDiff = runLayout(diagram, 'hierarchical')
  diagram = applyDiff(diagram, layoutDiff).diagram

  // For left-to-right charts, transpose the top-down layout.
  if (direction === 'LR' || direction === 'RL') {
    diagram = {
      ...diagram,
      nodes: diagram.nodes.map((n) => ({ ...n, x: n.y, y: n.x })),
    }
  }

  return diagram
}
