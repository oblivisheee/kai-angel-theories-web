import type { ElementType, ReactNode } from 'react'
import type { CategoryId } from '../types'

interface Props {
  theme: CategoryId
  text: string
  as?: ElementType
  className?: string
  /** Декоративная копия названия — скрыть от скринридеров. */
  decorative?: boolean
}

/**
 * Название альбома в его собственной стилистике (шрифт и заливка задаются темой `t-*`).
 * data-text нужен damage: трещина рисуется двумя псевдо-слоями с копией текста.
 */
export function AlbumName({ theme, text, as: Tag = 'span', className = '', decorative }: Props): ReactNode {
  return (
    <Tag className={`album-name album-name--${theme} ${className}`} data-text={text} aria-hidden={decorative || undefined}>
      {text}
    </Tag>
  )
}
