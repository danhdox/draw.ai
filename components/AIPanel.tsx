'use client'

import { Fragment, startTransition, useEffect, useState } from 'react'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import { Check, Copy, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store/useDiagramStore'
import { useAgentStore } from '@/lib/store/useAgentStore'
import { AgentDiffData, AgentMessage, AgentRunData, AgentTraceData } from '@/lib/agent/types'
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { PromptInput, PromptInputSubmit, PromptInputTextarea, type PromptInputMessage } from '@/components/ai-elements/prompt-input'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning'
import { Tool, ToolContent, ToolHeader } from '@/components/ai-elements/tool'
import { ChainOfThought } from '@/components/ai-elements/chain-of-thought'
import { Task, TaskItem } from '@/components/ai-elements/task'
import { summarizeDiff } from '@/lib/agent/diagramAgent'

const chatTransport = new DefaultChatTransport<AgentMessage>({ api: '/api/chat' })

type AgentPanelView = 'current' | 'history'

type ChatHistoryItem = {
  id: string
  title: string
  preview: string
  at: string
  messageCount: number
  messages: AgentMessage[]
}

export function AIPanel({
  view: controlledView,
  onViewChange,
}: {
  view?: AgentPanelView
  onViewChange?: (view: AgentPanelView) => void
}) {
  const [internalView, setInternalView] = useState<AgentPanelView>('current')
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const { diagram, selectedNodeIds, applyDiffWithHistory } = useDiagramStore()
  const { activeDiff, setActiveDiff, setRuns, setTraces } = useAgentStore()
  const view = controlledView ?? internalView
  const setView = onViewChange ?? setInternalView

  const { messages, sendMessage, status, error } = useChat<AgentMessage>({
    transport: chatTransport,
  })

  useEffect(() => {
    const runs = new Map<string, AgentRunData>()
    const traces = new Map<string, AgentTraceData>()
    let latestDiff: AgentDiffData | null = null

    for (const message of messages) {
      if (message.role !== 'assistant') continue

      for (const part of message.parts) {
        if (part.type === 'data-run') {
          runs.set(part.id || part.data.runId, part.data)
        }

        if (part.type === 'data-trace') {
          traces.set(part.id || `${part.data.title}-${part.data.at}`, part.data)
        }

        if (part.type === 'data-diff') {
          latestDiff = part.data
        }

        if (part.type === 'tool-proposeDiagramDiff' && part.state === 'output-available') {
          latestDiff = part.output
        }
      }
    }

    startTransition(() => {
      setRuns(Array.from(runs.values()))
      setTraces(Array.from(traces.values()))
      setActiveDiff(latestDiff)
    })
  }, [messages, setActiveDiff, setRuns, setTraces])

  useEffect(() => {
    const isBusy = status === 'submitted' || status === 'streaming'
    const lastMessage = messages.at(-1)
    if (isBusy || !lastMessage || lastMessage.role !== 'assistant') return

    const userMessage = [...messages].reverse().find((message) => message.role === 'user')
    const assistantText = extractText(lastMessage).trim()
    const userText = userMessage ? extractText(userMessage).trim() : ''

    setChatHistory((currentHistory) => {
      if (currentHistory.some((item) => item.id === lastMessage.id)) {
        return currentHistory
      }

      const item: ChatHistoryItem = {
        id: lastMessage.id,
        title: truncateText(userText || 'Diagram chat', 64),
        preview: truncateText(assistantText || 'Diagram update ready', 96),
        at: new Date().toISOString(),
        messageCount: messages.length,
        messages,
      }

      return [item, ...currentHistory].slice(0, 8)
    })
  }, [messages, status])

  const submit = (message: PromptInputMessage) => {
    const text = message.text.trim()
    if (!text) return
    setView('current')

    sendMessage(
      { text },
      {
        body: {
          diagram,
          selectionIds: Array.from(selectedNodeIds),
          action: 'generate',
        },
      }
    )
  }

  const acceptDiff = () => {
    if (!activeDiff) return
    applyDiffWithHistory(activeDiff.diff)
    setActiveDiff({ ...activeDiff, status: 'applied' })
  }

  const rejectDiff = () => {
    if (!activeDiff) return
    setActiveDiff({ ...activeDiff, status: 'rejected' })
  }

  const isBusy = status === 'submitted' || status === 'streaming'
  const selectedHistory = chatHistory.find((item) => item.id === selectedHistoryId) ?? chatHistory[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3" data-testid="agent-panel">
      {view === 'current' ? (
        <>
          <Conversation className="min-h-[220px]">
            <ConversationContent className="p-3">
              {messages.length === 0 && (
                <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center text-[12px] text-[#746f66]">
                  <div className="font-medium text-[#302b25]">Ready to build</div>
                  <div>Describe a diagram or change.</div>
                </div>
              )}

              {messages.map((message, messageIndex) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent className={message.role === 'user' ? 'border-[#111] bg-[#111] text-white' : ''}>
                    {message.parts.map((part, partIndex) => (
                      <Fragment key={`${message.id}-${partIndex}`}>
                        {part.type === 'text' && <MessageResponse>{part.text}</MessageResponse>}
                        {part.type === 'reasoning' && (
                          <Reasoning isStreaming={messageIndex === messages.length - 1 && isBusy}>
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        )}
                        {part.type === 'data-trace' && (
                          <ChainOfThought className="my-2">
                            <Task>
                              <TaskItem status={part.data.status} title={part.data.title} detail={part.data.detail} />
                            </Task>
                          </ChainOfThought>
                        )}
                        {part.type === 'data-diff' && <DiffPreview diff={part.data} onAccept={acceptDiff} onReject={rejectDiff} />}
                        {part.type === 'tool-proposeDiagramDiff' && (
                          <Tool className="my-2">
                            <ToolHeader name="proposeDiagramDiff" state={part.state} />
                            <ToolContent>
                              {JSON.stringify(part.state === 'output-available' ? part.output : part.input, null, 2)}
                            </ToolContent>
                          </Tool>
                        )}
                      </Fragment>
                    ))}
                    {message.role === 'assistant' && messageIndex === messages.length - 1 && (
                      <MessageActions>
                        <MessageAction label="Copy" onClick={() => navigator.clipboard.writeText(extractText(message))}>
                          <Copy className="h-3.5 w-3.5" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {error && <div className="rounded-md bg-destructive/10 p-2 text-[12px] text-destructive">{error.message}</div>}
            </ConversationContent>
          </Conversation>

          {activeDiff && <DiffPreview diff={activeDiff} onAccept={acceptDiff} onReject={rejectDiff} compact />}

          <PromptInput onSubmit={submit} data-testid="agent-prompt-form">
            <PromptInputTextarea
              data-testid="agent-prompt"
              placeholder="Describe a diagram or edit..."
              disabled={isBusy}
            />
            <PromptInputSubmit data-testid="agent-submit" status={isBusy ? 'streaming' : 'ready'} disabled={isBusy} className="absolute bottom-3 right-3" />
          </PromptInput>
        </>
      ) : (
        <ChatHistoryPanel
          history={chatHistory}
          selectedHistory={selectedHistory}
          onSelect={(item) => setSelectedHistoryId(item.id)}
        />
      )}
    </div>
  )
}

function ChatHistoryPanel({
  history,
  selectedHistory,
  onSelect,
}: {
  history: ChatHistoryItem[]
  selectedHistory?: ChatHistoryItem
  onSelect: (item: ChatHistoryItem) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-[#e8e1d7] bg-[#fbfaf8] p-3" data-testid="agent-history-panel">
      {history.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-[12px] text-[#746f66]">
          <div className="font-medium text-[#302b25]">No chat history yet</div>
          <div>Completed diagram chats will appear here.</div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-md border p-2 text-left transition ${selectedHistory?.id === item.id ? 'border-[#6f49ff] bg-white' : 'border-[#e8e1d7] bg-white/70 hover:bg-white'}`}
                onClick={() => onSelect(item)}
              >
                <div className="truncate text-[12px] font-semibold text-[#2b2722]">{item.title}</div>
                <div className="truncate text-[11px] text-[#746f66]">{item.preview}</div>
                <div className="mt-1 text-[10px] text-[#9a9388]">{item.messageCount} messages · {formatHistoryTime(item.at)}</div>
              </button>
            ))}
          </div>

          {selectedHistory && (
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[#e8e1d7] bg-white p-2">
              {selectedHistory.messages.map((message) => (
                <div key={message.id} className="mb-2 rounded-md bg-[#f7f5f0] p-2">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-[#8a8378]">{message.role}</div>
                  <div className="whitespace-pre-wrap text-[11px] leading-4 text-[#3a352e]">{extractText(message) || 'Structured update'}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DiffPreview({
  diff,
  onAccept,
  onReject,
  compact = false,
}: {
  diff: AgentDiffData
  onAccept: () => void
  onReject: () => void
  compact?: boolean
}) {
  return (
    <div className="rounded-lg border border-[#ded8ce] bg-white p-3 shadow-sm" data-testid={compact ? 'agent-diff-sticky' : 'agent-diff-preview'}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#efeaff] text-[#6f49ff]">
          <Play className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-[#25211c]">{diff.summary}</div>
          <div className="text-[11px] text-[#756f66]">{summarizeDiff(diff.diff)}</div>
        </div>
      </div>
      {!compact && (
        <div className="mb-2 max-h-24 overflow-auto rounded-md bg-[#f7f5f0] p-2 font-mono text-[11px] text-[#5f594f]">
          {diff.diff.ops.slice(0, 6).map((op, index) => (
            <div key={index}>{op.type}</div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button data-testid="agent-diff-apply" size="sm" className="h-8 flex-1 gap-1 rounded-md bg-[#111] text-[12px] hover:bg-[#2a2a2a]" onClick={onAccept} disabled={diff.status === 'applied'}>
          <Check className="h-3.5 w-3.5" />
          {diff.status === 'applied' ? 'Applied' : 'Apply'}
        </Button>
        <Button data-testid="agent-diff-reject" size="sm" variant="outline" className="h-8 flex-1 gap-1 rounded-md text-[12px]" onClick={onReject} disabled={diff.status === 'rejected'}>
          <X className="h-3.5 w-3.5" />
          {diff.status === 'rejected' ? 'Rejected' : 'Reject'}
        </Button>
      </div>
    </div>
  )
}

function extractText(message: AgentMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function formatHistoryTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
