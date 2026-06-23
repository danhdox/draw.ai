import { create } from 'zustand'
import { Diagram, Node, Edge, createEmptyDiagram, generateId } from '@/lib/model/diagram'
import { Diff, applyDiff, invertDiff, diffDiagrams } from '@/lib/model/diff'
import { toast } from '@/lib/store/useToastStore'

export type EditorTool = 'select' | 'connect'

// Bound the undo stack so long sessions don't grow memory without limit.
const MAX_HISTORY = 100

export interface HistoryEntry {
  diagram: Diagram
  // Forward diff (for redo) and its inverse (for undo).
  diff: Diff
  inverseDiff: Diff
}

// Append an entry, dropping the oldest if we exceed the cap. Returns the new
// history array and the index of the latest entry.
function pushHistory(
  history: HistoryEntry[],
  index: number,
  entry: HistoryEntry
): { history: HistoryEntry[]; historyIndex: number } {
  const next = history.slice(0, index + 1)
  next.push(entry)
  if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY)
  return { history: next, historyIndex: next.length - 1 }
}

// Shared paste: clone nodes/edges with fresh ids + a small offset, then select them.
function pastePayload(get: () => DiagramStore, nodes: Node[], edges: Edge[]) {
  const idMap = new Map<string, string>()
  const ops: Diff['ops'] = []
  nodes.forEach((node) => {
    const newId = generateId('node')
    idMap.set(node.id, newId)
    ops.push({ type: 'addNode', node: { ...node, id: newId, x: node.x + 30, y: node.y + 30, locked: false } })
  })
  edges.forEach((edge) => {
    const f = idMap.get(edge.from.nodeId)
    const t = idMap.get(edge.to.nodeId)
    if (f && t) {
      ops.push({ type: 'addEdge', edge: { ...edge, id: generateId('edge'), from: { ...edge.from, nodeId: f }, to: { ...edge.to, nodeId: t } } })
    }
  })
  if (ops.length > 0) {
    get().applyDiffWithHistory({ ops, summary: 'Paste items' })
    get().selectNodes(Array.from(idMap.values()))
  }
}

export interface DiagramStore {
  // Current state
  diagram: Diagram
  selectedNodeIds: Set<string>
  selectedEdgeIds: Set<string>
  
  // History for undo/redo
  history: HistoryEntry[]
  historyIndex: number
  
  // Clipboard
  clipboard: { nodes: Node[]; edges: Edge[] } | null
  
  // UI state
  tool: EditorTool
  isPanning: boolean
  isConnecting: boolean
  connectingFrom: { nodeId: string; portId?: string } | null

  // Transient interaction snapshot (drag/resize/slider) for history coalescing
  interactionSnapshot: Diagram | null

  // Actions
  applyDiffWithHistory: (diff: Diff) => void
  // Interaction coalescing: begin → updateLive (no history) → commit (one entry).
  beginInteraction: () => void
  updateLive: (diff: Diff) => void
  commitInteraction: (summary?: string) => void
  cancelInteraction: () => void
  undo: () => void
  redo: () => void
  selectNodes: (nodeIds: string[], addToSelection?: boolean) => void
  selectEdges: (edgeIds: string[], addToSelection?: boolean) => void
  toggleNodeSelection: (nodeId: string) => void
  toggleEdgeSelection: (edgeId: string) => void
  selectAll: () => void
  clearSelection: () => void
  deleteSelected: () => void
  duplicateSelected: () => void
  nudgeSelected: (dx: number, dy: number) => void
  groupSelected: () => void
  ungroupSelected: () => void
  bringToFront: () => void
  sendToBack: () => void
  bringForward: () => void
  sendBackward: () => void
  alignSelected: (edge: 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom') => void
  distributeSelected: (axis: 'h' | 'v') => void
  rotateSelectedBy: (deg: number) => void
  toggleLockSelected: () => void
  addNodeAtPoint: (shape: Partial<Node> & { type: Node['type'] }, x: number, y: number) => void
  copy: () => void
  paste: () => void
  pasteText: (text: string) => void

  // Direct mutations (use sparingly, prefer diffs)
  setDiagram: (diagram: Diagram) => void
  reset: () => void

  // Tool / connection mode
  setTool: (tool: EditorTool) => void
  startConnecting: (nodeId: string, portId?: string) => void
  finishConnecting: (nodeId: string, portId?: string) => void
  cancelConnecting: () => void
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  // Initial state
  diagram: createEmptyDiagram(),
  selectedNodeIds: new Set(),
  selectedEdgeIds: new Set(),
  history: [],
  historyIndex: -1,
  clipboard: null,
  tool: 'select',
  isPanning: false,
  isConnecting: false,
  connectingFrom: null,
  interactionSnapshot: null,

  // Apply a diff and record it in history
  applyDiffWithHistory: (diff: Diff) => {
    const state = get()
    const result = applyDiff(state.diagram, diff)

    if (result.errors && result.errors.length > 0) {
      console.error('Errors applying diff:', result.errors)
      toast.error(`Could not apply change: ${result.errors[0]}`)
      return
    }

    const inverseDiff = invertDiff(state.diagram, diff)
    const { history, historyIndex } = pushHistory(state.history, state.historyIndex, {
      diagram: state.diagram,
      diff,
      inverseDiff,
    })

    set({ diagram: result.diagram, history, historyIndex })
  },

  // Snapshot the current diagram at the start of a drag/resize/slider sweep.
  // Idempotent: nested begins keep the original snapshot.
  beginInteraction: () => {
    if (get().interactionSnapshot) return
    set({ interactionSnapshot: JSON.parse(JSON.stringify(get().diagram)) as Diagram })
  },

  // Apply a diff to the live diagram WITHOUT touching history (drag preview).
  updateLive: (diff: Diff) => {
    const result = applyDiff(get().diagram, diff)
    if (result.errors && result.errors.length > 0) return
    set({ diagram: result.diagram })
  },

  // Commit the whole interaction as a single history entry.
  commitInteraction: (summary?: string) => {
    const state = get()
    const before = state.interactionSnapshot
    if (!before) return

    const forward = diffDiagrams(before, state.diagram)
    if (forward.ops.length === 0) {
      set({ interactionSnapshot: null })
      return
    }

    const diff: Diff = { ...forward, summary }
    const inverseDiff = invertDiff(before, diff)
    const { history, historyIndex } = pushHistory(state.history, state.historyIndex, {
      diagram: before,
      diff,
      inverseDiff,
    })

    set({ interactionSnapshot: null, history, historyIndex })
  },

  cancelInteraction: () => {
    const before = get().interactionSnapshot
    if (!before) return
    set({ diagram: before, interactionSnapshot: null })
  },

  undo: () => {
    const state = get()
    if (state.historyIndex < 0) return

    const entry = state.history[state.historyIndex]
    const result = applyDiff(state.diagram, entry.inverseDiff)

    set({
      diagram: result.diagram,
      historyIndex: state.historyIndex - 1,
    })
  },

  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return

    // Re-apply the stored forward diff. (Reconstructing it by inverting the
    // inverse against the before-snapshot loses added nodes/edges.)
    const entry = state.history[state.historyIndex + 1]
    const result = applyDiff(state.diagram, entry.diff)

    set({
      diagram: result.diagram,
      historyIndex: state.historyIndex + 1,
    })
  },

  selectNodes: (nodeIds: string[], addToSelection = false) => {
    set((state) => ({
      selectedNodeIds: addToSelection
        ? new Set([...state.selectedNodeIds, ...nodeIds])
        : new Set(nodeIds),
      // A plain (non-additive) node selection clears any edge selection.
      selectedEdgeIds: addToSelection ? state.selectedEdgeIds : new Set(),
    }))
  },

  selectEdges: (edgeIds: string[], addToSelection = false) => {
    set((state) => ({
      selectedEdgeIds: addToSelection
        ? new Set([...state.selectedEdgeIds, ...edgeIds])
        : new Set(edgeIds),
      selectedNodeIds: addToSelection ? state.selectedNodeIds : new Set(),
    }))
  },

  toggleNodeSelection: (nodeId: string) => {
    set((state) => {
      const next = new Set(state.selectedNodeIds)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return { selectedNodeIds: next }
    })
  },

  toggleEdgeSelection: (edgeId: string) => {
    set((state) => {
      const next = new Set(state.selectedEdgeIds)
      if (next.has(edgeId)) next.delete(edgeId)
      else next.add(edgeId)
      return { selectedEdgeIds: next }
    })
  },

  selectAll: () => {
    const state = get()
    set({
      selectedNodeIds: new Set(state.diagram.nodes.map((n) => n.id)),
      selectedEdgeIds: new Set(state.diagram.edges.map((e) => e.id)),
    })
  },

  clearSelection: () => {
    set({ selectedNodeIds: new Set(), selectedEdgeIds: new Set() })
  },

  deleteSelected: () => {
    const state = get()
    const ops: Diff['ops'] = []

    // Delete selected nodes (locked nodes are protected).
    state.selectedNodeIds.forEach((id) => {
      const node = state.diagram.nodes.find((n) => n.id === id)
      if (node?.locked) return
      ops.push({ type: 'removeNode', id })
    })

    // Delete selected edges, skipping any that a removed node will already
    // cascade-delete (otherwise applyDiff reports a "not found" error and the
    // whole diff is rejected).
    state.selectedEdgeIds.forEach((id) => {
      const edge = state.diagram.edges.find((e) => e.id === id)
      if (!edge) return
      if (state.selectedNodeIds.has(edge.from.nodeId) || state.selectedNodeIds.has(edge.to.nodeId)) {
        return
      }
      ops.push({ type: 'removeEdge', id })
    })

    if (ops.length > 0) {
      get().applyDiffWithHistory({
        ops,
        summary: 'Delete selected items',
      })
      get().clearSelection()
    }
  },

  copy: () => {
    const state = get()
    const nodes = state.diagram.nodes.filter((n) => state.selectedNodeIds.has(n.id))
    const edges = state.diagram.edges.filter(
      (e) => state.selectedNodeIds.has(e.from.nodeId) && state.selectedNodeIds.has(e.to.nodeId)
    )
    set({ clipboard: { nodes, edges } })
    // Best-effort write to the system clipboard for cross-tab / cross-app paste.
    if (nodes.length && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(JSON.stringify({ _drawai: 1, nodes, edges })).catch(() => {})
    }
  },

  paste: () => {
    const { clipboard } = get()
    if (clipboard) pastePayload(get, clipboard.nodes, clipboard.edges)
  },

  pasteText: (text: string) => {
    try {
      const parsed = JSON.parse(text)
      if (parsed && parsed._drawai && Array.isArray(parsed.nodes)) {
        pastePayload(get, parsed.nodes as Node[], (parsed.edges ?? []) as Edge[])
        return
      }
    } catch {
      /* not a draw.ai payload — fall through to the in-memory clipboard */
    }
    get().paste()
  },

  duplicateSelected: () => {
    const state = get()
    const nodes = state.diagram.nodes.filter((n) => state.selectedNodeIds.has(n.id))
    if (nodes.length === 0) return

    const edges = state.diagram.edges.filter(
      (e) =>
        state.selectedNodeIds.has(e.from.nodeId) && state.selectedNodeIds.has(e.to.nodeId)
    )

    const idMap = new Map<string, string>()
    const ops: Diff['ops'] = []

    nodes.forEach((node) => {
      const newId = generateId('node')
      idMap.set(node.id, newId)
      ops.push({
        type: 'addNode',
        node: { ...node, id: newId, x: node.x + 30, y: node.y + 30 },
      })
    })

    edges.forEach((edge) => {
      const newFromId = idMap.get(edge.from.nodeId)
      const newToId = idMap.get(edge.to.nodeId)
      if (newFromId && newToId) {
        ops.push({
          type: 'addEdge',
          edge: {
            ...edge,
            id: generateId('edge'),
            from: { ...edge.from, nodeId: newFromId },
            to: { ...edge.to, nodeId: newToId },
          },
        })
      }
    })

    get().applyDiffWithHistory({ ops, summary: 'Duplicate selection' })
    get().selectNodes(Array.from(idMap.values()))
  },

  nudgeSelected: (dx: number, dy: number) => {
    const state = get()
    if (state.selectedNodeIds.size === 0) return

    const ops: Diff['ops'] = []
    state.diagram.nodes.forEach((node) => {
      if (state.selectedNodeIds.has(node.id) && !node.locked) {
        ops.push({
          type: 'updateNode',
          id: node.id,
          patch: { x: node.x + dx, y: node.y + dy },
        })
      }
    })

    if (ops.length > 0) {
      get().applyDiffWithHistory({ ops, summary: 'Move selection' })
    }
  },

  groupSelected: () => {
    const state = get()
    const nodeIds = Array.from(state.selectedNodeIds)
    if (nodeIds.length < 2) return

    get().applyDiffWithHistory({
      ops: [{ type: 'group', groupId: generateId('group'), nodeIds }],
      summary: 'Group selection',
    })
  },

  ungroupSelected: () => {
    const state = get()
    const affected = state.diagram.groups.filter((g) =>
      g.nodeIds.some((id) => state.selectedNodeIds.has(id))
    )
    if (affected.length === 0) return

    get().applyDiffWithHistory({
      ops: affected.map((g) => ({ type: 'ungroup', groupId: g.id })),
      summary: 'Ungroup selection',
    })
  },

  bringToFront: () => {
    const state = get()
    if (state.selectedNodeIds.size === 0) return
    const maxZ = state.diagram.nodes.reduce((max, n) => Math.max(max, n.zIndex ?? 0), 0)

    const ops: Diff['ops'] = []
    let next = maxZ + 1
    state.diagram.nodes.forEach((node) => {
      if (state.selectedNodeIds.has(node.id)) {
        ops.push({ type: 'updateNode', id: node.id, patch: { zIndex: next++ } })
      }
    })
    if (ops.length > 0) get().applyDiffWithHistory({ ops, summary: 'Bring to front' })
  },

  sendToBack: () => {
    const state = get()
    if (state.selectedNodeIds.size === 0) return
    const minZ = state.diagram.nodes.reduce((min, n) => Math.min(min, n.zIndex ?? 0), 0)

    const ops: Diff['ops'] = []
    let next = minZ - 1
    state.diagram.nodes.forEach((node) => {
      if (state.selectedNodeIds.has(node.id)) {
        ops.push({ type: 'updateNode', id: node.id, patch: { zIndex: next-- } })
      }
    })
    if (ops.length > 0) get().applyDiffWithHistory({ ops, summary: 'Send to back' })
  },

  bringForward: () => {
    const state = get()
    if (state.selectedNodeIds.size === 0) return
    const ops: Diff['ops'] = state.diagram.nodes
      .filter((n) => state.selectedNodeIds.has(n.id))
      .map((n) => ({ type: 'updateNode', id: n.id, patch: { zIndex: (n.zIndex ?? 0) + 1 } }))
    if (ops.length > 0) get().applyDiffWithHistory({ ops, summary: 'Bring forward' })
  },

  sendBackward: () => {
    const state = get()
    if (state.selectedNodeIds.size === 0) return
    const ops: Diff['ops'] = state.diagram.nodes
      .filter((n) => state.selectedNodeIds.has(n.id))
      .map((n) => ({ type: 'updateNode', id: n.id, patch: { zIndex: (n.zIndex ?? 0) - 1 } }))
    if (ops.length > 0) get().applyDiffWithHistory({ ops, summary: 'Send backward' })
  },

  alignSelected: (edge) => {
    const state = get()
    const nodes = state.diagram.nodes.filter((n) => state.selectedNodeIds.has(n.id))
    if (nodes.length < 2) return
    const minX = Math.min(...nodes.map((n) => n.x))
    const maxX = Math.max(...nodes.map((n) => n.x + n.w))
    const minY = Math.min(...nodes.map((n) => n.y))
    const maxY = Math.max(...nodes.map((n) => n.y + n.h))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const ops: Diff['ops'] = nodes.map((n) => {
      const patch: Partial<Node> = {}
      switch (edge) {
        case 'left': patch.x = minX; break
        case 'right': patch.x = maxX - n.w; break
        case 'centerH': patch.x = cx - n.w / 2; break
        case 'top': patch.y = minY; break
        case 'bottom': patch.y = maxY - n.h; break
        case 'middle': patch.y = cy - n.h / 2; break
      }
      return { type: 'updateNode', id: n.id, patch }
    })
    get().applyDiffWithHistory({ ops, summary: `Align ${edge}` })
  },

  distributeSelected: (axis) => {
    const state = get()
    const nodes = state.diagram.nodes.filter((n) => state.selectedNodeIds.has(n.id))
    if (nodes.length < 3) return
    const horizontal = axis === 'h'
    const sorted = [...nodes].sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const start = horizontal ? first.x + first.w / 2 : first.y + first.h / 2
    const end = horizontal ? last.x + last.w / 2 : last.y + last.h / 2
    const step = (end - start) / (sorted.length - 1)

    const ops: Diff['ops'] = sorted.map((n, i) => {
      const center = start + step * i
      const patch: Partial<Node> = horizontal ? { x: center - n.w / 2 } : { y: center - n.h / 2 }
      return { type: 'updateNode', id: n.id, patch }
    })
    get().applyDiffWithHistory({ ops, summary: `Distribute ${horizontal ? 'horizontally' : 'vertically'}` })
  },

  rotateSelectedBy: (deg) => {
    const state = get()
    if (state.selectedNodeIds.size === 0) return
    const ops: Diff['ops'] = state.diagram.nodes
      .filter((n) => state.selectedNodeIds.has(n.id) && !n.locked)
      .map((n) => ({ type: 'updateNode', id: n.id, patch: { rotation: (((n.rotation ?? 0) + deg) % 360 + 360) % 360 } }))
    if (ops.length > 0) get().applyDiffWithHistory({ ops, summary: 'Rotate' })
  },

  toggleLockSelected: () => {
    const state = get()
    const nodes = state.diagram.nodes.filter((n) => state.selectedNodeIds.has(n.id))
    if (nodes.length === 0) return
    const lock = !nodes.every((n) => n.locked) // if any unlocked → lock all
    get().applyDiffWithHistory({
      ops: nodes.map((n) => ({ type: 'updateNode', id: n.id, patch: { locked: lock } })),
      summary: lock ? 'Lock' : 'Unlock',
    })
  },

  addNodeAtPoint: (shape, x, y) => {
    const id = generateId('node')
    const w = shape.w ?? 168
    const h = shape.h ?? 78
    get().applyDiffWithHistory({
      ops: [{ type: 'addNode', node: { id, type: shape.type, shapeKind: shape.shapeKind, x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h, text: shape.text ?? '', style: shape.style ?? { fill: '#ffffff', stroke: '#4a4a4a', strokeWidth: 2, fontSize: 14, fontFamily: 'Geist, ui-sans-serif' } } }],
      summary: 'Add shape',
    })
    get().selectNodes([id])
  },

  setDiagram: (diagram: Diagram) => {
    set({
      diagram,
      history: [],
      historyIndex: -1,
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
    })
  },

  reset: () => {
    set({
      diagram: createEmptyDiagram(),
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      history: [],
      historyIndex: -1,
      clipboard: null,
      tool: 'select',
      isPanning: false,
      isConnecting: false,
      connectingFrom: null,
      interactionSnapshot: null,
    })
  },

  setTool: (tool: EditorTool) => {
    set({ tool, isConnecting: false, connectingFrom: null })
  },

  startConnecting: (nodeId: string, portId?: string) => {
    set({
      isConnecting: true,
      connectingFrom: { nodeId, portId },
    })
  },

  finishConnecting: (nodeId: string, portId?: string) => {
    const state = get()
    if (!state.connectingFrom) return

    // Validate endpoints: both nodes must exist and self-connections are
    // skipped (a single click on the source should not create a loop).
    const fromId = state.connectingFrom.nodeId
    const sourceExists = state.diagram.nodes.some((n) => n.id === fromId)
    const targetExists = state.diagram.nodes.some((n) => n.id === nodeId)

    if (!sourceExists || !targetExists || fromId === nodeId) {
      set({ isConnecting: false, connectingFrom: null })
      return
    }

    const edgeId = generateId('edge')
    get().applyDiffWithHistory({
      ops: [
        {
          type: 'addEdge',
          edge: {
            id: edgeId,
            from: state.connectingFrom,
            to: { nodeId, portId },
            arrowEnd: true,
          },
        },
      ],
      summary: 'Add edge',
    })

    // Stay in connect mode so multiple edges can be chained; clear the source.
    set({ isConnecting: false, connectingFrom: null })
    get().selectEdges([edgeId])
  },

  cancelConnecting: () => {
    set({
      isConnecting: false,
      connectingFrom: null,
    })
  },
}))
