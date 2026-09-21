import type { Album, AlbumId, CategoryId } from '../types'
import { ALBUMS, LOOSE } from '../content'

export { ALBUMS, LOOSE }

export const themeOf = (album: AlbumId | null): CategoryId => album ?? 'loose'

export const albumOf = (id: AlbumId | null): Album | undefined => ALBUMS.find((a) => a.id === id)

export const albumLabel = (a: Album | undefined): string => (a ? (a.year ? `${a.title}, ${a.year}` : a.title) : LOOSE.title)
