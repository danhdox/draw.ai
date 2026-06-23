import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createEmptyDiagram } from '@/lib/model/diagram'
import { loadDiagram, saveDiagram, clearSavedDiagram } from '@/lib/persistence'

function memoryLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryLocalStorage() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('persistence', () => {
  it('round-trips a diagram through localStorage', () => {
    const d = createEmptyDiagram()
    d.nodes.push({ id: 'a', type: 'rect', shapeKind: 'cylinder', x: 5, y: 6, w: 100, h: 50, text: 'X' })
    saveDiagram(d)
    const loaded = loadDiagram()
    expect(loaded?.nodes).toHaveLength(1)
    expect(loaded?.nodes[0].shapeKind).toBe('cylinder')
    expect(loaded?.nodes[0].text).toBe('X')
  })

  it('returns null when nothing is stored', () => {
    expect(loadDiagram()).toBeNull()
  })

  it('returns null for corrupt data instead of throwing', () => {
    window.localStorage.setItem('draw.ai:diagram', '{ not valid json')
    expect(loadDiagram()).toBeNull()
  })

  it('returns null for schema-invalid data', () => {
    window.localStorage.setItem('draw.ai:diagram', JSON.stringify({ nodes: [{ bad: true }] }))
    expect(loadDiagram()).toBeNull()
  })

  it('clears the saved diagram', () => {
    saveDiagram(createEmptyDiagram())
    clearSavedDiagram()
    expect(loadDiagram()).toBeNull()
  })
})
