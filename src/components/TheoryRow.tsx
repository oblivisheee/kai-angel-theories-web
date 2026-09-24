import { formatDate, theoryUrl } from '../lib/theory-data'
import type { Theory } from '../types'
import { Author } from './Author'

/**
 * Вся строка кликабельна через растянутую ссылку заголовка (.row__link::after),
 * а ссылка на автора лежит поверх неё — вложить одну <a> в другую нельзя.
 */
export function TheoryRow({ theory }: { theory: Theory }) {
  return (
    <li className="row">
      <div className="row__btn">
        <span className="row__ref">{theory.ref}</span>
        <span className="row__main">
          <a className="row__link" href={theoryUrl(theory.slug)}>
            {/* data-text: копии заголовка в псевдослоях — из них собран отклик на наведение у некоторых альбомов */}
            <span className="row__title" data-text={theory.title}>
              {theory.title}
            </span>
          </a>
          <span className="row__excerpt">{theory.excerpt}</span>
          <span className="row__by">
            <Author name={theory.author} />, {formatDate(theory.date)}
          </span>
        </span>
      </div>
    </li>
  )
}
