'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Reasoning({
  isStreaming,
  className,
  ...props
}: React.HTMLAttributes<HTMLDetailsElement> & { isStreaming?: boolean }) {
  return (
    <details
      open={isStreaming}
      className={cn('group rounded-md border border-[#e6e1d8] bg-[#fbfaf7] text-[12px] text-[#5c564d]', className)}
      {...props}
    />
  )
}

export function ReasoningTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <summary className={cn('flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium', className)} {...props}>
      <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      {children || 'Thinking'}
    </summary>
  )
}

export function ReasoningContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-[#eee9df] px-3 py-2 font-mono text-[11px] leading-5', className)} {...props} />
}
