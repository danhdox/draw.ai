import { z } from 'zod'

// Style schema
export const StyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeDasharray: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
})

export type Style = z.infer<typeof StyleSchema>

// Visual shape kinds the renderer can draw faithfully. `type` is kept for
// backward compatibility; `shapeKind` (when present) drives rendering and lets
// the palette advertise only shapes we can actually create.
export const ShapeKindSchema = z.enum([
  'rect',
  'rounded',
  'ellipse',
  'diamond',
  'parallelogram',
  'hexagon',
  'triangle',
  'cylinder',
  'cloud',
  'document',
  'trapezoid',
  'chevron',
  'note',
  'text',
])

export type ShapeKind = z.infer<typeof ShapeKindSchema>

// Node schema
export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['rect', 'ellipse', 'diamond', 'text']),
  shapeKind: ShapeKindSchema.optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotation: z.number().optional(),
  text: z.string().optional(),
  style: StyleSchema.optional(),
  zIndex: z.number().optional(),
})

export type Node = z.infer<typeof NodeSchema>

// Port reference
export const PortRefSchema = z.object({
  nodeId: z.string(),
  portId: z.string().optional(),
})

export type PortRef = z.infer<typeof PortRefSchema>

// Edge schema
export const EdgeSchema = z.object({
  id: z.string(),
  from: PortRefSchema,
  to: PortRefSchema,
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  style: StyleSchema.optional(),
  label: z.string().optional(),
  // How the edge is drawn between endpoints.
  routing: z.enum(['straight', 'orthogonal', 'curved']).optional(),
  // Arrowheads. Default behaviour is an end arrow only.
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
})

export type Edge = z.infer<typeof EdgeSchema>

// Group schema
export const GroupSchema = z.object({
  id: z.string(),
  nodeIds: z.array(z.string()),
})

export type Group = z.infer<typeof GroupSchema>

// Diagram metadata
export const DiagramMetaSchema = z.object({
  gridSize: z.number().default(20),
  snap: z.boolean().default(true),
  theme: z.string().optional(),
})

export type DiagramMeta = z.infer<typeof DiagramMetaSchema>

// Diagram schema
export const DiagramSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  groups: z.array(GroupSchema).default([]),
  meta: DiagramMetaSchema.default({ gridSize: 20, snap: true }),
})

export type Diagram = z.infer<typeof DiagramSchema>

// Helper to create empty diagram
export function createEmptyDiagram(): Diagram {
  return {
    nodes: [],
    edges: [],
    groups: [],
    meta: {
      gridSize: 20,
      snap: true,
    },
  }
}

// Helper to generate unique IDs
export function generateId(prefix: string = 'node'): string {
  // Use crypto for better uniqueness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  // Fallback for environments without crypto.randomUUID
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
