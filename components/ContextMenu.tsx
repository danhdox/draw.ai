'use client'

import { useEffect } from 'react'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { useDiagramStore } from '@/lib/store/useDiagramStore'

interface Item {
  label: string
  onClick: () => void
  disabled?: boolean
  shortcut?: string
}

export function ContextMenu() {
  const { open, x, y, target, close } = useContextMenuStore()
  const store = useDiagramStore()

  useEffect(() => {
    if (!open) return
    const onDown = () => close()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onScroll = () => close()
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, close])

  if (!open) return null

  const hasClipboard = !!store.clipboard
  const onAny: Item[] = [
    { label: 'Copy', shortcut: '⌘C', onClick: store.copy },
    { label: 'Duplicate', shortcut: '⌘D', onClick: store.duplicateSelected },
    { label: 'Delete', shortcut: '⌫', onClick: store.deleteSelected },
    { label: 'Bring to front', onClick: store.bringToFront },
    { label: 'Send to back', onClick: store.sendToBack },
  ]
  const nodeExtra: Item[] = [
    { label: 'Group', shortcut: '⌘G', onClick: store.groupSelected },
    { label: 'Ungroup', shortcut: '⇧⌘G', onClick: store.ungroupSelected },
    { label: 'Lock / Unlock', shortcut: '⌘L', onClick: store.toggleLockSelected },
  ]
  const canvasItems: Item[] = [
    { label: 'Paste', shortcut: '⌘V', onClick: store.paste, disabled: !hasClipboard },
    { label: 'Select all', shortcut: '⌘A', onClick: store.selectAll },
  ]

  const items: Item[] =
    target === 'canvas' ? canvasItems : target === 'node' ? [...onAny, ...nodeExtra] : onAny

  // Keep on-screen.
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 200)
  const top = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 9999) - items.length * 30 - 12)

  return (
    <div
      data-testid="context-menu"
      role="menu"
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-[#e3ddd2] bg-white py-1 shadow-xl"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className="flex w-full cursor-pointer items-center justify-between gap-6 px-3 py-1.5 text-left text-[12px] text-[#2b2722] transition hover:bg-[#f4f2ee] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => { close(); item.onClick() }}
        >
          <span>{item.label}</span>
          {item.shortcut && <span className="text-[10px] text-[#9a9388]">{item.shortcut}</span>}
        </button>
      ))}
    </div>
  )
}
