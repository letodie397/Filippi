import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  size?: 'default' | 'narrow'
  className?: string
}

export function PageContainer({
  children,
  size = 'default',
  className = '',
}: PageContainerProps) {
  const width = size === 'narrow' ? 'max-w-3xl' : 'w-full'
  return <div className={`${width} ${className}`}>{children}</div>
}
