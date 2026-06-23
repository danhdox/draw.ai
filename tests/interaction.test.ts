import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { createEmptyDiagram } from '@/lib/model/diagram'
import { diffDiagrams } from '@/lib/model/diff'

describe('diffDiagrams', () => {
  it('detects added, updated, and removed nodes', () => {
    const before = createEmptyDiagram()
    before.nodes.push({ id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50 })
    before.nodes.push({ id: 'gone', type: 'rect', x: 0, y: 0, w: 10, h: 10 })

    const after = createEmptyDiagram()
    after.nodes.push({ id: 'a', type: 'rect', x: 50, y: 0, w: 100, h: 50 }) // moved
    after.nodes.push({ id: 'b', type: 'rect', x: 0, y: 0, w: 100, h: 50 }) // added

    const ops = diffDiagrams(before, after).ops
    expect(ops.find((o) => o.type === 'updateNode' && o.id === 'a')).toBeTruthy()
    expect(ops.find((o) => o.type === 'addNode')).toBeTruthy()
    expect(ops.find((o) => o.type === 'removeNode' && o.id === 'gone')).toBeTruthy()
  })

  it('is empty for identical diagrams', () => {
    const d = createEmptyDiagram()
    d.nodes.push({ id: 'a', type: 'rect', x: 1, y: 2, w: 3, h: 4 })
    expect(diffDiagrams(d, JSON.parse(JSON.stringify(d))).ops).toHaveLength(0)
  })

  it('detects meta changes', () => {
    const before = createEmptyDiagram()
    const after = createEmptyDiagram()
    after.meta = { ...after.meta, gridSize: 40 }
    expect(diffDiagrams(before, after).ops).toEqual([{ type: 'setMeta', patch: after.meta }])
  })
})

describe('interaction coalescing', () => {
  beforeEach(() => {
    useDiagramStore.getState().reset()
    const d = createEmptyDiagram()
    d.nodes.push({ id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50 })
    useDiagramStore.getState().setDiagram(d)
  })

  it('collapses many live updates into one undoable step', () => {
    const s = useDiagramStore.getState()
    s.beginInteraction()
    s.updateLive({ ops: [{ type: 'updateNode', id: 'a', patch: { x: 10 } }] })
    s.updateLive({ ops: [{ type: 'updateNode', id: 'a', patch: { x: 20 } }] })
    s.updateLive({ ops: [{ type: 'updateNode', id: 'a', patch: { x: 30 } }] })
    s.commitInteraction('Move node')

    expect(useDiagramStore.getState().diagram.nodes[0].x).toBe(30)
    expect(useDiagramStore.getState().history).toHaveLength(1)

    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().diagram.nodes[0].x).toBe(0)

    useDiagramStore.getState().redo()
    expect(useDiagramStore.getState().diagram.nodes[0].x).toBe(30)
  })

  it('updateLive does not record history; cancel reverts', () => {
    const s = useDiagramStore.getState()
    s.beginInteraction()
    s.updateLive({ ops: [{ type: 'updateNode', id: 'a', patch: { x: 99 } }] })
    expect(useDiagramStore.getState().history).toHaveLength(0)
    expect(useDiagramStore.getState().diagram.nodes[0].x).toBe(99)

    useDiagramStore.getState().cancelInteraction()
    expect(useDiagramStore.getState().diagram.nodes[0].x).toBe(0)
  })

  it('a no-op interaction records nothing', () => {
    const s = useDiagramStore.getState()
    s.beginInteraction()
    s.commitInteraction('noop')
    expect(useDiagramStore.getState().history).toHaveLength(0)
  })

  it('caps the history stack', () => {
    for (let i = 1; i <= 130; i++) {
      useDiagramStore.getState().applyDiffWithHistory({
        ops: [{ type: 'updateNode', id: 'a', patch: { x: i } }],
        summary: 'move',
      })
    }
    expect(useDiagramStore.getState().history.length).toBeLessThanOrEqual(100)
    const x = useDiagramStore.getState().diagram.nodes[0].x
    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().diagram.nodes[0].x).not.toBe(x)
  })
})
