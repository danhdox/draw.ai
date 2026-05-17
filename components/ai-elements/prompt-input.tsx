'use client'

import * as React from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface PromptInputMessage {
  text: string
}

export function PromptInput({
  onSubmit,
  className,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit: (message: PromptInputMessage) => void
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const textarea = form.elements.namedItem('prompt') as HTMLTextAreaElement | null
    const text = textarea?.value ?? ''
    onSubmit({ text })

    if (text.trim()) {
      form.reset()
    }
  }

  return <form className={cn('relative', className)} onSubmit={handleSubmit} {...props} />
}

export function PromptInputTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      name="prompt"
      className={cn(
        'min-h-[88px] w-full resize-none rounded-lg border border-[#ded8cd] bg-white px-4 py-3 pb-12 pr-14 text-[13px] leading-5 outline-none transition focus:border-[#826df4] focus:ring-2 focus:ring-[#826df4]/15',
        className
      )}
      {...props}
    />
  )
}

export function PromptInputSubmit({
  status,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { status?: 'ready' | 'submitted' | 'streaming' }) {
  const isStreaming = status === 'submitted' || status === 'streaming'
  return (
    <Button type="submit" size="icon" className={cn('h-9 w-9 rounded-lg bg-[#6f49ff] shadow-sm hover:bg-[#5f3ce7]', className)} {...props}>
      {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
    </Button>
  )
}
