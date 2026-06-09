import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  size?: 'default' | 'narrow'
  className?: string
}

const sizes = {
  default: 'max-w-5xl',
  narrow: 'max-w-2xl',
}

export function PageContainer({
  children,
  size = 'default',
  className = '',
}: PageContainerProps) {
  return (
    <div className={`mx-auto w-full ${sizes[size]} ${className}`}>{children}</div>
  )
}
