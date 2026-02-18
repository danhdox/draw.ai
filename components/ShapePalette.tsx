'use client'

import { Square, Circle, Diamond, Type, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { generateId } from '@/lib/model/diagram'
import { Node } from '@/lib/model/diagram'

const shapes = [
  { type: 'rect' as const, icon: Square, label: 'Rectangle' },
  { type: 'ellipse' as const, icon: Circle, label: 'Ellipse' },
  { type: 'diamond' as const, icon: Diamond, label: 'Diamond' },
  { type: 'text' as const, icon: Type, label: 'Text' },
]

export function ShapePalette() {
  const { applyDiffWithHistory, startConnecting } = useDiagramStore()

  const addShape = (type: Node['type']) => {
    const nodeId = generateId('node')
    applyDiffWithHistory({
      ops: [{
        type: 'addNode',
        node: {
          id: nodeId,
          type,
          x: 400,
          y: 300,
          w: type === 'diamond' ? 120 : 150,
          h: type === 'diamond' ? 120 : 100,
          text: `New ${type}`,
          style: {
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
          },
        },
      }],
      summary: `Add ${type}`,
    })
  }

  return (
    <div className="w-20 bg-background border-r p-2 flex flex-col gap-2">
      <div className="text-xs font-semibold mb-2">Shapes</div>
      {shapes.map((shape) => (
        <Button
          key={shape.type}
          variant="outline"
          size="icon"
          onClick={() => addShape(shape.type)}
          title={shape.label}
        >
          <shape.icon className="h-4 w-4" />
        </Button>
      ))}
      <div className="border-t my-2" />
      <Button
        variant="outline"
        size="icon"
        title="Connect nodes"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
