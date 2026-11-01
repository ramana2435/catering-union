import { HTMLAttributes } from 'react'
import { cn } from '@/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
}

export default function Card({ variant = 'default', className, children, ...props }: CardProps) {
  const variantClasses = {
    default: 'bg-white rounded-xl shadow-sm border border-gray-100',
    outlined: 'bg-white rounded-xl border-2 border-gray-200',
    elevated: 'bg-white rounded-xl shadow-md',
  }
  return (
    <div className={cn(variantClasses[variant], 'p-6', className)} {...props}>
      {children}
    </div>
  )
}
