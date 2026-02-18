import { describe, it, expect } from 'vitest'
import { createEmptyDiagram, generateId } from '@/lib/model/diagram'
import { applyDiff, invertDiff, validateDiff } from '@/lib/model/diff'

describe('Diff Operations', () => {
  it('should apply addNode operation', () => {
    const diagram = createEmptyDiagram()
    const node = {
      id: generateId('node'),
      type: 'rect' as const,
      x: 100,
      y: 100,
      w: 150,
      h: 100,
      text: 'Test Node',
    }

    const diff = {
      ops: [{ type: 'addNode' as const, node }],
      summary: 'Add test node',
    }

    const result = applyDiff(diagram, diff)
    expect(result.diagram.nodes).toHaveLength(1)
    expect(result.diagram.nodes[0]).toEqual(node)
    expect(result.errors).toBeUndefined()
  })

  it('should apply updateNode operation', () => {
    const diagram = createEmptyDiagram()
    const nodeId = generateId('node')
    diagram.nodes.push({
      id: nodeId,
      type: 'rect',
      x: 100,
      y: 100,
      w: 150,
      h: 100,
    })

    const diff = {
      ops: [
        {
          type: 'updateNode' as const,
          id: nodeId,
          patch: { x: 200, y: 200, text: 'Updated' },
        },
      ],
      summary: 'Update node',
    }

    const result = applyDiff(diagram, diff)
    expect(result.diagram.nodes[0].x).toBe(200)
    expect(result.diagram.nodes[0].y).toBe(200)
    expect(result.diagram.nodes[0].text).toBe('Updated')
  })

  it('should apply removeNode operation', () => {
    const diagram = createEmptyDiagram()
    const nodeId = generateId('node')
    diagram.nodes.push({
      id: nodeId,
      type: 'rect',
      x: 100,
      y: 100,
      w: 150,
      h: 100,
    })

    const diff = {
      ops: [{ type: 'removeNode' as const, id: nodeId }],
      summary: 'Remove node',
    }

    const result = applyDiff(diagram, diff)
    expect(result.diagram.nodes).toHaveLength(0)
  })

  it('should invert addNode to removeNode', () => {
    const diagram = createEmptyDiagram()
    const node = {
      id: generateId('node'),
      type: 'rect' as const,
      x: 100,
      y: 100,
      w: 150,
      h: 100,
    }

    const diff = {
      ops: [{ type: 'addNode' as const, node }],
      summary: 'Add node',
    }

    const inverseDiff = invertDiff(diagram, diff)
    expect(inverseDiff.ops).toHaveLength(1)
    expect(inverseDiff.ops[0].type).toBe('removeNode')
    expect((inverseDiff.ops[0] as any).id).toBe(node.id)
  })

  it('should invert removeNode to addNode', () => {
    const diagram = createEmptyDiagram()
    const node = {
      id: generateId('node'),
      type: 'rect' as const,
      x: 100,
      y: 100,
      w: 150,
      h: 100,
    }
    diagram.nodes.push(node)

    const diff = {
      ops: [{ type: 'removeNode' as const, id: node.id }],
      summary: 'Remove node',
    }

    const inverseDiff = invertDiff(diagram, diff)
    expect(inverseDiff.ops).toHaveLength(1)
    expect(inverseDiff.ops[0].type).toBe('addNode')
    expect((inverseDiff.ops[0] as any).node).toEqual(node)
  })

  it('should invert updateNode correctly', () => {
    const diagram = createEmptyDiagram()
    const nodeId = generateId('node')
    diagram.nodes.push({
      id: nodeId,
      type: 'rect',
      x: 100,
      y: 100,
      w: 150,
      h: 100,
      text: 'Original',
    })

    const diff = {
      ops: [
        {
          type: 'updateNode' as const,
          id: nodeId,
          patch: { x: 200, text: 'Updated' },
        },
      ],
      summary: 'Update node',
    }

    const inverseDiff = invertDiff(diagram, diff)
    expect(inverseDiff.ops).toHaveLength(1)
    expect(inverseDiff.ops[0].type).toBe('updateNode')
    const updateOp = inverseDiff.ops[0] as any
    expect(updateOp.patch.x).toBe(100)
    expect(updateOp.patch.text).toBe('Original')
  })

  it('should validate diff correctly', () => {
    const diagram = createEmptyDiagram()
    const nodeId = generateId('node')
    diagram.nodes.push({
      id: nodeId,
      type: 'rect',
      x: 100,
      y: 100,
      w: 150,
      h: 100,
    })

    // Valid diff
    const validDiff = {
      ops: [
        {
          type: 'updateNode' as const,
          id: nodeId,
          patch: { x: 200 },
        },
      ],
    }
    expect(validateDiff(diagram, validDiff)).toHaveLength(0)

    // Invalid diff - node doesn't exist
    const invalidDiff = {
      ops: [
        {
          type: 'updateNode' as const,
          id: 'non-existent',
          patch: { x: 200 },
        },
      ],
    }
    const errors = validateDiff(diagram, invalidDiff)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('not found')
  })

  it('should handle edge operations', () => {
    const diagram = createEmptyDiagram()
    const node1Id = generateId('node')
    const node2Id = generateId('node')
    
    diagram.nodes.push(
      {
        id: node1Id,
        type: 'rect',
        x: 100,
        y: 100,
        w: 150,
        h: 100,
      },
      {
        id: node2Id,
        type: 'rect',
        x: 300,
        y: 100,
        w: 150,
        h: 100,
      }
    )

    const edgeId = generateId('edge')
    const diff = {
      ops: [
        {
          type: 'addEdge' as const,
          edge: {
            id: edgeId,
            from: { nodeId: node1Id },
            to: { nodeId: node2Id },
          },
        },
      ],
      summary: 'Add edge',
    }

    const result = applyDiff(diagram, diff)
    expect(result.diagram.edges).toHaveLength(1)
    expect(result.diagram.edges[0].from.nodeId).toBe(node1Id)
    expect(result.diagram.edges[0].to.nodeId).toBe(node2Id)

    // Test invert
    const inverseDiff = invertDiff(diagram, diff)
    const result2 = applyDiff(result.diagram, inverseDiff)
    expect(result2.diagram.edges).toHaveLength(0)
  })

  it('should cascade delete edges when node is removed', () => {
    const diagram = createEmptyDiagram()
    const node1Id = generateId('node')
    const node2Id = generateId('node')
    
    diagram.nodes.push(
      {
        id: node1Id,
        type: 'rect',
        x: 100,
        y: 100,
        w: 150,
        h: 100,
      },
      {
        id: node2Id,
        type: 'rect',
        x: 300,
        y: 100,
        w: 150,
        h: 100,
      }
    )

    diagram.edges.push({
      id: generateId('edge'),
      from: { nodeId: node1Id },
      to: { nodeId: node2Id },
    })

    const diff = {
      ops: [{ type: 'removeNode' as const, id: node1Id }],
      summary: 'Remove node',
    }

    const result = applyDiff(diagram, diff)
    expect(result.diagram.nodes).toHaveLength(1)
    expect(result.diagram.edges).toHaveLength(0) // Edge should be removed
  })
})
