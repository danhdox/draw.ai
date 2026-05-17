'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function ChainOfThought({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2 rounded-md border border-[#e6e1d8] bg-[#fbfaf7] p-2', className)} {...props} />
}
