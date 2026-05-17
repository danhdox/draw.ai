'use client'

import * as React from 'react'
import { Check, Circle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Task({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1', className)} {...props} />
}

export function TaskItem({
  status,
  title,
  detail,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  status: 'queued' | 'running' | 'done' | 'error'
  title: string
  detail?: string
}) {
  const Icon = status === 'done' ? Check : status === 'error' ? X : status === 'running' ? Loader2 : Circle
  return (
    <div className={cn('flex gap-2 rounded-md px-2 py-1.5 text-[12px]', className)} {...props}>
      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', status === 'running' && 'animate-spin', status === 'done' && 'text-[#49a35b]', status === 'error' && 'text-destructive')} />
      <div className="min-w-0">
        <div className="font-medium text-[#302b25]">{title}</div>
        {detail && <div className="truncate text-[11px] text-[#7a746b]">{detail}</div>}
      </div>
    </div>
  )
}
