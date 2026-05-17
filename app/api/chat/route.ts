import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  tool,
  type UIMessageStreamWriter,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { DiagramSchema } from '@/lib/model/diagram'
import { Diff } from '@/lib/model/diff'
import { runLayout } from '@/lib/layout/layout'
import {
  actionLabel,
  coerceDiffProposal,
  createFallbackDiagramDiff,
  getLastUserText,
  summarizeDiff,
} from '@/lib/agent/diagramAgent'
import { AgentChatRequest, AgentMessage } from '@/lib/agent/types'

export const maxDuration = 30

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export async function POST(req: Request) {
  const body = (await req.json()) as AgentChatRequest
  const parsedDiagram = DiagramSchema.safeParse(body.diagram)

  if (!parsedDiagram.success) {
    return Response.json({ error: 'Invalid diagram payload' }, { status: 400 })
  }

  const messages = body.messages ?? []
  const diagram = parsedDiagram.data
  const action = body.action ?? 'generate'
  const selectionIds = body.selectionIds ?? []
  const runId = `run-${Date.now()}`
  const prompt = getLastUserText(messages)
  const startedAt = new Date().toISOString()

  const stream = createUIMessageStream<AgentMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      writer.write({
        type: 'data-run',
        id: runId,
        data: {
          runId,
          status: 'running',
          model: MODEL,
          action,
          startedAt,
        },
      })
      writer.write({
        type: 'data-trace',
        id: `${runId}-context`,
        data: {
          status: 'done',
          title: 'Read canvas context',
          detail: `${diagram.nodes.length} nodes, ${diagram.edges.length} edges, ${selectionIds.length} selected`,
          at: new Date().toISOString(),
        },
      })

      if (action === 'cleanup') {
        const diff = runLayout(diagram, 'hierarchical', selectionIds.length > 0 ? selectionIds : undefined)
        writeDiffPreview(writer, runId, diff, diff.summary || 'Organized the diagram layout.')
        writeAssistantText(writer, runId, `Prepared a layout cleanup: ${summarizeDiff(diff)}.`)
        writeDone(writer, runId, action, startedAt)
        return
      }

      if (!process.env.OPENAI_API_KEY) {
        const diff = action === 'generate' ? createFallbackDiagramDiff(prompt, diagram) : { ops: [], summary: 'Diagram explanation requires OPENAI_API_KEY.' }
        writer.write({
          type: 'data-trace',
          id: `${runId}-fallback`,
          data: {
            status: 'done',
            title: 'Used local fallback',
            detail: 'OPENAI_API_KEY is not available in the server environment.',
            at: new Date().toISOString(),
          },
        })
        if (action === 'generate') {
          writeDiffPreview(writer, runId, diff, diff.summary || 'Generated a draft diagram.')
          writeAssistantText(writer, runId, `Generated a local draft while the API key is unavailable: ${summarizeDiff(diff)}.`)
        } else {
          writeAssistantText(writer, runId, 'AI explanation is ready to run once OPENAI_API_KEY is available.')
        }
        writeDone(writer, runId, action, startedAt)
        return
      }

      writer.write({
        type: 'data-trace',
        id: `${runId}-model`,
        data: {
          status: 'running',
          title: 'Streaming model run',
          detail: actionLabel(action),
          at: new Date().toISOString(),
        },
      })

      const result = streamText({
        model: openai(MODEL),
        system: buildSystemPrompt(action, diagram),
        messages: await convertToModelMessages(messages),
        stopWhen: stepCountIs(2),
        tools: {
          proposeDiagramDiff: tool({
            description: 'Return a validated diagram diff proposal for the current canvas.',
            inputSchema: z.object({
              diff: z.unknown().describe('A draw.ai Diff JSON object with an ops array and optional summary.'),
              summary: z.string().optional(),
            }),
            execute: async ({ diff, summary }) => {
              const parsed = coerceDiffProposal(diff)
              if (!parsed) {
                throw new Error('The proposed diagram diff did not match the draw.ai diff schema.')
              }

              return {
                status: 'preview' as const,
                diff: parsed,
                summary: summary || parsed.summary || summarizeDiff(parsed),
              }
            },
          }),
        },
        toolChoice: action === 'generate' ? { type: 'tool', toolName: 'proposeDiagramDiff' } : 'none',
      })

      writer.merge(
        result.toUIMessageStream<AgentMessage>({
          sendReasoning: true,
          onFinish: ({ responseMessage }) => {
            const diffPart = responseMessage.parts.find(
              (part) => part.type === 'tool-proposeDiagramDiff' && part.state === 'output-available'
            )
            if (diffPart && diffPart.output) {
              writer.write({
                type: 'data-diff',
                id: `${runId}-diff`,
                data: diffPart.output,
              })
            }
            writeDone(writer, runId, action, startedAt)
          },
        })
      )
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function buildSystemPrompt(action: string, diagram: unknown): string {
  return `You are a diagram-building agent inside draw.ai.

Current diagram JSON:
${JSON.stringify(diagram)}

When asked to generate or revise a diagram, use the proposeDiagramDiff tool exactly once.
The diff must use this operation model: addNode, updateNode, removeNode, addEdge, updateEdge, removeEdge, group, ungroup, setMeta.
Use rect for process nodes, ellipse for starts/ends, diamond for decisions, and clear concise text labels.
After the tool result, respond with a short plain-English summary of the proposed change.
For explain actions, do not call tools. Explain the current diagram clearly and briefly.
Current action: ${action}.`
}

function writeDiffPreview(
  writer: UIMessageStreamWriter<AgentMessage>,
  runId: string,
  diff: Diff,
  summary: string
) {
  writer.write({
    type: 'data-trace',
    id: `${runId}-diff-trace`,
    data: {
      status: 'done',
      title: 'Prepared diff preview',
      detail: summarizeDiff(diff),
      at: new Date().toISOString(),
    },
  })
  writer.write({
    type: 'data-diff',
    id: `${runId}-diff`,
    data: {
      status: 'preview',
      diff,
      summary,
    },
  })
}

function writeAssistantText(
  writer: UIMessageStreamWriter<AgentMessage>,
  runId: string,
  text: string
) {
  const textId = `${runId}-text`
  writer.write({ type: 'text-start', id: textId })
  writer.write({ type: 'text-delta', id: textId, delta: text })
  writer.write({ type: 'text-end', id: textId })
}

function writeDone(
  writer: UIMessageStreamWriter<AgentMessage>,
  runId: string,
  action: AgentChatRequest['action'],
  startedAt: string
) {
  writer.write({
    type: 'data-run',
    id: runId,
    data: {
      runId,
      status: 'done',
      model: MODEL,
      action: action ?? 'generate',
      startedAt,
      finishedAt: new Date().toISOString(),
    },
  })
}
