import type { Album, Theory } from './types'
import site from '../content/site.json'
import looseJson from '../content/albums/loose.json'
import { ALBUM_ORDER, toTheories, type TheoryFile } from './lib/theory-data'

/**
 * Весь контент сайта живёт в /content и редактируется через админку (/admin).
 * В коде зафиксированы только список альбомов, их порядок и порядок секций страницы.
 */
export type Site = typeof site
export const SITE: Site = site

type AlbumFile = { title: string; year?: number | string | null; note?: string }

const albumFiles = import.meta.glob<AlbumFile>('../content/albums/*.json', { eager: true, import: 'default' })
const albumFile = (id: string): AlbumFile => albumFiles[`../content/albums/${id}.json`] ?? { title: id }

export const ALBUMS: Album[] = ALBUM_ORDER.map((id) => {
  const a = albumFile(id)
  return { id, title: a.title || id, year: a.year ? Number(a.year) || undefined : undefined, note: a.note ?? '' }
})

/** Категория «вне альбомов»: название и описание тоже из админки. */
export const LOOSE = { title: looseJson.title, note: looseJson.note }

const theoryFiles = import.meta.glob<TheoryFile>('../content/theories/*.json', { eager: true, import: 'default' })

/** Опубликованные теории, отсортированные по накалу. */
export const THEORIES: Theory[] = toTheories(theoryFiles)

/** Главная тема вверху страницы: выбирается в админке, иначе — самая горячая. */
export const FEATURED: Theory | undefined = THEORIES.find((t) => t.id === SITE.hero.featured) ?? THEORIES[0]
