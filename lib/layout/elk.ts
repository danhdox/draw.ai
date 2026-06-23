import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import { Diagram } from '@/lib/model/diagram'
import { Diff } from '@/lib/model/diff'
import { runLayout } from '@/lib/layout/layout'

export interface ElkLayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT'
  spacing?: number
  scopeIds?: string[]
}

// Hierarchical layout via ELK's "layered" algorithm. Respects node dimensions,
// edge direction and spacing, and supports laying out a selected subset only.
// Falls back to the deterministic built-in grid/hierarchical layout if ELK
// fails for any reason.
export async function runElkLayout(
  diagram: Diagram,
  options: ElkLayoutOptions = {}
): Promise<Diff> {
  const { direction = 'DOWN', spacing = 60, scopeIds } = options

  const nodesToLayout = scopeIds
    ? diagram.nodes.filter((n) => scopeIds.includes(n.id))
    : diagram.nodes

  if (nodesToLayout.length === 0) {
    return { ops: [], summary: 'No nodes to layout' }
  }

  const scopeSet = new Set(nodesToLayout.map((n) => n.id))
  const edgesInScope = diagram.edges.filter(
    (e) => scopeSet.has(e.from.nodeId) && scopeSet.has(e.to.nodeId)
  )

  // Anchor the laid-out subset around its current top-left so selected-only
  // layout doesn't jump the nodes across the canvas.
  const originX = Math.min(...nodesToLayout.map((n) => n.x))
  const originY = Math.min(...nodesToLayout.map((n) => n.y))

  try {
    const elk = new ELK()
    const graph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction,
        'elk.spacing.nodeNode': String(spacing),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing + 20),
      },
      children: nodesToLayout.map((n) => ({ id: n.id, width: n.w, height: n.h })),
      edges: edgesInScope.map((e) => ({
        id: e.id,
        sources: [e.from.nodeId],
        targets: [e.to.nodeId],
      })),
    }

    const result = await elk.layout(graph)
    const ops: Diff['ops'] = []

    for (const child of result.children ?? []) {
      if (child.x === undefined || child.y === undefined) continue
      ops.push({
        type: 'updateNode',
        id: child.id,
        patch: { x: Math.round(originX + child.x), y: Math.round(originY + child.y) },
      })
    }

    if (ops.length === 0) {
      return runLayout(diagram, 'hierarchical', scopeIds)
    }

    return { ops, summary: `Arranged ${ops.length} node${ops.length === 1 ? '' : 's'} with ELK layout` }
  } catch {
    // ELK can fail in constrained runtimes — fall back to deterministic layout.
    return runLayout(diagram, 'hierarchical', scopeIds)
  }
}
