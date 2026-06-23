import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { createEmptyDiagram } from '@/lib/model/diagram'

function seedTwoNodes() {
  const diagram = createEmptyDiagram()
  diagram.nodes.push(
    { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50, text: 'A' },
    { id: 'b', type: 'rect', x: 200, y: 0, w: 100, h: 50, text: 'B' }
  )
  useDiagramStore.getState().setDiagram(diagram)
}

describe('connector creation', () => {
  beforeEach(() => {
    useDiagramStore.getState().reset()
    seedTwoNodes()
  })

  it('creates a directed edge from source to target', () => {
    const store = useDiagramStore.getState()
    store.startConnecting('a')
    store.finishConnecting('b')

    const { diagram } = useDiagramStore.getState()
    expect(diagram.edges).toHaveLength(1)
    expect(diagram.edges[0].from.nodeId).toBe('a')
    expect(diagram.edges[0].to.nodeId).toBe('b')
    expect(diagram.edges[0].arrowEnd).toBe(true)
  })

  it('rejects self-connections', () => {
    const store = useDiagramStore.getState()
    store.startConnecting('a')
    store.finishConnecting('a')
    expect(useDiagramStore.getState().diagram.edges).toHaveLength(0)
    expect(useDiagramStore.getState().isConnecting).toBe(false)
  })

  it('ignores finish when no connection is in progress', () => {
    useDiagramStore.getState().finishConnecting('b')
    expect(useDiagramStore.getState().diagram.edges).toHaveLength(0)
  })

  it('connector edges are undoable', () => {
    const store = useDiagramStore.getState()
    store.startConnecting('a')
    store.finishConnecting('b')
    expect(useDiagramStore.getState().diagram.edges).toHaveLength(1)
    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().diagram.edges).toHaveLength(0)
  })

  it('setTool clears any in-progress connection', () => {
    const store = useDiagramStore.getState()
    store.setTool('connect')
    store.startConnecting('a')
    expect(useDiagramStore.getState().connectingFrom?.nodeId).toBe('a')
    useDiagramStore.getState().setTool('select')
    expect(useDiagramStore.getState().connectingFrom).toBeNull()
  })
})

describe('selection editing actions', () => {
  beforeEach(() => {
    useDiagramStore.getState().reset()
    seedTwoNodes()
  })

  it('selectAll selects every node and edge', () => {
    useDiagramStore.getState().startConnecting('a')
    useDiagramStore.getState().finishConnecting('b')
    useDiagramStore.getState().selectAll()
    const state = useDiagramStore.getState()
    expect(state.selectedNodeIds.size).toBe(2)
    expect(state.selectedEdgeIds.size).toBe(1)
  })

  it('duplicateSelected clones nodes with offset and new ids', () => {
    useDiagramStore.getState().selectNodes(['a'])
    useDiagramStore.getState().duplicateSelected()
    const { diagram } = useDiagramStore.getState()
    expect(diagram.nodes).toHaveLength(3)
    const clone = diagram.nodes.find((n) => n.id !== 'a' && n.id !== 'b')
    expect(clone?.x).toBe(30)
    expect(clone?.y).toBe(30)
  })

  it('nudgeSelected moves selected nodes', () => {
    useDiagramStore.getState().selectNodes(['a'])
    useDiagramStore.getState().nudgeSelected(10, -5)
    const a = useDiagramStore.getState().diagram.nodes.find((n) => n.id === 'a')
    expect(a?.x).toBe(10)
    expect(a?.y).toBe(-5)
  })

  it('groupSelected requires two or more nodes', () => {
    useDiagramStore.getState().selectNodes(['a'])
    useDiagramStore.getState().groupSelected()
    expect(useDiagramStore.getState().diagram.groups).toHaveLength(0)

    useDiagramStore.getState().selectNodes(['a', 'b'])
    useDiagramStore.getState().groupSelected()
    expect(useDiagramStore.getState().diagram.groups).toHaveLength(1)
  })

  it('bringToFront / sendToBack adjust z-order', () => {
    useDiagramStore.getState().selectNodes(['a'])
    useDiagramStore.getState().bringToFront()
    const aFront = useDiagramStore.getState().diagram.nodes.find((n) => n.id === 'a')
    expect(aFront?.zIndex).toBeGreaterThan(0)

    useDiagramStore.getState().selectNodes(['b'])
    useDiagramStore.getState().sendToBack()
    const bBack = useDiagramStore.getState().diagram.nodes.find((n) => n.id === 'b')
    expect(bBack?.zIndex).toBeLessThan(0)
  })

  it('redo re-applies an added node after undo (regression)', () => {
    useDiagramStore.getState().reset()
    useDiagramStore.getState().applyDiffWithHistory({
      ops: [{ type: 'addNode', node: { id: 'x', type: 'rect', x: 0, y: 0, w: 100, h: 50 } }],
      summary: 'add',
    })
    expect(useDiagramStore.getState().diagram.nodes).toHaveLength(1)

    useDiagramStore.getState().undo()
    expect(useDiagramStore.getState().diagram.nodes).toHaveLength(0)

    useDiagramStore.getState().redo()
    expect(useDiagramStore.getState().diagram.nodes).toHaveLength(1)
    expect(useDiagramStore.getState().diagram.nodes[0].id).toBe('x')
  })

  it('deleteSelected removes nodes and their edges', () => {
    useDiagramStore.getState().startConnecting('a')
    useDiagramStore.getState().finishConnecting('b')
    useDiagramStore.getState().selectNodes(['a'])
    useDiagramStore.getState().deleteSelected()
    const { diagram } = useDiagramStore.getState()
    expect(diagram.nodes).toHaveLength(1)
    expect(diagram.edges).toHaveLength(0)
  })
})
