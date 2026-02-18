import { z } from 'zod'
import { NodeSchema, EdgeSchema, DiagramMetaSchema, Diagram, Node, Edge } from './diagram'

// Define operation schemas
export const AddNodeOpSchema = z.object({
  type: z.literal('addNode'),
  node: NodeSchema,
})

export const UpdateNodeOpSchema = z.object({
  type: z.literal('updateNode'),
  id: z.string(),
  patch: NodeSchema.partial().omit({ id: true }),
})

export const RemoveNodeOpSchema = z.object({
  type: z.literal('removeNode'),
  id: z.string(),
})

export const AddEdgeOpSchema = z.object({
  type: z.literal('addEdge'),
  edge: EdgeSchema,
})

export const UpdateEdgeOpSchema = z.object({
  type: z.literal('updateEdge'),
  id: z.string(),
  patch: EdgeSchema.partial().omit({ id: true }),
})

export const RemoveEdgeOpSchema = z.object({
  type: z.literal('removeEdge'),
  id: z.string(),
})

export const GroupOpSchema = z.object({
  type: z.literal('group'),
  groupId: z.string(),
  nodeIds: z.array(z.string()),
})

export const UngroupOpSchema = z.object({
  type: z.literal('ungroup'),
  groupId: z.string(),
})

export const SetMetaOpSchema = z.object({
  type: z.literal('setMeta'),
  patch: DiagramMetaSchema.partial(),
})

// Union of all operations
export const OpSchema = z.discriminatedUnion('type', [
  AddNodeOpSchema,
  UpdateNodeOpSchema,
  RemoveNodeOpSchema,
  AddEdgeOpSchema,
  UpdateEdgeOpSchema,
  RemoveEdgeOpSchema,
  GroupOpSchema,
  UngroupOpSchema,
  SetMetaOpSchema,
])

export type Op = z.infer<typeof OpSchema>

// Diff schema
export const DiffSchema = z.object({
  ops: z.array(OpSchema),
  summary: z.string().optional(),
})

export type Diff = z.infer<typeof DiffSchema>

// Apply a diff to a diagram
export function applyDiff(
  diagram: Diagram,
  diff: Diff
): { diagram: Diagram; errors?: string[] } {
  const errors: string[] = []
  const newDiagram = JSON.parse(JSON.stringify(diagram)) as Diagram

  for (const op of diff.ops) {
    try {
      switch (op.type) {
        case 'addNode': {
          // Check if node already exists
          if (newDiagram.nodes.some((n) => n.id === op.node.id)) {
            errors.push(`Node ${op.node.id} already exists`)
            continue
          }
          newDiagram.nodes.push(op.node)
          break
        }

        case 'updateNode': {
          const nodeIndex = newDiagram.nodes.findIndex((n) => n.id === op.id)
          if (nodeIndex === -1) {
            errors.push(`Node ${op.id} not found`)
            continue
          }
          newDiagram.nodes[nodeIndex] = {
            ...newDiagram.nodes[nodeIndex],
            ...op.patch,
          }
          break
        }

        case 'removeNode': {
          const nodeIndex = newDiagram.nodes.findIndex((n) => n.id === op.id)
          if (nodeIndex === -1) {
            errors.push(`Node ${op.id} not found`)
            continue
          }
          newDiagram.nodes.splice(nodeIndex, 1)
          // Also remove edges connected to this node
          newDiagram.edges = newDiagram.edges.filter(
            (e) => e.from.nodeId !== op.id && e.to.nodeId !== op.id
          )
          break
        }

        case 'addEdge': {
          if (newDiagram.edges.some((e) => e.id === op.edge.id)) {
            errors.push(`Edge ${op.edge.id} already exists`)
            continue
          }
          newDiagram.edges.push(op.edge)
          break
        }

        case 'updateEdge': {
          const edgeIndex = newDiagram.edges.findIndex((e) => e.id === op.id)
          if (edgeIndex === -1) {
            errors.push(`Edge ${op.id} not found`)
            continue
          }
          newDiagram.edges[edgeIndex] = {
            ...newDiagram.edges[edgeIndex],
            ...op.patch,
          }
          break
        }

        case 'removeEdge': {
          const edgeIndex = newDiagram.edges.findIndex((e) => e.id === op.id)
          if (edgeIndex === -1) {
            errors.push(`Edge ${op.id} not found`)
            continue
          }
          newDiagram.edges.splice(edgeIndex, 1)
          break
        }

        case 'group': {
          if (newDiagram.groups.some((g) => g.id === op.groupId)) {
            errors.push(`Group ${op.groupId} already exists`)
            continue
          }
          newDiagram.groups.push({
            id: op.groupId,
            nodeIds: op.nodeIds,
          })
          break
        }

        case 'ungroup': {
          const groupIndex = newDiagram.groups.findIndex((g) => g.id === op.groupId)
          if (groupIndex === -1) {
            errors.push(`Group ${op.groupId} not found`)
            continue
          }
          newDiagram.groups.splice(groupIndex, 1)
          break
        }

        case 'setMeta': {
          newDiagram.meta = {
            ...newDiagram.meta,
            ...op.patch,
          }
          break
        }
      }
    } catch (error) {
      errors.push(`Error applying ${op.type}: ${error}`)
    }
  }

  return {
    diagram: newDiagram,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Invert a diff (for undo)
export function invertDiff(diagramBefore: Diagram, diff: Diff): Diff {
  const inverseOps: Op[] = []

  for (const op of diff.ops) {
    switch (op.type) {
      case 'addNode': {
        inverseOps.push({
          type: 'removeNode',
          id: op.node.id,
        })
        break
      }

      case 'updateNode': {
        const originalNode = diagramBefore.nodes.find((n) => n.id === op.id)
        if (originalNode) {
          // Create a patch with only the fields that were changed
          const patch: Partial<Node> = {}
          for (const key of Object.keys(op.patch)) {
            if (key in originalNode) {
              ;(patch as any)[key] = (originalNode as any)[key]
            }
          }
          inverseOps.push({
            type: 'updateNode',
            id: op.id,
            patch,
          })
        }
        break
      }

      case 'removeNode': {
        const originalNode = diagramBefore.nodes.find((n) => n.id === op.id)
        if (originalNode) {
          inverseOps.push({
            type: 'addNode',
            node: originalNode,
          })
        }
        break
      }

      case 'addEdge': {
        inverseOps.push({
          type: 'removeEdge',
          id: op.edge.id,
        })
        break
      }

      case 'updateEdge': {
        const originalEdge = diagramBefore.edges.find((e) => e.id === op.id)
        if (originalEdge) {
          const patch: Partial<Edge> = {}
          for (const key of Object.keys(op.patch)) {
            if (key in originalEdge) {
              ;(patch as any)[key] = (originalEdge as any)[key]
            }
          }
          inverseOps.push({
            type: 'updateEdge',
            id: op.id,
            patch,
          })
        }
        break
      }

      case 'removeEdge': {
        const originalEdge = diagramBefore.edges.find((e) => e.id === op.id)
        if (originalEdge) {
          inverseOps.push({
            type: 'addEdge',
            edge: originalEdge,
          })
        }
        break
      }

      case 'group': {
        inverseOps.push({
          type: 'ungroup',
          groupId: op.groupId,
        })
        break
      }

      case 'ungroup': {
        const originalGroup = diagramBefore.groups.find((g) => g.id === op.groupId)
        if (originalGroup) {
          inverseOps.push({
            type: 'group',
            groupId: op.groupId,
            nodeIds: originalGroup.nodeIds,
          })
        }
        break
      }

      case 'setMeta': {
        const patch: Partial<typeof diagramBefore.meta> = {}
        for (const key of Object.keys(op.patch)) {
          if (key in diagramBefore.meta) {
            ;(patch as any)[key] = (diagramBefore.meta as any)[key]
          }
        }
        inverseOps.push({
          type: 'setMeta',
          patch,
        })
        break
      }
    }
  }

  return {
    ops: inverseOps.reverse(),
    summary: diff.summary ? `Undo: ${diff.summary}` : undefined,
  }
}

// Validate a diff
export function validateDiff(diagram: Diagram, diff: Diff): string[] {
  const errors: string[] = []

  for (const op of diff.ops) {
    try {
      OpSchema.parse(op)

      switch (op.type) {
        case 'addNode':
          if (diagram.nodes.some((n) => n.id === op.node.id)) {
            errors.push(`Node ${op.node.id} already exists`)
          }
          break

        case 'updateNode':
          if (!diagram.nodes.some((n) => n.id === op.id)) {
            errors.push(`Node ${op.id} not found`)
          }
          break

        case 'removeNode':
          if (!diagram.nodes.some((n) => n.id === op.id)) {
            errors.push(`Node ${op.id} not found`)
          }
          break

        case 'addEdge':
          if (diagram.edges.some((e) => e.id === op.edge.id)) {
            errors.push(`Edge ${op.edge.id} already exists`)
          }
          if (!diagram.nodes.some((n) => n.id === op.edge.from.nodeId)) {
            errors.push(`Source node ${op.edge.from.nodeId} not found`)
          }
          if (!diagram.nodes.some((n) => n.id === op.edge.to.nodeId)) {
            errors.push(`Target node ${op.edge.to.nodeId} not found`)
          }
          break

        case 'updateEdge':
          if (!diagram.edges.some((e) => e.id === op.id)) {
            errors.push(`Edge ${op.id} not found`)
          }
          break

        case 'removeEdge':
          if (!diagram.edges.some((e) => e.id === op.id)) {
            errors.push(`Edge ${op.id} not found`)
          }
          break

        case 'group':
          if (diagram.groups.some((g) => g.id === op.groupId)) {
            errors.push(`Group ${op.groupId} already exists`)
          }
          for (const nodeId of op.nodeIds) {
            if (!diagram.nodes.some((n) => n.id === nodeId)) {
              errors.push(`Node ${nodeId} not found`)
            }
          }
          break

        case 'ungroup':
          if (!diagram.groups.some((g) => g.id === op.groupId)) {
            errors.push(`Group ${op.groupId} not found`)
          }
          break
      }
    } catch (error) {
      errors.push(`Invalid operation: ${error}`)
    }
  }

  return errors
}
