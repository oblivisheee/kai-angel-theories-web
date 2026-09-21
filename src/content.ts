import type { Album, Theory } from './types'
import site from '../content/site.json'
import { buildContent, type AlbumFile, type RawContent, type SiteJson } from './lib/content-model'
import type { TheoryFile } from './lib/theory-data'

/**
 * Весь контент сайта живёт в /content и редактируется через админку (/admin).
 * В сборку он зашит как запасной вариант; в продакшене main.tsx до первого рендера
 * подменяет его свежим из /api/content (читает репозиторий), поэтому правки видны без пересборки.
 * В коде зафиксированы только список альбомов, их порядок и порядок секций страницы.
 */
export type Site = SiteJson

const bundled: RawContent = {
  site,
  albums: import.meta.glob<AlbumFile>('../content/albums/*.json', { eager: true, import: 'default' }),
  theories: import.meta.glob<TheoryFile>('../content/theories/*.json', { eager: true, import: 'default' }),
}

// live bindings: компоненты читают значения при рендере, поэтому setContent до рендера подменяет всё
export let SITE: Site
export let ALBUMS: Album[]
/** Категория «вне альбомов»: название и описание тоже из админки. */
export let LOOSE: { title: string; note: string }
/** Опубликованные теории, отсортированные по накалу. */
export let THEORIES: Theory[]
/** Главная тема вверху страницы: выбирается в админке, иначе — самая горячая. */
export let FEATURED: Theory | undefined

export function setContent(raw: RawContent) {
  const c = buildContent(raw)
  SITE = c.site
  ALBUMS = c.albums
  LOOSE = c.loose
  THEORIES = c.theories
  FEATURED = c.featured
}

setContent(bundled)
