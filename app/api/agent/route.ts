import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { DiagramSchema, generateId } from '@/lib/model/diagram'
import { DiffSchema } from '@/lib/model/diff'
import { runLayout } from '@/lib/layout/layout'

// This route handles AI agent requests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, prompt, diagram, selectionIds } = body

    // Validate input
    if (!action || !['generate', 'cleanup', 'explain'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be generate, cleanup, or explain.' },
        { status: 400 }
      )
    }

    if (action === 'generate' && !prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for generate action' },
        { status: 400 }
      )
    }

    // Handle 'explain' action
    if (action === 'explain') {
      const systemPrompt = `You are an expert at analyzing diagrams. 
Given a diagram with nodes and edges, provide a clear, concise explanation of what it represents.
Focus on the structure, relationships, and purpose of the diagram.`

      const userPrompt = `Analyze this diagram:

Nodes: ${diagram.nodes.map((n: any) => `${n.type} "${n.text}" at (${n.x}, ${n.y})`).join(', ')}
Edges: ${diagram.edges.map((e: any) => `${e.from.nodeId} → ${e.to.nodeId}`).join(', ')}

Provide a clear explanation of what this diagram represents.`

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        maxRetries: 3,
      })

      return NextResponse.json({ explanation: text })
    }

    // Handle 'cleanup' action
    if (action === 'cleanup') {
      // Use our layout function
      const diff = runLayout(diagram, 'hierarchical', selectionIds?.length > 0 ? selectionIds : undefined)
      
      return NextResponse.json({
        diff,
        explanation: 'Applied hierarchical layout to organize nodes.',
      })
    }

    // Handle 'generate' action
    if (action === 'generate') {
      const systemPrompt = `You are a diagram generation expert. Given a user's description, generate a JSON diff that creates a diagram.

The diff must be valid JSON following this exact schema:
{
  "ops": [
    {
      "type": "addNode",
      "node": {
        "id": "node-xxx",
        "type": "rect" | "ellipse" | "diamond" | "text",
        "x": number,
        "y": number,
        "w": number,
        "h": number,
        "text": "string",
        "style": {
          "fill": "#ffffff",
          "stroke": "#000000",
          "strokeWidth": 2
        }
      }
    },
    {
      "type": "addEdge",
      "edge": {
        "id": "edge-xxx",
        "from": { "nodeId": "node-xxx" },
        "to": { "nodeId": "node-yyy" },
        "style": {
          "stroke": "#000000",
          "strokeWidth": 2
        }
      }
    }
  ],
  "summary": "Description of changes"
}

Guidelines:
- Use meaningful node IDs like "node-start", "node-process1", "node-end"
- Position nodes in a logical layout with appropriate spacing (150-200 units apart)
- Use rect for processes, ellipse for start/end states, diamond for decisions
- Add edges to connect related nodes
- Only output valid JSON, no explanations or markdown

Generate a diff for: ${prompt}`

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: systemPrompt,
        maxRetries: 3,
      })

      // Parse and validate the diff
      let diffData
      try {
        // Try to extract JSON from potential markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                          text.match(/(\{[\s\S]*\})/)
        if (jsonMatch) {
          diffData = JSON.parse(jsonMatch[1])
        } else {
          diffData = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', text)
        return NextResponse.json(
          { error: 'Failed to parse AI response as JSON' },
          { status: 500 }
        )
      }

      // Validate the diff
      const validatedDiff = DiffSchema.safeParse(diffData)
      if (!validatedDiff.success) {
        console.error('Invalid diff schema:', validatedDiff.error)
        return NextResponse.json(
          { error: 'AI returned invalid diff format', details: validatedDiff.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        diff: validatedDiff.data,
        explanation: validatedDiff.data.summary || 'Generated diagram from your description.',
      })
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('AI agent error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
