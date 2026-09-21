/// <reference types="node" />
import { CDN_CACHE, loadContent } from './_content.js'

/** GET /api/content — весь контент из репозитория для главной страницы. */
export async function GET() {
  const { raw, source } = await loadContent()
  return new Response(JSON.stringify(raw), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': CDN_CACHE, 'X-Content-Source': source },
  })
}
