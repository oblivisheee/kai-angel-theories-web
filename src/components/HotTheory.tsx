import { SITE } from '../content'
import { albumLabel, albumOf, themeOf } from '../data/albums'
import { formatDate, theoryUrl } from '../lib/theory-data'
import { spotlight } from '../lib/world'
import type { Theory } from '../types'
import { AlbumName } from './AlbumName'
import { Author } from './Author'

interface Props {
  theory: Theory
  runnersUp: Theory[]
}

export function HotTheory({ theory, runnersUp }: Props) {
  const album = albumOf(theory.album)
  const theme = themeOf(theory.album)
  const h = SITE.hero

  return (
    <section id="top" className={`hot t-${theme}`} data-world={theme} aria-labelledby="hot-title">
      <div className="wrap">
        <article className="hot__card world" onPointerMove={spotlight}>
          <AlbumName as="div" className="hot__ghost" theme={theme} text={album ? album.title : SITE.header.wordmark} decorative />

          <div className="hot__body">
            <p className="hot__meta">
              {albumLabel(album)}
              {theory.ref && <> — {theory.ref}</>}
            </p>
            <h1 id="hot-title" className="hot__title">
              <a href={theoryUrl(theory.slug)}>{theory.title}</a>
            </h1>
            <p className="hot__excerpt">{theory.excerpt}</p>

            <div className="hot__foot">
              <a className="btn btn--solid" href={theoryUrl(theory.slug)}>
                {h.read}
              </a>
              <span className="muted">
                <Author name={theory.author} />, {formatDate(theory.date)}
              </span>
            </div>
          </div>
        </article>

        {runnersUp.length > 0 && (
          <div className="hot__next">
            <h2 className="hot__next-title">{h.next}</h2>
            <ul>
              {runnersUp.map((t) => {
                const a = albumOf(t.album)
                const th = themeOf(t.album)
                return (
                  <li key={t.id} className={`t-${th}`}>
                    <a className="next world" href={theoryUrl(t.slug)} onPointerMove={spotlight}>
                      {a ? (
                        <AlbumName theme={th} text={a.title} className="next__album" />
                      ) : (
                        <span className="next__album next__album--plain">{albumLabel(undefined)}</span>
                      )}
                      <span className="next__title">{t.title}</span>
                      <span className="next__by">{formatDate(t.date)}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
