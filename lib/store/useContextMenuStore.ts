import { create } from 'zustand'

export type ContextTarget = 'node' | 'edge' | 'canvas'

interface ContextMenuState {
  open: boolean
  x: number
  y: number
  target: ContextTarget
  show: (x: number, y: number, target: ContextTarget) => void
  close: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  open: false,
  x: 0,
  y: 0,
  target: 'canvas',
  show: (x, y, target) => set({ open: true, x, y, target }),
  close: () => set({ open: false }),
}))
