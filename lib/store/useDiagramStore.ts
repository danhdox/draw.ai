import { create } from 'zustand'
import { Diagram, Node, Edge, createEmptyDiagram, generateId } from '@/lib/model/diagram'
import { Diff, applyDiff, invertDiff } from '@/lib/model/diff'

export interface HistoryEntry {
  diagram: Diagram
  inverseDiff: Diff
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
  isPanning: boolean
  isConnecting: boolean
  connectingFrom: { nodeId: string; portId?: string } | null
  
  // Actions
  applyDiffWithHistory: (diff: Diff) => void
  undo: () => void
  redo: () => void
  selectNodes: (nodeIds: string[], addToSelection?: boolean) => void
  selectEdges: (edgeIds: string[], addToSelection?: boolean) => void
  clearSelection: () => void
  deleteSelected: () => void
  copy: () => void
  paste: () => void
  
  // Direct mutations (use sparingly, prefer diffs)
  setDiagram: (diagram: Diagram) => void
  reset: () => void
  
  // Connection mode
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
  isPanning: false,
  isConnecting: false,
  connectingFrom: null,

  // Apply a diff and record it in history
  applyDiffWithHistory: (diff: Diff) => {
    const state = get()
    const result = applyDiff(state.diagram, diff)
    
    if (result.errors && result.errors.length > 0) {
      console.error('Errors applying diff:', result.errors)
      return
    }

    const inverseDiff = invertDiff(state.diagram, diff)
    
    // Truncate history if we're not at the end
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push({
      diagram: state.diagram,
      inverseDiff,
    })

    set({
      diagram: result.diagram,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
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

    const entry = state.history[state.historyIndex + 1]
    const inverseDiff = invertDiff(entry.diagram, entry.inverseDiff)
    const result = applyDiff(state.diagram, inverseDiff)

    set({
      diagram: result.diagram,
      historyIndex: state.historyIndex + 1,
    })
  },

  selectNodes: (nodeIds: string[], addToSelection = false) => {
    set((state) => {
      const newSelection = addToSelection
        ? new Set([...state.selectedNodeIds, ...nodeIds])
        : new Set(nodeIds)
      return { selectedNodeIds: newSelection }
    })
  },

  selectEdges: (edgeIds: string[], addToSelection = false) => {
    set((state) => {
      const newSelection = addToSelection
        ? new Set([...state.selectedEdgeIds, ...edgeIds])
        : new Set(edgeIds)
      return { selectedEdgeIds: newSelection }
    })
  },

  clearSelection: () => {
    set({ selectedNodeIds: new Set(), selectedEdgeIds: new Set() })
  },

  deleteSelected: () => {
    const state = get()
    const ops: Diff['ops'] = []

    // Delete selected nodes
    state.selectedNodeIds.forEach((id) => {
      ops.push({ type: 'removeNode', id })
    })

    // Delete selected edges
    state.selectedEdgeIds.forEach((id) => {
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
    const nodes = state.diagram.nodes.filter((n) =>
      state.selectedNodeIds.has(n.id)
    )
    const edges = state.diagram.edges.filter(
      (e) =>
        state.selectedNodeIds.has(e.from.nodeId) &&
        state.selectedNodeIds.has(e.to.nodeId)
    )
    set({ clipboard: { nodes, edges } })
  },

  paste: () => {
    const state = get()
    if (!state.clipboard) return

    const idMap = new Map<string, string>()
    const ops: Diff['ops'] = []

    // Create new IDs for nodes
    state.clipboard.nodes.forEach((node) => {
      const newId = generateId('node')
      idMap.set(node.id, newId)
      ops.push({
        type: 'addNode',
        node: {
          ...node,
          id: newId,
          x: node.x + 30,
          y: node.y + 30,
        },
      })
    })

    // Create edges with new IDs
    state.clipboard.edges.forEach((edge) => {
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

    if (ops.length > 0) {
      get().applyDiffWithHistory({
        ops,
        summary: 'Paste items',
      })
      // Select the new nodes
      get().selectNodes(Array.from(idMap.values()))
    }
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
      isPanning: false,
      isConnecting: false,
      connectingFrom: null,
    })
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

    const edgeId = generateId('edge')
    get().applyDiffWithHistory({
      ops: [
        {
          type: 'addEdge',
          edge: {
            id: edgeId,
            from: state.connectingFrom,
            to: { nodeId, portId },
          },
        },
      ],
      summary: 'Add edge',
    })

    set({
      isConnecting: false,
      connectingFrom: null,
    })
  },

  cancelConnecting: () => {
    set({
      isConnecting: false,
      connectingFrom: null,
    })
  },
}))
