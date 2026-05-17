import { create } from 'zustand'
import { AgentDiffData, AgentRunData, AgentTraceData } from '@/lib/agent/types'

export interface AgentStore {
  runs: AgentRunData[]
  traces: AgentTraceData[]
  activeDiff: AgentDiffData | null
  setRuns: (runs: AgentRunData[]) => void
  setTraces: (traces: AgentTraceData[]) => void
  setActiveDiff: (diff: AgentDiffData | null) => void
  clear: () => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  runs: [],
  traces: [],
  activeDiff: null,
  setRuns: (runs) => set({ runs }),
  setTraces: (traces) => set({ traces }),
  setActiveDiff: (activeDiff) => set({ activeDiff }),
  clear: () => set({ runs: [], traces: [], activeDiff: null }),
}))
