import { create } from 'zustand'

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

const BASE_WIDTH = 1200
const BASE_HEIGHT = 800
// Zoom clamp: 1% .. 1600% relative to the base width.
const MIN_WIDTH = BASE_WIDTH / 16
const MAX_WIDTH = BASE_WIDTH * 16

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface ViewportStore {
  viewBox: ViewBox
  setViewBox: (vb: ViewBox) => void
  panBySvg: (dx: number, dy: number) => void
  zoomBy: (factor: number) => void
  reset: () => void
  fitTo: (bounds: Bounds, padding?: number) => void
  zoomPercent: () => number
}

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
}

export const useViewportStore = create<ViewportStore>((set, get) => ({
  viewBox: { x: 0, y: 0, width: BASE_WIDTH, height: BASE_HEIGHT },

  setViewBox: (viewBox) => set({ viewBox }),

  panBySvg: (dx, dy) =>
    set((s) => ({ viewBox: { ...s.viewBox, x: s.viewBox.x - dx, y: s.viewBox.y - dy } })),

  // Center-anchored zoom (used by toolbar buttons / shortcuts).
  zoomBy: (factor) =>
    set((s) => {
      const width = clampWidth(s.viewBox.width * factor)
      const ratio = width / s.viewBox.width
      const height = s.viewBox.height * ratio
      const cx = s.viewBox.x + s.viewBox.width / 2
      const cy = s.viewBox.y + s.viewBox.height / 2
      return { viewBox: { x: cx - width / 2, y: cy - height / 2, width, height } }
    }),

  reset: () => set({ viewBox: { x: 0, y: 0, width: BASE_WIDTH, height: BASE_HEIGHT } }),

  fitTo: (bounds, padding = 80) => {
    const contentW = Math.max(1, bounds.maxX - bounds.minX)
    const contentH = Math.max(1, bounds.maxY - bounds.minY)
    const aspect = BASE_HEIGHT / BASE_WIDTH
    // Fit content keeping the base aspect ratio.
    let width = Math.max(contentW + padding * 2, (contentH + padding * 2) / aspect)
    width = clampWidth(width)
    const height = width * aspect
    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = (bounds.minY + bounds.maxY) / 2
    set({ viewBox: { x: cx - width / 2, y: cy - height / 2, width, height } })
  },

  zoomPercent: () => Math.round((BASE_WIDTH / get().viewBox.width) * 100),
}))
