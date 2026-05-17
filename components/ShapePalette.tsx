'use client'

import { ChevronDown, ChevronRight, Edit3, HelpCircle, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { generateId, Node } from '@/lib/model/diagram'

type ShapeIconKind =
  | 'rect'
  | 'rounded'
  | 'text'
  | 'heading'
  | 'ellipse'
  | 'square'
  | 'circle'
  | 'swimlane'
  | 'diamond'
  | 'parallelogram'
  | 'hexagon'
  | 'triangle'
  | 'database'
  | 'cloud'
  | 'document'
  | 'table'
  | 'cube'
  | 'chevron'
  | 'trapezoid'
  | 'wave'
  | 'file'
  | 'note'
  | 'callout'
  | 'person'
  | 'brace'
  | 'delay'
  | 'flag'
  | 'window'
  | 'panel'
  | 'list'
  | 'curve'
  | 'doubleArrow'
  | 'arrow'
  | 'dashedLine'
  | 'line'
  | 'labelArrow'

type PaletteShape = {
  label: string
  icon: ShapeIconKind
  type: Node['type']
  text?: string
  w?: number
  h?: number
  fill?: string
  stroke?: string
}

const generalShapes: PaletteShape[] = [
  { label: 'Rectangle', icon: 'rect', type: 'rect', text: '', w: 168, h: 72 },
  { label: 'Rounded Rectangle', icon: 'rounded', type: 'rect', text: '', w: 168, h: 72 },
  { label: 'Text', icon: 'text', type: 'text', text: 'Text', w: 120, h: 44, fill: 'transparent', stroke: 'transparent' },
  { label: 'Heading', icon: 'heading', type: 'text', text: 'Heading', w: 176, h: 64, fill: 'transparent', stroke: 'transparent' },
  { label: 'Ellipse', icon: 'ellipse', type: 'ellipse', text: '', w: 152, h: 76 },
  { label: 'Square', icon: 'square', type: 'rect', text: '', w: 120, h: 120 },
  { label: 'Circle', icon: 'circle', type: 'ellipse', text: '', w: 120, h: 120 },
  { label: 'Swimlane', icon: 'swimlane', type: 'rect', text: '', w: 220, h: 88 },
  { label: 'Diamond', icon: 'diamond', type: 'diamond', text: '', w: 132, h: 132 },
  { label: 'Parallelogram', icon: 'parallelogram', type: 'rect', text: '', w: 168, h: 72 },
  { label: 'Hexagon', icon: 'hexagon', type: 'rect', text: '', w: 160, h: 86 },
  { label: 'Triangle', icon: 'triangle', type: 'diamond', text: '', w: 120, h: 120 },
  { label: 'Database', icon: 'database', type: 'rect', text: 'Data', w: 144, h: 112 },
  { label: 'Cloud', icon: 'cloud', type: 'ellipse', text: 'Cloud', w: 168, h: 82 },
  { label: 'Document', icon: 'document', type: 'rect', text: 'Document', w: 160, h: 96 },
  { label: 'Table', icon: 'table', type: 'rect', text: '', w: 150, h: 120 },
  { label: 'Cube', icon: 'cube', type: 'rect', text: '', w: 140, h: 92 },
  { label: 'Chevron', icon: 'chevron', type: 'rect', text: '', w: 168, h: 72 },
  { label: 'Trapezoid', icon: 'trapezoid', type: 'rect', text: '', w: 168, h: 72 },
  { label: 'Wave', icon: 'wave', type: 'rect', text: '', w: 168, h: 96 },
  { label: 'File', icon: 'file', type: 'rect', text: '', w: 132, h: 152 },
  { label: 'Note', icon: 'note', type: 'rect', text: '', w: 132, h: 152 },
  { label: 'Callout', icon: 'callout', type: 'rect', text: 'Note', w: 160, h: 84 },
  { label: 'Person', icon: 'person', type: 'text', text: 'Person', w: 96, h: 120, fill: 'transparent', stroke: 'transparent' },
  { label: 'Brace', icon: 'brace', type: 'rect', text: '', w: 80, h: 140 },
  { label: 'Delay', icon: 'delay', type: 'rect', text: '', w: 150, h: 110 },
  { label: 'Flag', icon: 'flag', type: 'rect', text: '', w: 132, h: 118 },
  { label: 'Window', icon: 'window', type: 'rect', text: '', w: 152, h: 120 },
  { label: 'Panel', icon: 'panel', type: 'rect', text: '', w: 152, h: 120 },
  { label: 'List', icon: 'list', type: 'rect', text: 'List item', w: 170, h: 120 },
  { label: 'Curved Connector', icon: 'curve', type: 'rect', text: '', w: 160, h: 36, fill: 'transparent' },
  { label: 'Double Arrow', icon: 'doubleArrow', type: 'rect', text: '', w: 170, h: 36, fill: 'transparent' },
  { label: 'Arrow', icon: 'arrow', type: 'rect', text: '', w: 170, h: 36, fill: 'transparent' },
  { label: 'Dashed Line', icon: 'dashedLine', type: 'rect', text: '', w: 170, h: 20, fill: 'transparent' },
  { label: 'Line', icon: 'line', type: 'rect', text: '', w: 170, h: 20, fill: 'transparent' },
  { label: 'Labeled Arrow', icon: 'labelArrow', type: 'rect', text: 'Label', w: 170, h: 36, fill: 'transparent' },
]

const collapsedCategories = ['Misc', 'Advanced', 'Basic', 'Arrows', 'Flowchart', 'Entity Relation', 'UML']

const compactShapes = generalShapes.slice(0, 6)

export function ShapePalette({ collapsed = false }: { collapsed?: boolean }) {
  const { applyDiffWithHistory } = useDiagramStore()

  const addShape = (shape: PaletteShape) => {
    const nodeId = generateId('node')
    applyDiffWithHistory({
      ops: [{
        type: 'addNode',
        node: {
          id: nodeId,
          type: shape.type,
          x: 360,
          y: 260,
          w: shape.w ?? (shape.type === 'diamond' ? 132 : 168),
          h: shape.h ?? (shape.type === 'diamond' ? 132 : 78),
          text: shape.text ?? shape.label,
          style: {
            fill: shape.fill ?? '#ffffff',
            stroke: shape.stroke ?? '#4a4a4a',
            strokeWidth: 2,
            fontSize: 14,
            fontFamily: 'Geist, ui-sans-serif',
          },
        },
      }],
      summary: `Add ${shape.label}`,
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f3f6f7]">
      <div className={`border-b border-[#d6dcde] p-3 max-lg:hidden ${collapsed ? 'hidden' : ''}`}>
        <div className="flex h-10 items-center gap-2 rounded-2xl border border-[#d4d9dc] bg-white px-3 text-[15px] text-[#666] shadow-sm">
          <span className="text-[#7a7a7a]">Type / to search</span>
          <Search className="ml-auto h-5 w-5 text-[#4b4b4b]" />
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-1 border-b border-[#eee8de] p-2 ${collapsed ? '' : 'hidden max-lg:grid'}`}>
        {compactShapes.map((shape) => (
          <Button key={shape.label} data-testid={`shape-${shape.icon}`} variant="outline" size="icon" className="h-9 w-9 rounded-md max-lg:w-full" title={shape.label} onClick={() => addShape(shape)}>
            <DrawShapeIcon kind={shape.icon} />
          </Button>
        ))}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 max-lg:hidden ${collapsed ? 'hidden' : ''}`}>
        <section className="mb-5">
          <PaletteSectionHeader title="Scratchpad" open actions />
          <div className="mt-3 rounded-2xl border-2 border-dotted border-[#8c9294] bg-white/20 px-4 py-3 text-center text-[14px] text-[#8a8d8e]">
            Drag elements here
          </div>
        </section>

        <section className="mb-5">
          <PaletteSectionHeader title="General" open />
          <div className="mt-3 grid grid-cols-5 gap-x-3 gap-y-4" data-testid="drawio-general-shape-grid">
            {generalShapes.map((shape) => (
              <button
                key={shape.label}
                type="button"
                title={shape.label}
                data-testid={`drawio-shape-${shape.icon}`}
                className="flex h-8 items-center justify-center text-[#45484a] transition hover:scale-105 hover:text-[#111]"
                onClick={() => addShape(shape)}
              >
                <DrawShapeIcon kind={shape.icon} />
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-5 pb-6">
          {collapsedCategories.map((category) => (
            <button key={category} type="button" className="flex items-center gap-2 text-left text-[17px] font-semibold text-[#3e4142]">
              <ChevronRight className="h-4 w-4 fill-[#3e4142]" />
              {category}
            </button>
          ))}
        </div>

        <div className="pb-8 text-center">
          <Button type="button" variant="secondary" className="h-11 rounded-md bg-[#bde7ff] px-5 text-[17px] font-semibold text-[#3a3a3a] hover:bg-[#a8ddfb]">
            <Plus className="mr-2 h-5 w-5" />
            More Shapes
          </Button>
        </div>
      </div>
    </div>
  )
}

function PaletteSectionHeader({ title, open, actions = false }: { title: string; open?: boolean; actions?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[17px] font-semibold text-[#3e4142]">
      {open ? <ChevronDown className="h-4 w-4 fill-[#3e4142]" /> : <ChevronRight className="h-4 w-4 fill-[#3e4142]" />}
      <span>{title}</span>
      {actions && (
        <div className="ml-auto flex items-center gap-3 text-[#626669]">
          <HelpCircle className="h-4 w-4" />
          <Plus className="h-4 w-4" />
          <Edit3 className="h-4 w-4" />
          <X className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

function DrawShapeIcon({ kind }: { kind: ShapeIconKind }) {
  const common = {
    stroke: 'currentColor',
    strokeWidth: 2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 64 44" className="h-8 w-11 overflow-visible">
      {kind === 'rect' && <rect x="5" y="12" width="46" height="20" {...common} />}
      {kind === 'rounded' && <rect x="6" y="12" width="44" height="20" rx="4" {...common} />}
      {kind === 'text' && <text x="10" y="27" className="fill-current text-[10px]">Text</text>}
      {kind === 'heading' && (
        <>
          <text x="3" y="16" className="fill-current text-[5px] font-semibold">Heading</text>
          <path d="M4 22h42M4 26h36M4 30h28" {...common} strokeWidth={1} />
        </>
      )}
      {kind === 'ellipse' && <ellipse cx="29" cy="22" rx="22" ry="14" {...common} />}
      {kind === 'square' && <rect x="8" y="8" width="34" height="30" {...common} />}
      {kind === 'circle' && <circle cx="27" cy="22" r="17" {...common} />}
      {kind === 'swimlane' && (
        <>
          <rect x="5" y="12" width="45" height="20" {...common} />
          <path d="M10 12v20M45 12v20" {...common} />
        </>
      )}
      {kind === 'diamond' && <path d="M30 5 52 22 30 39 8 22Z" {...common} />}
      {kind === 'parallelogram' && <path d="M15 12h38l-8 20H7Z" {...common} />}
      {kind === 'hexagon' && <path d="M13 10h30l9 12-9 12H13L5 22Z" {...common} />}
      {kind === 'triangle' && <path d="M11 6 50 22 11 39Z" {...common} />}
      {kind === 'database' && (
        <>
          <ellipse cx="28" cy="12" rx="16" ry="6" {...common} />
          <path d="M12 12v20c0 3 7 6 16 6s16-3 16-6V12M12 22c0 3 7 6 16 6s16-3 16-6" {...common} />
        </>
      )}
      {kind === 'cloud' && <path d="M18 32h24a9 9 0 0 0 1-18 12 12 0 0 0-22-2 10 10 0 0 0-3 20Z" {...common} />}
      {kind === 'document' && <path d="M9 8h34v22c-8-5-16 6-34 0Z" {...common} />}
      {kind === 'table' && (
        <>
          <rect x="8" y="8" width="34" height="30" {...common} />
          <path d="M18 8v30M8 19h34" {...common} />
        </>
      )}
      {kind === 'cube' && <path d="M10 14h28l10 8v17H19L10 31Zm0 0 9 8h29M19 22v17" {...common} />}
      {kind === 'chevron' && <path d="M7 12h33l11 10-11 10H7l10-10Z" {...common} />}
      {kind === 'trapezoid' && <path d="M15 12h32l-6 20H9Z" {...common} />}
      {kind === 'wave' && <path d="M8 13c12 14 22-12 34 2v20c-12-14-22 12-34-2Z" {...common} />}
      {kind === 'file' && <path d="M13 7h23l10 10v22H13Zm23 0v10h10" {...common} />}
      {kind === 'note' && <path d="M14 8h28v30H10V17Zm0 0v9h-4" {...common} />}
      {kind === 'callout' && <path d="M9 12h39v18H32l-8 8v-8H9Z" {...common} />}
      {kind === 'person' && (
        <>
          <circle cx="28" cy="9" r="5" {...common} />
          <path d="M28 14v16M16 20h24M28 30l-10 10M28 30l10 10" {...common} />
        </>
      )}
      {kind === 'brace' && <path d="M37 6c12 0 12 16 3 16 9 0 9 16-3 16" {...common} />}
      {kind === 'delay' && <path d="M8 8h24a22 22 0 0 1 0 28H8Z" {...common} />}
      {kind === 'flag' && <path d="M12 8h31v26c-10 6-19-4-31 2Z" {...common} />}
      {kind === 'window' && (
        <>
          <rect x="8" y="8" width="36" height="30" {...common} />
          <path d="M8 15h36M13 12h1M17 12h1" {...common} />
        </>
      )}
      {kind === 'panel' && (
        <>
          <rect x="8" y="8" width="36" height="30" {...common} />
          <path d="M14 8v30" {...common} />
        </>
      )}
      {kind === 'list' && (
        <>
          <rect x="5" y="7" width="44" height="30" {...common} />
          <text x="8" y="15" className="fill-current text-[4px]">List</text>
          <path d="M8 21h34M8 26h24M8 31h30" {...common} strokeWidth={1} />
        </>
      )}
      {kind === 'curve' && <path d="M8 32c20 0 8-20 28-20h12" {...common} />}
      {kind === 'doubleArrow' && <path d="M11 34 47 8M11 34h10M11 34v-10M47 8H37M47 8v10" {...common} />}
      {kind === 'arrow' && <path d="M12 34 48 8M48 8H36M48 8v12" {...common} />}
      {kind === 'dashedLine' && <path d="M8 34 48 8" {...common} strokeDasharray="2 4" />}
      {kind === 'line' && <path d="M8 34 48 8" {...common} />}
      {kind === 'labelArrow' && (
        <>
          <path d="M8 24h40M48 24l-8-6M48 24l-8 6" {...common} />
          <text x="18" y="20" className="fill-current text-[4px]">Label</text>
        </>
      )}
    </svg>
  )
}
