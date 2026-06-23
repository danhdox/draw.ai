import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    }

    const sizeStyles = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    }

    return (
      <button
        className={cn(
          'inline-flex cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
