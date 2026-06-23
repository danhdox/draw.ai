'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

interface State {
  hasError: boolean
  message?: string
}

// App-level error boundary so a render exception shows a recovery UI instead of
// a blank white screen.
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Hook for error reporting (e.g. Sentry) in production.
    console.error('Editor crashed:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#fbfaf7] p-6 text-center">
        <div className="text-lg font-semibold text-[#1d1a16]">Something went wrong</div>
        <div className="max-w-md text-sm text-[#746f66]">{this.state.message}</div>
        <p className="max-w-md text-xs text-[#9a9388]">
          Your latest work is autosaved locally and should reload with the editor.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-2">Reload editor</Button>
      </div>
    )
  }
}
