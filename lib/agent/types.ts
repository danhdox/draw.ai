import type { UIMessage } from 'ai'
import type { Diagram } from '@/lib/model/diagram'
import type { Diff } from '@/lib/model/diff'

export type AgentTraceStatus = 'queued' | 'running' | 'done' | 'error'

export interface AgentTraceData {
  status: AgentTraceStatus
  title: string
  detail?: string
  at: string
}

export interface AgentRunData {
  runId: string
  status: AgentTraceStatus
  model: string
  action: AgentAction
  startedAt: string
  finishedAt?: string
}

export interface AgentDiffData {
  status: 'preview' | 'applied' | 'rejected'
  diff: Diff
  summary: string
}

export interface AgentConsoleData {
  label: string
  value: string
}

export type AgentAction = 'generate' | 'cleanup' | 'explain'

export type AgentDataTypes = {
  run: AgentRunData
  trace: AgentTraceData
  diff: AgentDiffData
  console: AgentConsoleData
}

export type AgentToolTypes = {
  proposeDiagramDiff: {
    input: {
      diff: Diff
      summary?: string
    }
    output: AgentDiffData
  }
}

export type AgentMessage = UIMessage<
  {
    runId?: string
    totalTokens?: number
  },
  AgentDataTypes,
  AgentToolTypes
>

export interface AgentChatRequest {
  messages: AgentMessage[]
  diagram: Diagram
  selectionIds?: string[]
  action?: AgentAction
}
