'use client'

import * as React from 'react'
import { Streamdown, type StreamdownProps } from 'streamdown'
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

export function MessageResponse({ className, ...props }: StreamdownProps) {
  return (
    <Streamdown
      className={cn('prose prose-sm max-w-none text-[13px] leading-5 prose-p:my-1 prose-pre:rounded-md', className)}
      parseIncompleteMarkdown
      {...props}
    />
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
