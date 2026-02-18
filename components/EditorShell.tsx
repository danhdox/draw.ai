'use client'

import { 
  FileText, 
  FolderOpen, 
  Save, 
  Download, 
  Undo2, 
  Redo2, 
  Trash2, 
  Copy, 
  ClipboardPaste,
  Grid3x3,
  Sun,
  Moon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Canvas } from '@/components/Canvas'
import { ShapePalette } from '@/components/ShapePalette'
import { InspectorTabs } from '@/components/InspectorTabs'
import { AIPanel } from '@/components/AIPanel'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { DiagramSchema } from '@/lib/model/diagram'
import { downloadSVG } from '@/lib/export/svg'
import { runLayout } from '@/lib/layout/layout'
import { useTheme } from 'next-themes'

export function EditorShell() {
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

  const { theme, setTheme } = useTheme()

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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          const validated = DiagramSchema.parse(json)
          setDiagram(validated)
        } catch (error) {
          alert('Invalid diagram file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleExportSVG = () => {
    downloadSVG(diagram)
  }

  const handleAutoLayout = () => {
    const diff = runLayout(diagram, 'hierarchical')
    applyDiffWithHistory(diff)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top Menu Bar */}
      <div className="h-14 bg-background border-b flex items-center px-4 gap-2">
        <div className="font-bold text-lg mr-4">draw.ai</div>
        
        {/* File Menu */}
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleNew}>
            <FileText className="h-4 w-4 mr-2" />
            New
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLoad}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportSVG}>
            <Download className="h-4 w-4 mr-2" />
            Export SVG
          </Button>
        </div>

        <div className="border-l h-8 mx-2" />

        {/* Edit Menu */}
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={undo} 
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={redo} 
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={deleteSelected}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={copy}
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={paste}
            title="Paste"
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-l h-8 mx-2" />

        {/* View Menu */}
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleAutoLayout}
            title="Auto Layout"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Layout
          </Button>
        </div>

        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Palette */}
        <ShapePalette />

        {/* Center Canvas */}
        <div className="flex-1">
          <Canvas />
        </div>

        {/* Right Inspector with AI Panel */}
        <div className="w-80 bg-background border-l overflow-y-auto">
          <div className="p-4">
            <AIPanel />
          </div>
          <div className="border-t">
            <InspectorTabs />
          </div>
        </div>
      </div>
    </div>
  )
}
