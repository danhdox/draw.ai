import { Diagram, DiagramSchema } from '@/lib/model/diagram'

const STORAGE_KEY = 'draw.ai:diagram'

// Load the autosaved diagram from localStorage, validating it against the
// schema. Returns null if absent, unparseable, or invalid (so a corrupt entry
// can never crash startup).
export function loadDiagram(): Diagram | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = DiagramSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function saveDiagram(diagram: Diagram): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram))
  } catch {
    // Quota or privacy mode — autosave is best-effort.
  }
}

export function clearSavedDiagram(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}
