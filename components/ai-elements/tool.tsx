'use client'

import * as React from 'react'
import { CheckCircle2, Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Tool({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-[#e4ded3] bg-white text-[12px]', className)} {...props} />
}

export function ToolHeader({
  state = 'running',
  name,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { state?: string; name: string }) {
  const done = state.includes('output')
  return (
    <div className={cn('flex items-center gap-2 border-b border-[#eee9df] px-3 py-2 font-medium text-[#302b25]', className)} {...props}>
      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-[#49a35b]" /> : state.includes('input') ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6f49ff]" /> : <Wrench className="h-3.5 w-3.5 text-[#6f49ff]" />}
      <span>{name}</span>
      <span className="ml-auto text-[11px] font-normal text-[#7a746b]">{state}</span>
    </div>
  )
}

export function ToolContent({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  return <pre className={cn('max-h-40 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-5 text-[#5c564d]', className)} {...props} />
}
