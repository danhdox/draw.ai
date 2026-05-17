'use client'

import * as React from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function Conversation({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative min-h-0 flex-1 overflow-hidden', className)} {...props} />
}

export function ConversationContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-full overflow-y-auto pr-1', className)} {...props} />
}

export function ConversationScrollButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn('absolute bottom-2 right-2 h-7 w-7 rounded-full border bg-white/90 shadow-sm', className)}
      {...props}
    >
      <ArrowDown className="h-3.5 w-3.5" />
    </Button>
  )
}
