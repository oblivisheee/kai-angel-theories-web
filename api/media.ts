/// <reference types="node" />
import { repoInfo } from './_content.js'

/**
 * GET /media/<путь> для картинок, загруженных через админку после последней сборки:
 * файлы из сборки Vercel отдаёт сам, а новых ещё нет в деплое — берём их из репозитория.
 */
const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif',
  gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
}

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? ''
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (!path || path.includes('..') || !TYPES[ext]) return new Response('Not found', { status: 404 })

  const { owner, name, branch, token } = repoInfo()
  const file = path.split('/').map(encodeURIComponent).join('/')
  // публичный репозиторий — raw без токена; приватный — через API с GITHUB_CONTENT_TOKEN
  const res = token
    ? await fetch(`https://api.github.com/repos/${owner}/${name}/contents/public/media/${file}?ref=${encodeURIComponent(branch)}`, {
        headers: { Authorization: `bearer ${token}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'kai-angel-archive' },
      })
    : await fetch(`https://raw.githubusercontent.com/${owner}/${name}/${encodeURIComponent(branch)}/public/media/${file}`)
  if (!res.ok) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, s-maxage=10' } })

  return new Response(res.body, {
    headers: {
      'Content-Type': TYPES[ext],
      // svg из репозитория не должен исполнять скрипты
      ...(ext === 'svg' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=31536000',
    },
  })
}
