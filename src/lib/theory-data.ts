import type { AlbumId, Theory } from '../types'

/**
 * Приведение файлов content/theories к Theory. Общий код для сайта (import.meta.glob)
 * и сборщика страниц теорий (vite.config.ts), поэтому здесь нет ничего специфичного для Vite.
 */

/** Порядок альбомов на сайте — от новых к старым. Стиль каждого задан темой t-* в styles.css. */
export const ALBUM_ORDER: AlbumId[] = ['shh-loud', 'shh', 'damage']

export type TheoryFile = Partial<Omit<Theory, 'id' | 'album' | 'heat'>> & {
  album?: string | null
  heat?: number | string
  published?: boolean
}

const isAlbum = (v: unknown): v is AlbumId => ALBUM_ORDER.includes(v as AlbumId)

export const theoryId = (path: string) => path.split('/').pop()!.replace(/\.json$/, '')

const RU: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
}

/** «Лучший альбом?» → «luchshiy-albom»: адреса страниц всегда латиницей. */
export function transliterate(s: string): string {
  return (
    // сначала кириллица (NFC, иначе «й» распадётся на «и» + бреве), потом снимаем латинские диакритики
    [...s.toLowerCase().normalize('NFC')]
      .map((ch) => RU[ch] ?? ch)
      .join('')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'theory'
  )
}

export function toTheories(files: Record<string, TheoryFile>): Theory[] {
  const taken = new Set<string>()
  // одинаковая транслитерация у разных файлов — добавляем номер, чтобы адреса не совпали
  const uniqueSlug = (id: string) => {
    const base = transliterate(id)
    let slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    taken.add(slug)
    return slug
  }

  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, t]) => t.published !== false)
    .map(([path, t]) => ({
      id: theoryId(path),
      slug: uniqueSlug(theoryId(path)),
      title: t.title ?? '',
      excerpt: t.excerpt ?? '',
      body: t.body ?? '',
      // пустое или неизвестное значение — теория «вне альбомов»
      album: isAlbum(t.album) ? t.album : null,
      ref: t.ref || undefined,
      author: t.author ?? '',
      date: t.date ?? '',
      heat: Math.min(100, Math.max(0, Number(t.heat) || 0)),
    }))
    .sort(byHeat)
}

/** По накалу, при равном — более свежие выше. */
export const byHeat = (a: Theory, b: Theory) => b.heat - a.heat || b.date.localeCompare(a.date)

export const byDate = (a: Theory, b: Theory) => b.date.localeCompare(a.date)

export const theoryUrl = (slug: string) => `/t/${slug}`

/** Ссылка на автора в Telegram, если поле «Автор» — настоящий юзернейм (5–32 символа). @anon ссылкой не станет. */
export function authorUrl(author: string): string | undefined {
  const m = author.trim().match(/^@?([a-zA-Z][a-zA-Z0-9_]{4,31})$/)
  return m ? `https://t.me/${m[1]}` : undefined
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
