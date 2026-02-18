'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'

export function InspectorTabs() {
  const { diagram, selectedNodeIds, selectedEdgeIds, applyDiffWithHistory } = useDiagramStore()

  const selectedNodes = diagram.nodes.filter(n => selectedNodeIds.has(n.id))
  const selectedEdges = diagram.edges.filter(e => selectedEdgeIds.has(e.id))

  return (
    <div className="w-80 bg-background border-l overflow-y-auto">
      <Tabs defaultValue="diagram" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="diagram" className="flex-1">Diagram</TabsTrigger>
          <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="diagram" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Diagram Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {selectedNodes.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Selection ({selectedNodes.length} node{selectedNodes.length > 1 ? 's' : ''})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="style" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Style Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="p-4">
          {/* AI Panel will be inserted here */}
          <div className="text-xs text-muted-foreground">
            AI panel placeholder - see AIPanel component below
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
