'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { UIMessage } from 'ai'

export function Message({
  from,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { from?: UIMessage['role'] }) {
  return (
    <div
      className={cn(
        'flex w-full py-2',
        from === 'user' ? 'justify-end' : 'justify-start',
        className
      )}
      data-role={from}
      {...props}
    />
  )
}

export function MessageContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'max-w-[92%] rounded-lg border border-[#e6e1d8] bg-white px-3 py-2 text-[13px] leading-5 text-[#27231f] shadow-sm',
        'data-[role=user]:bg-[#111111] data-[role=user]:text-white',
        className
      )}
      {...props}
    />
  )
}

// Plain, dependency-free text renderer. (Previously used `streamdown`, which
// pulled in mermaid + dompurify — removed to drop the vulnerable transitive
// chain and shrink the bundle. AI responses render as wrapped plain text.)
export function MessageResponse({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('whitespace-pre-wrap break-words text-[13px] leading-5', className)}>
      {children}
    </div>
  )
}

export function MessageActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-1 flex items-center gap-1', className)} {...props} />
}

export function MessageAction({ className, label, ...props }: React.ComponentProps<typeof Button> & { label?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" title={label} className={cn('h-7 w-7', className)} {...props} />
  )
}
