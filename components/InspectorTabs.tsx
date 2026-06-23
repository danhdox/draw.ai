'use client'

import { useEffect, useRef } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { Edge, Node, Style } from '@/lib/model/diagram'
import { Diff } from '@/lib/model/diff'

const FONT_FAMILIES = [
  'Geist, ui-sans-serif',
  'ui-sans-serif, system-ui',
  'ui-serif, Georgia',
  'ui-monospace, SFMono-Regular',
]

// Returns the shared value when every item agrees, otherwise undefined ("Mixed").
function common<T, V>(items: T[], get: (item: T) => V): V | undefined {
  if (items.length === 0) return undefined
  const first = get(items[0])
  return items.every((item) => get(item) === first) ? first : undefined
}

export function InspectorTabs() {
  const store = useDiagramStore()
  const { diagram, selectedNodeIds, selectedEdgeIds, applyDiffWithHistory, beginInteraction, updateLive, commitInteraction } = store

  const selectedNodes = diagram.nodes.filter((n) => selectedNodeIds.has(n.id))
  const selectedEdges = diagram.edges.filter((e) => selectedEdgeIds.has(e.id))

  // Coalesce rapid edits (color picker, opacity slider, typing) into a single
  // undo step: apply live immediately, commit one history entry once edits settle.
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current)
      commitInteraction()
    }
  }, [commitInteraction])

  const liveEdit = (ops: Diff['ops'], summary: string) => {
    if (!ops.length) return
    beginInteraction()
    updateLive({ ops })
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => {
      commitInteraction(summary)
      commitTimer.current = null
    }, 350)
  }

  const updateNodeStyle = (patch: Partial<Style>, summary: string) => {
    liveEdit(
      selectedNodes.map((node) => ({ type: 'updateNode' as const, id: node.id, patch: { style: { ...node.style, ...patch } } })),
      summary
    )
  }

  const updateNodeFields = (patch: Partial<Node>, summary: string) => {
    liveEdit(selectedNodes.map((node) => ({ type: 'updateNode' as const, id: node.id, patch })), summary)
  }

  const updateEdgeStyle = (patch: Partial<Style>, summary: string) => {
    liveEdit(
      selectedEdges.map((edge) => ({ type: 'updateEdge' as const, id: edge.id, patch: { style: { ...edge.style, ...patch } } })),
      summary
    )
  }

  const updateEdgeFields = (patch: Partial<Edge>, summary: string) => {
    liveEdit(selectedEdges.map((edge) => ({ type: 'updateEdge' as const, id: edge.id, patch })), summary)
  }

  return (
    <div className="bg-white">
      <Tabs defaultValue="diagram" className="w-full">
        <TabsList className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-3 rounded-lg bg-[#f4f2ee]">
          <TabsTrigger value="diagram" className="flex-1">Diagram</TabsTrigger>
          <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
          <TabsTrigger value="arrange" className="flex-1">Arrange</TabsTrigger>
        </TabsList>

        <TabsContent value="arrange" className="m-0 p-4">
          {selectedNodes.length === 0 && selectedEdges.length === 0 ? (
            <p className="text-xs text-muted-foreground">Select objects to align, order, group, or rotate them.</p>
          ) : (
            <section className="space-y-4" data-testid="arrange-panel">
              {selectedNodes.length >= 2 && (
                <div>
                  <Label>Align</Label>
                  <div className="mt-1 grid grid-cols-6 gap-1">
                    {([['left', 'L'], ['centerH', 'C'], ['right', 'R'], ['top', 'T'], ['middle', 'M'], ['bottom', 'B']] as const).map(([k, t]) => (
                      <Button key={k} size="sm" variant="outline" className="h-8 px-0 text-[11px]" title={`Align ${k}`} onClick={() => store.alignSelected(k)}>{t}</Button>
                    ))}
                  </div>
                </div>
              )}
              {selectedNodes.length >= 3 && (
                <div>
                  <Label>Distribute</Label>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => store.distributeSelected('h')}>Horizontal</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => store.distributeSelected('v')}>Vertical</Button>
                  </div>
                </div>
              )}
              <div>
                <Label>Order</Label>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={store.bringToFront}>To front</Button>
                  <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={store.sendToBack}>To back</Button>
                  <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={store.bringForward}>Forward</Button>
                  <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={store.sendBackward}>Backward</Button>
                </div>
              </div>
              {selectedNodes.length >= 1 && (
                <>
                  <div>
                    <Label>Group</Label>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      <Button size="sm" variant="outline" className="h-8 text-[12px]" disabled={selectedNodes.length < 2} onClick={store.groupSelected}>Group</Button>
                      <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={store.ungroupSelected}>Ungroup</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Rotate</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 flex-1 text-[12px]" onClick={() => store.rotateSelectedBy(-90)}>−90°</Button>
                      <Button size="sm" variant="outline" className="h-8 flex-1 text-[12px]" onClick={() => store.rotateSelectedBy(90)}>+90°</Button>
                      <Input type="number" className="h-8 w-20" aria-label="Angle"
                        value={common(selectedNodes, (n) => Math.round(n.rotation ?? 0)) ?? ''}
                        placeholder={common(selectedNodes, (n) => Math.round(n.rotation ?? 0)) === undefined ? 'Mixed' : ''}
                        onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) updateNodeFields({ rotation: ((v % 360) + 360) % 360 }, 'Set angle') }} />
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </TabsContent>

        <TabsContent value="diagram" className="m-0 p-4">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-[#1d1a16]">Diagram Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Nodes" value={diagram.nodes.length} />
              <Stat label="Edges" value={diagram.edges.length} />
            </div>
            <div>
              <Label>Grid Size</Label>
              <Input
                type="number"
                value={diagram.meta.gridSize}
                onChange={(e) =>
                  liveEdit([{ type: 'setMeta', patch: { gridSize: parseInt(e.target.value) || 20 } }], 'Change grid size')
                }
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Snap to Grid</span>
              <Button
                size="sm"
                variant={diagram.meta.snap ? 'default' : 'outline'}
                onClick={() =>
                  applyDiffWithHistory({
                    ops: [{ type: 'setMeta', patch: { snap: !diagram.meta.snap } }],
                    summary: 'Toggle snap',
                  })
                }
              >
                {diagram.meta.snap ? 'On' : 'Off'}
              </Button>
            </div>
          </section>

          {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
            <section className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold text-[#1d1a16]">
                Selection ({selectedNodes.length} node{selectedNodes.length === 1 ? '' : 's'}
                {selectedEdges.length > 0 ? `, ${selectedEdges.length} edge${selectedEdges.length === 1 ? '' : 's'}` : ''})
              </h3>
              {selectedNodes.map((node) => (
                <div key={node.id} className="text-xs">
                  <div className="font-medium">{node.shapeKind ?? node.type}</div>
                  <div className="text-muted-foreground">
                    ({Math.round(node.x)}, {Math.round(node.y)}) · {Math.round(node.w)} × {Math.round(node.h)}
                  </div>
                </div>
              ))}
            </section>
          )}
        </TabsContent>

        <TabsContent value="style" className="m-0 p-4">
          {selectedNodes.length > 0 ? (
            <section className="space-y-4" data-testid="node-inspector">
              <h3 className="text-sm font-semibold text-[#1d1a16]">
                Node Style {selectedNodes.length > 1 ? `(${selectedNodes.length} selected)` : ''}
              </h3>

              <div>
                <Label>Text</Label>
                <Input
                  type="text"
                  value={common(selectedNodes, (n) => n.text ?? '') ?? ''}
                  placeholder={common(selectedNodes, (n) => n.text ?? '') === undefined ? 'Mixed' : ''}
                  onChange={(e) => updateNodeFields({ text: e.target.value }, 'Edit text')}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label="X" value={common(selectedNodes, (n) => Math.round(n.x))} onChange={(v) => updateNodeFields({ x: v }, 'Move node')} />
                <NumberField label="Y" value={common(selectedNodes, (n) => Math.round(n.y))} onChange={(v) => updateNodeFields({ y: v }, 'Move node')} />
                <NumberField label="Width" value={common(selectedNodes, (n) => Math.round(n.w))} min={1} onChange={(v) => updateNodeFields({ w: Math.max(1, v) }, 'Resize node')} />
                <NumberField label="Height" value={common(selectedNodes, (n) => Math.round(n.h))} min={1} onChange={(v) => updateNodeFields({ h: Math.max(1, v) }, 'Resize node')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Fill" value={common(selectedNodes, (n) => n.style?.fill ?? '#ffffff') ?? '#ffffff'} onChange={(v) => updateNodeStyle({ fill: v }, 'Change fill')} />
                <ColorField label="Stroke" value={common(selectedNodes, (n) => n.style?.stroke ?? '#000000') ?? '#000000'} onChange={(v) => updateNodeStyle({ stroke: v }, 'Change stroke')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Stroke Width" value={common(selectedNodes, (n) => n.style?.strokeWidth ?? 2)} min={0} onChange={(v) => updateNodeStyle({ strokeWidth: Math.max(0, v) }, 'Change stroke width')} />
                <NumberField label="Font Size" value={common(selectedNodes, (n) => n.style?.fontSize ?? 14)} min={1} onChange={(v) => updateNodeStyle({ fontSize: Math.max(1, v) }, 'Change font size')} />
              </div>

              <div>
                <Label>Font Family</Label>
                <Select
                  value={common(selectedNodes, (n) => n.style?.fontFamily ?? FONT_FAMILIES[0]) ?? ''}
                  onChange={(v) => updateNodeStyle({ fontFamily: v }, 'Change font')}
                  options={FONT_FAMILIES.map((f) => ({ value: f, label: f.split(',')[0] }))}
                />
              </div>

              <RangeField
                label="Opacity"
                value={common(selectedNodes, (n) => n.style?.opacity ?? 1) ?? 1}
                onChange={(v) => updateNodeStyle({ opacity: v }, 'Change opacity')}
              />
            </section>
          ) : selectedEdges.length > 0 ? (
            <section className="space-y-4" data-testid="edge-inspector">
              <h3 className="text-sm font-semibold text-[#1d1a16]">
                Edge Style {selectedEdges.length > 1 ? `(${selectedEdges.length} selected)` : ''}
              </h3>

              <div>
                <Label>Label</Label>
                <Input
                  type="text"
                  value={common(selectedEdges, (e) => e.label ?? '') ?? ''}
                  placeholder={common(selectedEdges, (e) => e.label ?? '') === undefined ? 'Mixed' : ''}
                  onChange={(e) => updateEdgeFields({ label: e.target.value || undefined }, 'Edit edge label')}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Stroke" value={common(selectedEdges, (e) => e.style?.stroke ?? '#000000') ?? '#000000'} onChange={(v) => updateEdgeStyle({ stroke: v }, 'Change edge color')} />
                <NumberField label="Width" value={common(selectedEdges, (e) => e.style?.strokeWidth ?? 2)} min={0} onChange={(v) => updateEdgeStyle({ strokeWidth: Math.max(0, v) }, 'Change edge width')} />
              </div>

              <div>
                <Label>Route</Label>
                <Select
                  value={common(selectedEdges, (e) => e.routing ?? 'straight') ?? 'straight'}
                  onChange={(v) => updateEdgeFields({ routing: v as Edge['routing'] }, 'Change edge route')}
                  options={[
                    { value: 'straight', label: 'Straight' },
                    { value: 'orthogonal', label: 'Orthogonal' },
                    { value: 'curved', label: 'Curved' },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Toggle
                  label="Start arrowhead"
                  checked={common(selectedEdges, (e) => e.arrowStart === true) ?? false}
                  onChange={(checked) => updateEdgeFields({ arrowStart: checked }, 'Toggle start arrow')}
                />
                <Toggle
                  label="End arrowhead"
                  checked={common(selectedEdges, (e) => e.arrowEnd !== false) ?? true}
                  onChange={(checked) => updateEdgeFields({ arrowEnd: checked }, 'Toggle end arrow')}
                />
                <Toggle
                  label="Dashed"
                  checked={common(selectedEdges, (e) => !!e.style?.strokeDasharray) ?? false}
                  onChange={(checked) => updateEdgeStyle({ strokeDasharray: checked ? '6 4' : undefined }, 'Toggle dashed')}
                />
              </div>
            </section>
          ) : (
            <p className="text-xs text-muted-foreground">Select a node or edge to edit its style.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-muted-foreground">{children}</label>
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number | undefined
  min?: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        value={value ?? ''}
        placeholder={value === undefined ? 'Mixed' : ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value)
          if (!Number.isNaN(parsed)) onChange(parsed)
        }}
        className="mt-1"
      />
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9" />
    </div>
  )
}

function RangeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#6f49ff]"
      />
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#6f49ff]" />
    </label>
  )
}
