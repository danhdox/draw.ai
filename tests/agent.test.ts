import { describe, expect, it } from 'vitest'
import { createEmptyDiagram } from '@/lib/model/diagram'
import { coerceDiffProposal, createFallbackDiagramDiff, getLastUserText, summarizeDiff } from '@/lib/agent/diagramAgent'
import { DiffSchema } from '@/lib/model/diff'

describe('agent diagram helpers', () => {
  it('extracts the latest user text from UI message parts', () => {
    const text = getLastUserText([
      { role: 'user', parts: [{ type: 'text', text: 'first request' }] },
      { role: 'assistant', parts: [{ type: 'text', text: 'response' }] },
      { role: 'user', parts: [{ type: 'text', text: 'second request' }] },
    ])

    expect(text).toBe('second request')
  })

  it('creates a schema-valid fallback diff with connected nodes', () => {
    const diff = createFallbackDiagramDiff('start then review then publish', createEmptyDiagram())
    const parsed = DiffSchema.safeParse(diff)

    expect(parsed.success).toBe(true)
    expect(diff.ops.filter((op) => op.type === 'addNode')).toHaveLength(3)
    expect(diff.ops.filter((op) => op.type === 'addEdge')).toHaveLength(2)
  })

  it('summarizes operation counts for the console and diff preview', () => {
    const diff = createFallbackDiagramDiff('one then two', createEmptyDiagram())

    expect(summarizeDiff(diff)).toContain('2 nodes')
    expect(summarizeDiff(diff)).toContain('1 edge')
  })

  it('repairs a common legacy model diff shape', () => {
    const diff = coerceDiffProposal({
      ops: [
        { addNode: { id: 'start', type: 'ellipse', label: 'Start', x: 100, y: 100 } },
        { addNode: { id: 'review', type: 'rect', label: 'Review', x: 300, y: 100 } },
        { addEdge: { id: 'edge-1', from: 'start', to: 'review' } },
      ],
      summary: 'Add a start and review step.',
    })

    expect(diff).not.toBeNull()
    expect(diff?.ops[0].type).toBe('addNode')
    expect(diff?.ops[2].type).toBe('addEdge')
  })
})
