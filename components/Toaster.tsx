'use client'

import { useEffect } from 'react'
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'
import { useToastStore, type Toast } from '@/lib/store/useToastStore'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2"
      data-testid="toaster"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  )
}

const STYLES: Record<Toast['variant'], { border: string; icon: React.ReactNode }> = {
  info: { border: 'border-[#cdd6e0]', icon: <Info className="h-4 w-4 text-[#3b82f6]" /> },
  success: { border: 'border-[#bfe3c6]', icon: <CheckCircle2 className="h-4 w-4 text-[#16a34a]" /> },
  error: { border: 'border-[#f0c2c2]', icon: <AlertTriangle className="h-4 w-4 text-[#dc2626]" /> },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4500)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  const style = STYLES[toast.variant]

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border bg-white px-3 py-2 shadow-lg ${style.border}`}
      data-testid={`toast-${toast.variant}`}
    >
      <div className="mt-0.5 shrink-0">{style.icon}</div>
      <div className="min-w-0 flex-1 text-[12px] leading-snug text-[#2b2722]">{toast.message}</div>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-[#9a9388] transition hover:text-[#2b2722]"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
