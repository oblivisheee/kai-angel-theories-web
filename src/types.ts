export type AlbumId = 'angel-may-cry-2' | 'damage' | 'god-system' | 'shh' | 'shh-loud'

/** `loose` — теория не привязана ни к одному альбому. */
export type CategoryId = AlbumId | 'loose'

export interface Album {
  id: AlbumId
  title: string
  /** Не указан — год не показывается. */
  year?: number
  note: string
}

export interface Theory {
  /** Имя файла в content/theories (без .json). */
  id: string
  /** Адрес страницы /t/<slug>: имя файла латиницей, кириллица транслитерируется. */
  slug: string
  title: string
  excerpt: string
  /** Полный разбор в Markdown. */
  body: string
  album: AlbumId | null
  /** Трек или тема, к которой относится теория. */
  ref?: string
  author: string
  /** ISO-дата публикации. */
  date: string
  /** Уровень накала 1–5, задаётся в админке. На сайте не показывается — только задаёт порядок. */
  heat: number
}
