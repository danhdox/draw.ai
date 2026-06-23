import { Diagram } from '@/lib/model/diagram'
import { Diff } from '@/lib/model/diff'

// Deterministic grid layout
// TODO: Integrate ELKJS for more sophisticated layouts
export function runLayout(
  diagram: Diagram,
  mode: 'grid' | 'hierarchical' | 'force' = 'grid',
  scopeIds?: string[]
): Diff {
  const ops: Diff['ops'] = []
  
  // Get nodes to layout
  const nodesToLayout = scopeIds
    ? diagram.nodes.filter((n) => scopeIds.includes(n.id))
    : diagram.nodes

  if (nodesToLayout.length === 0) {
    return { ops, summary: 'No nodes to layout' }
  }

  // Simple grid layout for MVP
  if (mode === 'grid') {
    const cols = Math.ceil(Math.sqrt(nodesToLayout.length))
    const spacing = 150
    const startX = 100
    const startY = 100

    nodesToLayout.forEach((node, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      ops.push({
        type: 'updateNode',
        id: node.id,
        patch: {
          x: startX + col * spacing,
          y: startY + row * spacing,
        },
      })
    })

    return {
      ops,
      summary: `Grid layout applied to ${nodesToLayout.length} nodes`,
    }
  }

  // Hierarchical layout (simple top-down)
  if (mode === 'hierarchical') {
    // Find root nodes (nodes with no incoming edges)
    const incomingEdges = new Map<string, number>()
    nodesToLayout.forEach((n) => incomingEdges.set(n.id, 0))

    diagram.edges.forEach((edge) => {
      if (nodesToLayout.some((n) => n.id === edge.to.nodeId)) {
        const count = incomingEdges.get(edge.to.nodeId) || 0
        incomingEdges.set(edge.to.nodeId, count + 1)
      }
    })

    const rootNodes = nodesToLayout.filter((n) => incomingEdges.get(n.id) === 0)
    const layers: string[][] = []
    const visited = new Set<string>()

    // BFS to create layers
    let currentLayer = rootNodes.map((n) => n.id)
    while (currentLayer.length > 0) {
      layers.push(currentLayer)
      currentLayer.forEach((id) => visited.add(id))

      const nextLayer = new Set<string>()
      currentLayer.forEach((nodeId) => {
        diagram.edges.forEach((edge) => {
          if (edge.from.nodeId === nodeId && !visited.has(edge.to.nodeId)) {
            nextLayer.add(edge.to.nodeId)
          }
        })
      })
      currentLayer = Array.from(nextLayer)
    }

    // Position nodes by layer
    const verticalSpacing = 150
    const horizontalSpacing = 200
    const startY = 100

    layers.forEach((layer, layerIndex) => {
      const layerWidth = layer.length * horizontalSpacing
      const startX = -layerWidth / 2 + horizontalSpacing / 2

      layer.forEach((nodeId, index) => {
        ops.push({
          type: 'updateNode',
          id: nodeId,
          patch: {
            x: startX + index * horizontalSpacing + 400,
            y: startY + layerIndex * verticalSpacing,
          },
        })
      })
    })

    return {
      ops,
      summary: `Hierarchical layout applied to ${nodesToLayout.length} nodes`,
    }
  }

  // 'force' is not implemented as a distinct algorithm; fall back to the
  // deterministic grid so callers always get a usable result. For real
  // hierarchical layout use runElkLayout (lib/layout/elk.ts).
  return runLayout(diagram, 'grid', scopeIds)
}
