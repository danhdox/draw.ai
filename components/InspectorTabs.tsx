'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'

export function InspectorTabs() {
  const { diagram, selectedNodeIds, selectedEdgeIds, applyDiffWithHistory } = useDiagramStore()

  const selectedNodes = diagram.nodes.filter(n => selectedNodeIds.has(n.id))
  const selectedEdges = diagram.edges.filter(e => selectedEdgeIds.has(e.id))

  return (
    <div className="bg-white">
      <Tabs defaultValue="diagram" className="w-full">
        <TabsList className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-2 rounded-lg bg-[#f4f2ee]">
          <TabsTrigger value="diagram" className="flex-1">Diagram</TabsTrigger>
          <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
        </TabsList>

        <TabsContent value="diagram" className="m-0 p-4">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-[#1d1a16]">Diagram Info</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Nodes</div>
                <div className="text-sm font-medium">{diagram.nodes.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Edges</div>
                <div className="text-sm font-medium">{diagram.edges.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Grid Size</div>
                <Input
                  type="number"
                  value={diagram.meta.gridSize}
                  onChange={(e) => {
                    applyDiffWithHistory({
                      ops: [{
                        type: 'setMeta',
                        patch: { gridSize: parseInt(e.target.value) || 20 },
                      }],
                      summary: 'Change grid size',
                    })
                  }}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Snap to Grid</span>
                <Button
                  size="sm"
                  variant={diagram.meta.snap ? 'default' : 'outline'}
                  onClick={() => {
                    applyDiffWithHistory({
                      ops: [{
                        type: 'setMeta',
                        patch: { snap: !diagram.meta.snap },
                      }],
                      summary: 'Toggle snap',
                    })
                  }}
                >
                  {diagram.meta.snap ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </section>

          {selectedNodes.length > 0 && (
            <section className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-[#1d1a16]">
                Selection ({selectedNodes.length} node{selectedNodes.length > 1 ? 's' : ''})
              </h3>
              <div className="space-y-2">
                {selectedNodes.map((node) => (
                  <div key={node.id} className="text-xs">
                    <div className="font-medium">{node.type} - {node.id}</div>
                    <div className="text-muted-foreground">
                      Position: ({Math.round(node.x)}, {Math.round(node.y)})
                    </div>
                    <div className="text-muted-foreground">
                      Size: {Math.round(node.w)} × {Math.round(node.h)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="style" className="m-0 p-4">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-[#1d1a16]">Style Properties</h3>
            <div className="space-y-4">
              {selectedNodes.length > 0 ? (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Fill Color</label>
                    <Input
                      type="color"
                      value={selectedNodes[0].style?.fill || '#ffffff'}
                      onChange={(e) => {
                        const ops = selectedNodes.map((node) => ({
                          type: 'updateNode' as const,
                          id: node.id,
                          patch: {
                            style: { ...node.style, fill: e.target.value },
                          },
                        }))
                        applyDiffWithHistory({
                          ops,
                          summary: 'Change fill color',
                        })
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Stroke Color</label>
                    <Input
                      type="color"
                      value={selectedNodes[0].style?.stroke || '#000000'}
                      onChange={(e) => {
                        const ops = selectedNodes.map((node) => ({
                          type: 'updateNode' as const,
                          id: node.id,
                          patch: {
                            style: { ...node.style, stroke: e.target.value },
                          },
                        }))
                        applyDiffWithHistory({
                          ops,
                          summary: 'Change stroke color',
                        })
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Stroke Width</label>
                    <Input
                      type="number"
                      value={selectedNodes[0].style?.strokeWidth || 2}
                      onChange={(e) => {
                        const ops = selectedNodes.map((node) => ({
                          type: 'updateNode' as const,
                          id: node.id,
                          patch: {
                            style: { ...node.style, strokeWidth: parseInt(e.target.value) || 2 },
                          },
                        }))
                        applyDiffWithHistory({
                          ops,
                          summary: 'Change stroke width',
                        })
                      }}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a node to edit its style
                </p>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
