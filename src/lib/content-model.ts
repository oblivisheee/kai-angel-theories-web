import type { Album, Theory } from '../types'
import { ALBUM_ORDER, toTheories, type TheoryFile } from './theory-data.js'

/**
 * Модель контента: сырые JSON-файлы из /content → то, что рисует сайт.
 * Общий код для браузера (главная), функций Vercel (api/) и dev-сервера (vite.config.ts),
 * поэтому импорты с расширением .js и никаких API конкретной среды.
 */

export type SiteJson = typeof import('../../content/site.json')
export type AlbumFile = { title?: string; year?: number | string | null; note?: string }

/** Содержимое папки content как есть: ключи — имена файлов (без пути). */
export interface RawContent {
  site: SiteJson
  albums: Record<string, AlbumFile>
  theories: Record<string, TheoryFile>
}

export interface Content {
  site: SiteJson
  albums: Album[]
  loose: { title: string; note: string }
  /** Опубликованные, по накалу. */
  theories: Theory[]
  /** Главная тема: выбрана в админке, иначе самая горячая. */
  featured?: Theory
}

const baseName = (key: string) => key.split('/').pop()!.replace(/\.json$/, '')

export function buildContent(raw: RawContent): Content {
  const albumById: Record<string, AlbumFile> = {}
  for (const [key, a] of Object.entries(raw.albums)) albumById[baseName(key)] = a

  const albums: Album[] = ALBUM_ORDER.map((id) => {
    const a = albumById[id] ?? {}
    return { id, title: a.title || id, year: a.year ? Number(a.year) || undefined : undefined, note: a.note ?? '' }
  })
  const looseFile = albumById.loose ?? {}
  const theories = toTheories(raw.theories)

  return {
    site: raw.site,
    albums,
    loose: { title: looseFile.title || 'Вне альбомов', note: looseFile.note ?? '' },
    theories,
    featured: theories.find((t) => t.id === raw.site.hero?.featured) ?? theories[0],
  }
}
