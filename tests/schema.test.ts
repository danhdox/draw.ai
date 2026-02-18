import { describe, it, expect } from 'vitest'
import { DiagramSchema, NodeSchema, EdgeSchema } from '@/lib/model/diagram'

describe('Schema Validation', () => {
  it('should validate a valid node', () => {
    const node = {
      id: 'node-1',
      type: 'rect',
      x: 100,
      y: 200,
      w: 150,
      h: 100,
      text: 'Test Node',
    }

    const result = NodeSchema.safeParse(node)
    expect(result.success).toBe(true)
  })

  it('should reject invalid node type', () => {
    const node = {
      id: 'node-1',
      type: 'invalid',
      x: 100,
      y: 200,
      w: 150,
      h: 100,
    }

    const result = NodeSchema.safeParse(node)
    expect(result.success).toBe(false)
  })

  it('should validate a valid edge', () => {
    const edge = {
      id: 'edge-1',
      from: { nodeId: 'node-1' },
      to: { nodeId: 'node-2' },
    }

    const result = EdgeSchema.safeParse(edge)
    expect(result.success).toBe(true)
  })

  it('should validate a complete diagram', () => {
    const diagram = {
      nodes: [
        {
          id: 'node-1',
          type: 'rect',
          x: 100,
          y: 100,
          w: 150,
          h: 100,
        },
      ],
      edges: [
        {
          id: 'edge-1',
          from: { nodeId: 'node-1' },
          to: { nodeId: 'node-2' },
        },
      ],
      groups: [],
      meta: {
        gridSize: 20,
        snap: true,
      },
    }

    const result = DiagramSchema.safeParse(diagram)
    expect(result.success).toBe(true)
  })

  it('should provide default values for meta', () => {
    const diagram = {
      nodes: [],
      edges: [],
    }

    const result = DiagramSchema.safeParse(diagram)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.meta.gridSize).toBe(20)
      expect(result.data.meta.snap).toBe(true)
      expect(result.data.groups).toEqual([])
    }
  })
})
