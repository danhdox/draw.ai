'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { Diff, DiffSchema } from '@/lib/model/diff'
import { Loader2, Sparkles, Layout, MessageSquare, Check, X } from 'lucide-react'

export function AIPanel() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewDiff, setPreviewDiff] = useState<Diff | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { diagram, selectedNodeIds, applyDiffWithHistory } = useDiagramStore()

  const callAI = async (action: 'generate' | 'cleanup' | 'explain') => {
    setLoading(true)
    setError(null)
    setPreviewDiff(null)
    setExplanation(null)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          prompt: action === 'generate' ? prompt : undefined,
          diagram,
          selectionIds: Array.from(selectedNodeIds),
        }),
      })

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (action === 'explain') {
        setExplanation(data.explanation)
      } else {
        // Validate and set preview diff
        const validated = DiffSchema.safeParse(data.diff)
        if (!validated.success) {
          throw new Error('Invalid diff returned from AI')
        }
        setPreviewDiff(validated.data)
        if (data.explanation) {
          setExplanation(data.explanation)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const acceptDiff = () => {
    if (previewDiff) {
      applyDiffWithHistory(previewDiff)
      setPreviewDiff(null)
      setPrompt('')
      setExplanation(null)
    }
  }

  const rejectDiff = () => {
    setPreviewDiff(null)
    setExplanation(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </CardTitle>
          <CardDescription className="text-xs">
            Generate, clean up, or explain your diagram with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              placeholder="Describe the diagram you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => callAI('generate')}
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Diagram
            </Button>

            <Button
              variant="outline"
              onClick={() => callAI('cleanup')}
              disabled={loading || diagram.nodes.length === 0}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Layout className="h-4 w-4 mr-2" />
              )}
              Clean Up Layout
            </Button>

            <Button
              variant="outline"
              onClick={() => callAI('explain')}
              disabled={loading || diagram.nodes.length === 0}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Explain Diagram
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md">
              {error}
            </div>
          )}

          {explanation && !previewDiff && (
            <Card className="bg-muted">
              <CardContent className="p-4">
                <div className="text-xs font-semibold mb-2">Explanation</div>
                <p className="text-xs whitespace-pre-wrap">{explanation}</p>
              </CardContent>
            </Card>
          )}

          {previewDiff && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="text-xs font-semibold mb-2">Preview Changes</div>
                {explanation && (
                  <p className="text-xs mb-2 text-muted-foreground">{explanation}</p>
                )}
                <div className="text-xs space-y-1 mb-3">
                  {previewDiff.ops.slice(0, 5).map((op, i) => (
                    <div key={i} className="text-muted-foreground">
                      • {op.type}
                      {op.type === 'addNode' && ` ${op.node.type}`}
                      {(op.type === 'updateNode' || op.type === 'removeNode') && ` ${op.id}`}
                    </div>
                  ))}
                  {previewDiff.ops.length > 5 && (
                    <div className="text-muted-foreground">
                      ... and {previewDiff.ops.length - 5} more operations
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={acceptDiff} className="flex-1">
                    <Check className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={rejectDiff} className="flex-1">
                    <X className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
