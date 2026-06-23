import { describe, it, expect } from 'vitest'
import { createEmptyDiagram, Diagram } from '@/lib/model/diagram'
import { runLayout } from '@/lib/layout/layout'
import { runElkLayout } from '@/lib/layout/elk'

function makeChain(ids: string[]): Diagram {
  const diagram = createEmptyDiagram()
  ids.forEach((id, i) => diagram.nodes.push({ id, type: 'rect', x: i * 5, y: 0, w: 120, h: 60, text: id }))
  for (let i = 0; i < ids.length - 1; i++) {
    diagram.edges.push({ id: `e-${i}`, from: { nodeId: ids[i] }, to: { nodeId: ids[i + 1] } })
  }
  return diagram
}

describe('runLayout (built-in fallback)', () => {
  it('returns no ops for an empty diagram', () => {
    const diff = runLayout(createEmptyDiagram(), 'grid')
    expect(diff.ops).toHaveLength(0)
  })

  it('lays out a grid deterministically', () => {
    const diagram = makeChain(['a', 'b', 'c', 'd'])
    const first = runLayout(diagram, 'grid')
    const second = runLayout(diagram, 'grid')
    expect(first.ops).toEqual(second.ops)
    expect(first.ops).toHaveLength(4)
  })

  it('handles disconnected graphs without throwing', () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push(
      { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50 },
      { id: 'b', type: 'rect', x: 0, y: 0, w: 100, h: 50 }
    )
    const diff = runLayout(diagram, 'hierarchical')
    expect(diff.ops).toHaveLength(2)
  })
})

describe('runElkLayout', () => {
  it('returns no ops for an empty diagram', async () => {
    const diff = await runElkLayout(createEmptyDiagram())
    expect(diff.ops).toHaveLength(0)
  })

  it('positions every node in a chain', async () => {
    const diagram = makeChain(['a', 'b', 'c'])
    const diff = await runElkLayout(diagram)
    const updated = new Set(diff.ops.map((op) => (op.type === 'updateNode' ? op.id : '')))
    expect(updated).toEqual(new Set(['a', 'b', 'c']))
  })

  it('is deterministic for identical input', async () => {
    const diagram = makeChain(['a', 'b', 'c', 'd'])
    const a = await runElkLayout(diagram)
    const b = await runElkLayout(diagram)
    expect(a.ops).toEqual(b.ops)
  })

  it('handles a cycle without hanging', async () => {
    const diagram = makeChain(['a', 'b', 'c'])
    diagram.edges.push({ id: 'cycle', from: { nodeId: 'c' }, to: { nodeId: 'a' } })
    const diff = await runElkLayout(diagram)
    expect(diff.ops.length).toBe(3)
  })

  it('lays out only the selected subset', async () => {
    const diagram = makeChain(['a', 'b', 'c', 'd'])
    const diff = await runElkLayout(diagram, { scopeIds: ['a', 'b'] })
    const ids = diff.ops.map((op) => (op.type === 'updateNode' ? op.id : ''))
    expect(ids.sort()).toEqual(['a', 'b'])
  })

  it('handles a disconnected graph', async () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push(
      { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50 },
      { id: 'b', type: 'rect', x: 0, y: 0, w: 100, h: 50 },
      { id: 'c', type: 'rect', x: 0, y: 0, w: 100, h: 50 }
    )
    diagram.edges.push({ id: 'e', from: { nodeId: 'a' }, to: { nodeId: 'b' } })
    const diff = await runElkLayout(diagram)
    expect(diff.ops.length).toBe(3)
  })

  it('scales to a 100-node graph without hanging', async () => {
    const diagram = createEmptyDiagram()
    for (let i = 0; i < 100; i++) {
      diagram.nodes.push({ id: `n${i}`, type: 'rect', x: 0, y: 0, w: 120, h: 60 })
      if (i > 0) diagram.edges.push({ id: `e${i}`, from: { nodeId: `n${i - 1}` }, to: { nodeId: `n${i}` } })
    }
    const diff = await runElkLayout(diagram)
    expect(diff.ops.length).toBe(100)
  }, 20_000)
})
