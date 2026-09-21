import { useState } from 'react'
import { SITE } from '../content'
import { ALBUMS, LOOSE } from '../data/albums'
import { byDate } from '../lib/theory-data'
import type { CategoryId, Theory } from '../types'
import { plural } from '../lib/world'
import { AlbumName } from './AlbumName'
import { TheoryRow } from './TheoryRow'

type Filter = 'all' | CategoryId
type Sort = 'heat' | 'new'

interface Section {
  id: CategoryId
  title: string
  year?: number
  note: string
  items: Theory[]
}

interface Props {
  theories: Theory[]
}

export function Archive({ theories }: Props) {
  const t = SITE.archive
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('heat')

  const sorted =
    sort === 'heat' ? theories : [...theories].sort(byDate)

  const sections: Section[] = [
    ...ALBUMS.map((a) => ({
      id: a.id,
      title: a.title,
      year: a.year,
      note: a.note,
      items: sorted.filter((x) => x.album === a.id),
    })),
    {
      id: 'loose' as const,
      title: LOOSE.title,
      note: LOOSE.note,
      items: sorted.filter((x) => x.album === null),
    },
  ]

  const visible = filter === 'all' ? sections : sections.filter((s) => s.id === filter)
  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t.all, count: theories.length },
    ...sections.map((s) => ({ id: s.id, label: s.title, count: s.items.length })),
  ]

  return (
    <section id="archive" className="archive" aria-labelledby="archive-title">
      <div className="wrap">
        <div className="archive__head">
          <h2 id="archive-title" className="h2">{t.title}</h2>
          <div className="sort" role="group" aria-label="Сортировка">
            <button type="button" aria-pressed={sort === 'heat'} onClick={() => setSort('heat')}>{t.sortHeat}</button>
            <button type="button" aria-pressed={sort === 'new'} onClick={() => setSort('new')}>{t.sortNew}</button>
          </div>
        </div>

        <div className="tabs" role="group" aria-label="Категория">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab t-${tab.id === 'all' ? 'loose' : tab.id}`}
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            >
              <span className={tab.id === 'all' || tab.id === 'loose' ? undefined : 'tab__album'}>{tab.label}</span>
              <span className="tab__count">{tab.count}</span>
            </button>
          ))}
        </div>

        {visible.map((s) => (
          <div key={s.id} className={`group t-${s.id}`} data-world={s.id}>
            <div className="group__head">
              {s.id === 'loose' ? (
                <h3 className="group__title group__title--plain">{s.title}</h3>
              ) : (
                <AlbumName as="h3" className="group__title" theme={s.id} text={s.title} />
              )}
              <div className="group__meta">
                {s.year && <span className="group__year">{s.year}</span>}
                <p>{s.note}</p>
                <span className="group__count">
                  {s.items.length} {plural(s.items.length, [t.countOne, t.countFew, t.countMany])}
                </span>
              </div>
            </div>
            {s.items.length === 0 ? (
              <div className="empty">
                <p>{t.empty}</p>
                <a href="#submit" className="btn">{t.emptyCta}</a>
              </div>
            ) : (
              <ul className="rows">
                {s.items.map((item) => (
                  <TheoryRow key={item.id} theory={item} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
