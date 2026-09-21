/// <reference types="node" />
import { CDN_CACHE, loadContent, sourceHeaders } from './_content.js'

/** GET /api/content — весь контент из репозитория для главной страницы. */
export async function GET() {
  const loaded = await loadContent()
  return new Response(JSON.stringify(loaded.raw), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // не смогли прочитать GitHub — не держим устаревший ответ в кэше долго
      'Cache-Control': loaded.source === 'github' ? CDN_CACHE : 'public, max-age=0, s-maxage=5',
      ...sourceHeaders(loaded),
    },
  })
}
