import { Diagram } from '@/lib/model/diagram'
import { Diff, DiffSchema } from '@/lib/model/diff'
import { AgentAction } from '@/lib/agent/types'

const NODE_WIDTH = 168
const NODE_HEIGHT = 72
const HORIZONTAL_SPACING = 230
const START_X = 240
const START_Y = 220

export function getLastUserText(messages: Array<{ role: string; parts: Array<any> }>): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  if (!lastUserMessage) return ''

  return lastUserMessage.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

export function createFallbackDiagramDiff(prompt: string, diagram: Diagram): Diff {
  const normalizedPrompt = prompt.trim() || 'diagram'
  const labels = inferNodeLabels(normalizedPrompt)
  const baseIndex = diagram.nodes.length

  const nodes = labels.map((label, index) => ({
    id: `agent-node-${Date.now()}-${baseIndex + index + 1}`,
    type: index === 0 || index === labels.length - 1 ? ('ellipse' as const) : ('rect' as const),
    x: START_X + index * HORIZONTAL_SPACING,
    y: START_Y,
    w: NODE_WIDTH,
    h: NODE_HEIGHT,
    text: label,
    style: {
      fill: index === 0 ? '#eef8ff' : index === labels.length - 1 ? '#f1f8ee' : '#ffffff',
      stroke: index === 0 ? '#3d9ad1' : index === labels.length - 1 ? '#5a9a50' : '#d8d5cd',
      strokeWidth: 2,
      fontSize: 14,
      fontFamily: 'Geist, ui-sans-serif',
    },
  }))

  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `agent-edge-${Date.now()}-${baseIndex + index + 1}`,
    from: { nodeId: node.id },
    to: { nodeId: nodes[index + 1].id },
    style: {
      stroke: '#7b756b',
      strokeWidth: 2,
    },
  }))

  return {
    ops: [
      ...nodes.map((node) => ({ type: 'addNode' as const, node })),
      ...edges.map((edge) => ({ type: 'addEdge' as const, edge })),
    ],
    summary: `Created a ${labels.length}-step diagram from the prompt.`,
  }
}

export function summarizeDiff(diff: Diff): string {
  const counts = diff.ops.reduce(
    (acc, op) => {
      if (op.type === 'addNode') acc.nodes += 1
      if (op.type === 'addEdge') acc.edges += 1
      if (op.type === 'updateNode' || op.type === 'updateEdge' || op.type === 'setMeta') acc.updates += 1
      if (op.type === 'removeNode' || op.type === 'removeEdge') acc.removals += 1
      return acc
    },
    { nodes: 0, edges: 0, updates: 0, removals: 0 }
  )

  return [
    counts.nodes ? `${counts.nodes} node${counts.nodes === 1 ? '' : 's'}` : null,
    counts.edges ? `${counts.edges} edge${counts.edges === 1 ? '' : 's'}` : null,
    counts.updates ? `${counts.updates} update${counts.updates === 1 ? '' : 's'}` : null,
    counts.removals ? `${counts.removals} removal${counts.removals === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(', ') || 'No diagram changes'
}

export function coerceDiffProposal(value: unknown): Diff | null {
  const direct = DiffSchema.safeParse(value)
  if (direct.success) return direct.data

  if (!value || typeof value !== 'object' || !('ops' in value) || !Array.isArray((value as any).ops)) {
    return null
  }

  const ops = (value as any).ops.flatMap((op: unknown) => {
    if (!op || typeof op !== 'object') return []

    if ('addNode' in op && typeof (op as any).addNode === 'object') {
      const node = (op as any).addNode
      const id = String(node.id || `node-${node.label || node.text || Date.now()}`)
      return [{
        type: 'addNode' as const,
        node: {
          id,
          type: normalizeNodeType(node.type),
          x: Number(node.x ?? 240),
          y: Number(node.y ?? 220),
          w: Number(node.w ?? node.width ?? NODE_WIDTH),
          h: Number(node.h ?? node.height ?? NODE_HEIGHT),
          text: String(node.text || node.label || id),
          style: {
            fill: '#ffffff',
            stroke: '#d8d3ca',
            strokeWidth: 2,
            fontSize: 14,
            fontFamily: 'Geist, ui-sans-serif',
          },
        },
      }]
    }

    if ('addEdge' in op && typeof (op as any).addEdge === 'object') {
      const edge = (op as any).addEdge
      return [{
        type: 'addEdge' as const,
        edge: {
          id: String(edge.id || `edge-${Date.now()}`),
          from: { nodeId: String(edge.from?.nodeId || edge.from) },
          to: { nodeId: String(edge.to?.nodeId || edge.to) },
          style: {
            stroke: '#7b756b',
            strokeWidth: 2,
          },
        },
      }]
    }

    return []
  })

  const candidate = {
    ops,
    summary: typeof (value as any).summary === 'string' ? (value as any).summary : undefined,
  }
  const parsed = DiffSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function actionLabel(action: AgentAction): string {
  if (action === 'cleanup') return 'Clean up layout'
  if (action === 'explain') return 'Explain diagram'
  return 'Generate diagram'
}

function inferNodeLabels(prompt: string): string[] {
  const separators = /\s*(?:,|->|→| then | to | into | and then )\s*/i
  const pieces = prompt
    .split(separators)
    .map((part) => titleCase(part.replace(/[.!?]+$/g, '').trim()))
    .filter((part) => part.length > 0)
    .slice(0, 5)

  if (pieces.length >= 2) {
    return pieces
  }

  return ['Start', titleCase(prompt).slice(0, 42) || 'Process', 'Finish']
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function normalizeNodeType(value: unknown): 'rect' | 'ellipse' | 'diamond' | 'text' {
  if (value === 'ellipse' || value === 'diamond' || value === 'text') return value
  return 'rect'
}
