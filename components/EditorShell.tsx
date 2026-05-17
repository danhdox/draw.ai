'use client'

import {
  Copy,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  FolderOpen,
  Grid3x3,
  History,
  Layers3,
  MessageSquare,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Workflow,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Canvas } from '@/components/Canvas'
import { ShapePalette } from '@/components/ShapePalette'
import { InspectorTabs } from '@/components/InspectorTabs'
import { AIPanel } from '@/components/AIPanel'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { DiagramSchema } from '@/lib/model/diagram'
import { downloadBlob } from '@/lib/export/download'
import { downloadSVG } from '@/lib/export/svg'
import { runLayout } from '@/lib/layout/layout'

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
    deleteSelected,
    copy,
    paste,
    setDiagram,
    reset,
    applyDiffWithHistory,
  } = useDiagramStore()

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  const handleNew = () => {
    if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
      reset()
    }
  }

  const handleSave = () => {
    const json = JSON.stringify(diagram, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    downloadBlob(blob, 'diagram.json')
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        try {
          const json = JSON.parse(readerEvent.target?.result as string)
          const validated = DiagramSchema.parse(json)
          setDiagram(validated)
        } catch {
          alert('Invalid diagram file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleAutoLayout = () => {
    const diff = runLayout(diagram, 'hierarchical')
    applyDiffWithHistory(diff)
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#fbfaf7] text-[#1d1a16]">
      <div className="absolute inset-0 z-0">
        <Canvas />
      </div>

      <TopNav
        onExport={() => downloadSVG(diagram)}
        onSave={handleSave}
        onOpen={handleLoad}
        onNew={handleNew}
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
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" title="Design inspector">
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" title="Agent panel">
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
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelected}
        onCopy={copy}
        onPaste={paste}
        onLayout={handleAutoLayout}
      />

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
    </div>
  )
}

function TopNav({
  onExport,
  onSave,
  onOpen,
  onNew,
}: {
  onExport: () => void
  onSave: () => void
  onOpen: () => void
  onNew: () => void
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
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md bg-white text-[12px]" onClick={onNew}>
            <FileText className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">New</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md bg-white text-[12px]" onClick={onOpen}>
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">Open</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md bg-white text-[12px]" onClick={onSave}>
            <Save className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">Save</span>
          </Button>
        </div>
        <div className="flex shrink-0 items-center" data-testid="top-nav-right-actions">
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-md bg-white text-[12px]" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
            <span className="max-sm:hidden">Export</span>
          </Button>
        </div>
      </div>
    </header>
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
  onUndo,
  onRedo,
  onDelete,
  onCopy,
  onPaste,
  onLayout,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onCopy: () => void
  onPaste: () => void
  onLayout: () => void
}) {
  return (
    <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-[#e5ded4] bg-white/90 px-2 py-1.5 shadow-lg shadow-black/5 backdrop-blur max-lg:bottom-[54vh] max-lg:left-2 max-lg:right-2 max-lg:translate-x-0 max-lg:overflow-x-auto max-lg:[&>button]:shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Undo" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Redo" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <ToolbarDivider />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Layers">
          <Layers3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Auto layout" onClick={onLayout}>
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <ToolbarDivider />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Copy" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Paste" onClick={onPaste}>
          <Workflow className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Delete" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[#ebe5dc]" />
}
