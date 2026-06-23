import { describe, it, expect } from 'vitest'
import { createEmptyDiagram } from '@/lib/model/diagram'
import { exportToMermaid } from '@/lib/export/mermaid'
import { importFromMermaid } from '@/lib/import/mermaid'

describe('Mermaid export', () => {
  it('emits flowchart nodes and edges with labels', () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push(
      { id: 'node-start', type: 'ellipse', shapeKind: 'ellipse', x: 0, y: 0, w: 120, h: 60, text: 'Start' },
      { id: 'node-decide', type: 'diamond', shapeKind: 'diamond', x: 0, y: 100, w: 120, h: 120, text: 'OK?' }
    )
    diagram.edges.push({ id: 'e1', from: { nodeId: 'node-start' }, to: { nodeId: 'node-decide' }, label: 'go' })

    const mermaid = exportToMermaid(diagram)
    expect(mermaid.split('\n')[0]).toBe('flowchart TD')
    expect(mermaid).toContain('(("Start"))') // ellipse
    expect(mermaid).toContain('{"OK?"}') // diamond
    expect(mermaid).toMatch(/-->\|go\|/)
  })

  it('sanitizes ids that are not mermaid-safe', () => {
    const diagram = createEmptyDiagram()
    diagram.nodes.push({ id: 'node-uuid-123', type: 'rect', x: 0, y: 0, w: 100, h: 50, text: 'A' })
    const mermaid = exportToMermaid(diagram)
    expect(mermaid).toContain('node_uuid_123["A"]')
  })
})

describe('Mermaid import', () => {
  it('parses a basic flowchart TD with shapes and arrows', () => {
    const diagram = importFromMermaid(`flowchart TD
      A[Start] --> B{Decision}
      B -->|yes| C(Done)
      B -->|no| A`)

    expect(diagram.nodes).toHaveLength(3)
    expect(diagram.edges).toHaveLength(3)

    const b = diagram.nodes.find((n) => n.text === 'Decision')
    expect(b?.shapeKind).toBe('diamond')
    const c = diagram.nodes.find((n) => n.text === 'Done')
    expect(c?.shapeKind).toBe('rounded')

    const labeled = diagram.edges.find((e) => e.label === 'yes')
    expect(labeled).toBeTruthy()
  })

  it('lays out imported nodes (no overlapping at origin)', () => {
    const diagram = importFromMermaid('flowchart TD\nA --> B\nB --> C')
    const positions = diagram.nodes.map((n) => `${n.x},${n.y}`)
    expect(new Set(positions).size).toBe(positions.length)
  })

  it('supports LR direction', () => {
    const diagram = importFromMermaid('flowchart LR\nA --> B')
    expect(diagram.nodes).toHaveLength(2)
  })

  it('round-trips export -> import preserving node and edge counts', () => {
    const original = createEmptyDiagram()
    original.nodes.push(
      { id: 'n1', type: 'rect', shapeKind: 'rect', x: 0, y: 0, w: 120, h: 60, text: 'One' },
      { id: 'n2', type: 'rect', shapeKind: 'rounded', x: 0, y: 120, w: 120, h: 60, text: 'Two' },
      { id: 'n3', type: 'diamond', shapeKind: 'diamond', x: 0, y: 240, w: 120, h: 120, text: 'Three' }
    )
    original.edges.push(
      { id: 'e1', from: { nodeId: 'n1' }, to: { nodeId: 'n2' }, label: 'next' },
      { id: 'e2', from: { nodeId: 'n2' }, to: { nodeId: 'n3' } }
    )

    const mermaid = exportToMermaid(original)
    const reimported = importFromMermaid(mermaid)

    expect(reimported.nodes).toHaveLength(3)
    expect(reimported.edges).toHaveLength(2)
    expect(reimported.nodes.map((n) => n.text).sort()).toEqual(['One', 'Three', 'Two'])
    expect(reimported.nodes.find((n) => n.text === 'Three')?.shapeKind).toBe('diamond')
  })

  it('throws a clear error for empty input', () => {
    expect(() => importFromMermaid('')).toThrow(/empty/i)
  })

  it('throws a clear error for non-flowchart input', () => {
    expect(() => importFromMermaid('sequenceDiagram\nAlice->>John: Hi')).toThrow(/flowchart|graph/i)
  })

  it('throws when no nodes can be parsed', () => {
    expect(() => importFromMermaid('flowchart TD\n%% just a comment')).toThrow(/no diagram nodes/i)
  })
})
