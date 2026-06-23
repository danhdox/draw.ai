'use client'

import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  Copy,
  ChevronsLeft,
  ChevronsRight,
  ClipboardPaste,
  Download,
  FileText,
  FolderOpen,
  Grid3x3,
  History,
  Image as ImageIcon,
  Layers3,
  MessageSquare,
  Redo2,
  Maximize2,
  Save,
  Spline,
  Trash2,
  Undo2,
  Workflow,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Canvas } from '@/components/Canvas'
import { ShapePalette } from '@/components/ShapePalette'
import { InspectorTabs } from '@/components/InspectorTabs'
import { Toaster } from '@/components/Toaster'
import { ContextMenu } from '@/components/ContextMenu'
import { Minimap } from '@/components/Minimap'
import { useViewportStore } from '@/lib/store/useViewportStore'

// The AI panel (AI SDK chat client) is the heaviest, least-used part of the
// initial view — load it on demand to keep the first-load bundle small.
const AIPanel = dynamic(() => import('@/components/AIPanel').then((m) => m.AIPanel), {
  ssr: false,
  loading: () => <div className="p-4 text-[12px] text-[#746f66]">Loading agent…</div>,
})
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { DiagramSchema } from '@/lib/model/diagram'
import { downloadBlob } from '@/lib/export/download'
import { downloadSVG, diagramBounds } from '@/lib/export/svg'
import { downloadPNG } from '@/lib/export/png'
import { exportToMermaid } from '@/lib/export/mermaid'
import { importFromMermaid } from '@/lib/import/mermaid'
import { runElkLayout } from '@/lib/layout/elk'
import { toast } from '@/lib/store/useToastStore'
import { loadDiagram, saveDiagram } from '@/lib/persistence'

export function EditorShell() {
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [inspectorTab, setInspectorTab] = useState('design')
  const [agentPanelView, setAgentPanelView] = useState<'current' | 'history'>('current')
  const {
    diagram,
    undo,
    redo,
    history,
    historyIndex,
    tool,
    setTool,
    deleteSelected,
    duplicateSelected,
    nudgeSelected,
    groupSelected,
    ungroupSelected,
    bringToFront,
    sendToBack,
    selectAll,
    copy,
    paste,
    pasteText,
    toggleLockSelected,
    bringForward,
    sendBackward,
    setDiagram,
    reset,
    applyDiffWithHistory,
  } = useDiagramStore()
  const hasSelection = useDiagramStore((s) => s.selectedNodeIds.size + s.selectedEdgeIds.size > 0)

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  const handleNew = () => {
    if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
      reset()
      toast.info('Started a new diagram')
    }
  }

  const handleSave = () => {
    try {
      const json = JSON.stringify(diagram, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      downloadBlob(blob, 'diagram.json')
      toast.success('Saved diagram.json')
    } catch {
      toast.error('Could not save the diagram')
    }
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        try {
          const json = JSON.parse(readerEvent.target?.result as string)
          const validated = DiagramSchema.parse(json)
          setDiagram(validated)
          toast.success('Diagram loaded')
        } catch {
          toast.error('Invalid diagram file — could not parse JSON')
        }
      }
      reader.onerror = () => toast.error('Could not read the selected file')
      reader.readAsText(file)
    }
    input.click()
  }

  const handleImportMermaid = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mmd,.mermaid,.txt,.md,text/plain'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        try {
          const imported = importFromMermaid(readerEvent.target?.result as string)
          setDiagram(imported)
          toast.success(`Imported ${imported.nodes.length} nodes from Mermaid`)
        } catch (error) {
          toast.error(error instanceof Error ? `Mermaid import failed: ${error.message}` : 'Mermaid import failed')
        }
      }
      reader.onerror = () => toast.error('Could not read the selected file')
      reader.readAsText(file)
    }
    input.click()
  }

  const handleExportSVG = () => {
    try {
      downloadSVG(diagram)
      toast.success('Exported diagram.svg')
    } catch {
      toast.error('SVG export failed')
    }
  }

  const handleExportPNG = async () => {
    try {
      await downloadPNG(diagram)
      toast.success('Exported diagram.png')
    } catch (error) {
      toast.error(error instanceof Error ? `PNG export failed: ${error.message}` : 'PNG export failed')
    }
  }

  const handleExportMermaid = () => {
    try {
      const mermaid = exportToMermaid(diagram)
      const blob = new Blob([mermaid], { type: 'text/plain' })
      downloadBlob(blob, 'diagram.mmd')
      toast.success('Exported diagram.mmd')
    } catch {
      toast.error('Mermaid export failed')
    }
  }

  const handleAutoLayout = async () => {
    try {
      const diff = await runElkLayout(diagram)
      if (diff.ops.length === 0) {
        toast.info('Nothing to lay out')
        return
      }
      applyDiffWithHistory(diff)
      toast.success(diff.summary || 'Layout applied')
    } catch {
      toast.error('Layout failed')
    }
  }

  // Restore the autosaved diagram on first load.
  useEffect(() => {
    const restored = loadDiagram()
    if (restored && (restored.nodes.length > 0 || restored.edges.length > 0)) {
      setDiagram(restored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave to localStorage (debounced) whenever the diagram changes.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = useDiagramStore.subscribe((state, prev) => {
      if (state.diagram === prev.diagram) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => saveDiagram(useDiagramStore.getState().diagram), 500)
    })
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  // Global keyboard shortcuts (disabled while typing in fields).
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null
      if (!node) return false
      const tag = node.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
    }

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copy()
        return
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
          navigator.clipboard.readText().then((t) => pasteText(t)).catch(() => paste())
        } else paste()
        return
      }
      if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        toggleLockSelected()
        return
      }
      if (mod && e.key === ']') {
        e.preventDefault()
        bringForward()
        return
      }
      if (mod && e.key === '[') {
        e.preventDefault()
        sendBackward()
        return
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        selectAll()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
        return
      }
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) ungroupSelected()
        else groupSelected()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      if (e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? diagram.meta.gridSize : 1
        const delta: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        }
        const move = delta[e.key]
        if (move) {
          e.preventDefault()
          nudgeSelected(move[0], move[1])
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram])

  return (
    <div className="relative h-screen overflow-hidden bg-[#fbfaf7] text-[#1d1a16]">
      <div className="absolute inset-0 z-0">
        <Canvas />
      </div>

      <TopNav
        onNew={handleNew}
        onOpen={handleLoad}
        onSave={handleSave}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        onExportMermaid={handleExportMermaid}
        onImportMermaid={handleImportMermaid}
      />

      <aside
        className={`absolute bottom-5 left-0 top-[49px] z-20 overflow-hidden border-r border-[#e3ddd2] bg-white/90 shadow-lg shadow-black/5 backdrop-blur transition-[width] duration-200 max-lg:bottom-[54vh] max-lg:top-[49px] ${
          paletteCollapsed ? 'w-14' : 'w-[280px] max-lg:w-[64px]'
        }`}
        data-testid="left-palette-dock"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-11 shrink-0 items-center justify-end border-b border-[#eee8de] px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md"
              title={paletteCollapsed ? 'Expand palette' : 'Collapse palette'}
              onClick={() => setPaletteCollapsed((collapsed) => !collapsed)}
              data-testid="palette-collapse-toggle"
            >
              {paletteCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          </div>
          <ShapePalette collapsed={paletteCollapsed} />
        </div>
      </aside>

      <aside
        data-testid="desktop-inspector"
        className={`absolute bottom-5 right-0 top-[49px] z-20 overflow-hidden border-l border-[#e3ddd2] bg-white/90 shadow-lg shadow-black/5 backdrop-blur transition-[width] duration-200 max-lg:hidden ${
          inspectorCollapsed ? 'w-14' : 'w-[340px]'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          {inspectorCollapsed ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex h-11 shrink-0 items-center justify-center border-b border-[#eee8de] px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  title="Expand inspector"
                  onClick={() => setInspectorCollapsed(false)}
                  data-testid="inspector-collapse-toggle"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col items-center gap-2 p-2" data-testid="inspector-compact-rail">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" title="Design inspector" onClick={() => setInspectorCollapsed(false)}>
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" title="Agent panel" onClick={() => { setInspectorCollapsed(false); setInspectorTab('copilot') }}>
                  <Workflow className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={inspectorTab} onValueChange={setInspectorTab} className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#eee8de] px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  title="Collapse inspector"
                  onClick={() => setInspectorCollapsed(true)}
                  data-testid="inspector-collapse-toggle"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <TabsList className="h-8 rounded-lg bg-[#f4f2ee] p-1">
                  <TabsTrigger value="design" className="h-6 rounded-md px-3 text-[12px]">Design</TabsTrigger>
                  <TabsTrigger value="copilot" className="h-6 rounded-md px-3 text-[12px]">Agent</TabsTrigger>
                </TabsList>
                <Button
                  type="button"
                  variant={agentPanelView === 'history' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="ml-auto h-8 w-8 rounded-md"
                  title={agentPanelView === 'history' ? 'Show current agent chat' : 'Show agent chat history'}
                  aria-label={agentPanelView === 'history' ? 'Show current agent chat' : 'Show agent chat history'}
                  data-testid="agent-history-toggle"
                  onClick={() => {
                    setInspectorTab('copilot')
                    setAgentPanelView((view) => (view === 'current' ? 'history' : 'current'))
                  }}
                >
                  {agentPanelView === 'history' ? <MessageSquare className="h-4 w-4" /> : <History className="h-4 w-4" />}
                </Button>
              </div>
              <TabsContent value="design" className="m-0 min-h-0 flex-1 overflow-y-auto">
                <InspectorTabs />
              </TabsContent>
              <TabsContent value="copilot" className="m-0 min-h-0 flex-1 overflow-hidden p-4">
                <AIPanel view={agentPanelView} onViewChange={setAgentPanelView} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </aside>

      <FloatingToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={hasSelection}
        connectActive={tool === 'connect'}
        onUndo={undo}
        onRedo={redo}
        onToggleConnect={() => setTool(tool === 'connect' ? 'select' : 'connect')}
        onDelete={deleteSelected}
        onCopy={copy}
        onPaste={paste}
        onLayout={handleAutoLayout}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
      />

      <ZoomControls bounds={diagramBounds(diagram)} />
      <Minimap />
      <ContextMenu />

      <div className="hidden max-lg:block">
        <div data-testid="mobile-inspector" className="fixed bottom-3 left-3 right-3 max-h-[52vh] overflow-hidden rounded-xl border border-[#e3ddd2] bg-white shadow-xl">
          <Tabs defaultValue="design">
            <TabsList className="w-full rounded-none border-b border-[#eee8de] bg-white">
              <TabsTrigger value="design" className="flex-1">Design</TabsTrigger>
              <TabsTrigger value="copilot" className="flex-1">Agent</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="m-0 h-[45vh] overflow-auto">
              <InspectorTabs />
            </TabsContent>
            <TabsContent value="copilot" className="m-0 h-[45vh] p-3">
              <AIPanel view={agentPanelView} onViewChange={setAgentPanelView} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Toaster />
    </div>
  )
}

function TopNav({
  onNew,
  onOpen,
  onSave,
  onExportSVG,
  onExportPNG,
  onExportMermaid,
  onImportMermaid,
}: {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onExportSVG: () => void
  onExportPNG: () => void
  onExportMermaid: () => void
  onImportMermaid: () => void
}) {
  return (
    <header className="absolute left-0 right-0 top-0 z-30 border-b border-[#e3ddd2] bg-white/92 px-5 py-2 shadow-sm backdrop-blur max-lg:px-3">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto" data-testid="top-nav-left-actions">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2 rounded-lg pr-2 outline-none transition hover:bg-[#f4f2ee] focus-visible:ring-2 focus-visible:ring-[#7c3cff] focus-visible:ring-offset-2"
            aria-label="Open Draw.ai home"
          >
            <AppIcon />
            <span className="truncate text-[13px] font-semibold text-[#1d1a16]">Draw.ai</span>
          </Link>
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md bg-white text-[12px]" onClick={onNew} title="New" aria-label="New diagram">
            <FileText className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">New</span>
          </Button>
          <Menu
            label="Open"
            icon={<FolderOpen className="h-3.5 w-3.5" />}
            testId="open-menu"
            items={[
              { label: 'Open JSON…', onSelect: onOpen },
              { label: 'Import Mermaid…', onSelect: onImportMermaid },
            ]}
          />
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md bg-white text-[12px]" onClick={onSave} title="Save" aria-label="Save diagram">
            <Save className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">Save</span>
          </Button>
        </div>
        <div className="flex shrink-0 items-center" data-testid="top-nav-right-actions">
          <Menu
            label="Export"
            icon={<Download className="h-3.5 w-3.5" />}
            testId="export-menu"
            align="right"
            items={[
              { label: 'Export SVG', icon: <Download className="h-3.5 w-3.5" />, onSelect: onExportSVG },
              { label: 'Export PNG', icon: <ImageIcon className="h-3.5 w-3.5" />, onSelect: onExportPNG },
              { label: 'Export Mermaid', icon: <Spline className="h-3.5 w-3.5" />, onSelect: onExportMermaid },
            ]}
          />
        </div>
      </div>
    </header>
  )
}

interface MenuItem {
  label: string
  onSelect: () => void
  icon?: React.ReactNode
}

function Menu({
  label,
  icon,
  items,
  testId,
  align = 'left',
}: {
  label: string
  icon?: React.ReactNode
  items: MenuItem[]
  testId?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ left?: number; right?: number; top: number }>({ top: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  // Position the dropdown with `position: fixed` from the trigger rect, so no
  // overflow ancestor can clip it or spawn a scrollbar.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setCoords(align === 'right' ? { right: window.innerWidth - r.right, top: r.bottom + 4 } : { left: r.left, top: r.bottom + 4 })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!btnRef.current?.contains(e.target as globalThis.Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <>
      <Button
        ref={btnRef}
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-md bg-white text-[12px]"
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {icon}
        <span className="max-sm:hidden">{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
      {open && (
        <div
          className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-[#e3ddd2] bg-white py-1 shadow-xl"
          style={{ left: coords.left, right: coords.right, top: coords.top }}
          role="menu"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#2b2722] transition hover:bg-[#f4f2ee]"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function ZoomControls({ bounds }: { bounds: { minX: number; minY: number; maxX: number; maxY: number } }) {
  const zoomBy = useViewportStore((s) => s.zoomBy)
  const reset = useViewportStore((s) => s.reset)
  const fitTo = useViewportStore((s) => s.fitTo)
  const percent = useViewportStore((s) => Math.round((1200 / s.viewBox.width) * 100))

  return (
    <div className="absolute bottom-5 right-[360px] z-30 flex items-center gap-0.5 rounded-xl border border-[#e5ded4] bg-white/90 px-1.5 py-1 shadow-lg shadow-black/5 backdrop-blur max-lg:bottom-[54vh] max-lg:right-2" data-testid="zoom-controls">
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" title="Zoom out" data-testid="zoom-out" onClick={() => zoomBy(1.2)}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <button type="button" className="min-w-[44px] cursor-pointer rounded px-1 text-center text-[12px] tabular-nums text-[#3a352e] hover:bg-[#f4f2ee]" title="Reset zoom" data-testid="zoom-percent" onClick={() => reset()}>
        {percent}%
      </button>
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" title="Zoom in" data-testid="zoom-in" onClick={() => zoomBy(0.8)}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="mx-0.5 h-5 w-px bg-[#ebe5dc]" />
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" title="Fit to content" data-testid="zoom-fit" onClick={() => fitTo(bounds)}>
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function AppIcon() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center transition group-hover:scale-[1.02]">
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="3.5" y="4" width="6.5" height="6.5" rx="2" fill="#34D399" />
        <rect x="14" y="13.5" width="6.5" height="6.5" rx="2" fill="#60A5FA" />
        <path
          d="M10 7.25h2.25a4.5 4.5 0 0 1 4.5 4.5v1.75"
          stroke="#1D1A16"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M13.6 11.8 16.75 14l2.15-3.2" stroke="#1D1A16" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6.75" cy="7.25" r="1.35" fill="#1D1A16" />
        <circle cx="17.25" cy="16.75" r="1.35" fill="#1D1A16" />
      </svg>
    </span>
  )
}

function FloatingToolbar({
  canUndo,
  canRedo,
  hasSelection,
  connectActive,
  onUndo,
  onRedo,
  onToggleConnect,
  onDelete,
  onCopy,
  onPaste,
  onLayout,
  onBringToFront,
  onSendToBack,
}: {
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  connectActive: boolean
  onUndo: () => void
  onRedo: () => void
  onToggleConnect: () => void
  onDelete: () => void
  onCopy: () => void
  onPaste: () => void
  onLayout: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}) {
  const [layersOpen, setLayersOpen] = useState(false)
  const layersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!layersOpen) return
    const onClick = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as globalThis.Node)) setLayersOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [layersOpen])

  return (
    <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-[#e5ded4] bg-white/90 px-2 py-1.5 shadow-lg shadow-black/5 backdrop-blur max-lg:bottom-[54vh] max-lg:left-2 max-lg:right-2 max-lg:translate-x-0 max-lg:overflow-x-auto max-lg:[&>button]:shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Redo (⇧⌘Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <ToolbarDivider />
        <Button
          variant={connectActive ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8 rounded-md"
          title={connectActive ? 'Connector tool (active) — click two nodes' : 'Connector tool — click two nodes to link'}
          aria-pressed={connectActive}
          data-testid="connector-tool"
          onClick={onToggleConnect}
        >
          <Spline className="h-4 w-4" />
        </Button>
        <div className="relative" ref={layersRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            title="Z-order"
            data-testid="layers-button"
            aria-haspopup="menu"
            aria-expanded={layersOpen}
            disabled={!hasSelection}
            onClick={() => setLayersOpen((o) => !o)}
          >
            <Layers3 className="h-4 w-4" />
          </Button>
          {layersOpen && (
            <div className="absolute bottom-10 left-1/2 z-40 min-w-[170px] -translate-x-1/2 overflow-hidden rounded-lg border border-[#e3ddd2] bg-white py-1 shadow-xl" role="menu">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#2b2722] transition hover:bg-[#f4f2ee]"
                onClick={() => { setLayersOpen(false); onBringToFront() }}
              >
                <ArrowUpToLine className="h-3.5 w-3.5" /> Bring to front
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#2b2722] transition hover:bg-[#f4f2ee]"
                onClick={() => { setLayersOpen(false); onSendToBack() }}
              >
                <ArrowDownToLine className="h-3.5 w-3.5" /> Send to back
              </button>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Auto layout" onClick={onLayout} data-testid="auto-layout">
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <ToolbarDivider />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Copy (⌘C)" onClick={onCopy} disabled={!hasSelection}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Paste (⌘V)" onClick={onPaste}>
          <ClipboardPaste className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Delete (⌫)" onClick={onDelete} disabled={!hasSelection}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[#ebe5dc]" />
}
