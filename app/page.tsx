'use client'

import { EditorShell } from '@/components/EditorShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Home() {
  return (
    <ErrorBoundary>
      <EditorShell />
    </ErrorBoundary>
  )
}
