import type { ElementType, ReactNode } from 'react'

/** Хромированный блэклеттер — фирменный элемент страницы. */
export function Chrome({ as: Tag = 'span', className = '', children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <Tag className={`chrome ${className}`}>{children}</Tag>
}
