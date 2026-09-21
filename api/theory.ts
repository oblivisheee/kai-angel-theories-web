/// <reference types="node" />
import { buildContent } from '../src/lib/content-model.js'
import { renderTheoryBySlug } from '../src/ssg/theory-page.js'
import { CDN_CACHE, loadContent, sourceHeaders } from './_content.js'

/**
 * GET /t/<slug> (rewrite в vercel.json → /api/theory?slug=<slug>) — страница теории.
 * Готовый HTML для Telegram и режимов чтения, контент — свежий из репозитория.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? ''
  const loaded = await loadContent()
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL
  // стили сайта лежат по постоянному адресу (см. assetFileNames в vite.config.ts)
  const html = renderTheoryBySlug(buildContent(loaded.raw), slug, '<link rel="stylesheet" href="/assets/main.css" />', prod ? `https://${prod}` : '')

  if (!html) {
    return new Response(
      '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Теория не найдена</title><link rel="stylesheet" href="/assets/main.css"><body style="display:grid;place-items:center;min-height:100vh;text-align:center"><div><p class="h2">Теория не найдена</p><p><a class="btn" href="/#archive">Весь архив</a></p></div></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=10' } },
    )
  }
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': loaded.source === 'github' ? CDN_CACHE : 'public, max-age=0, s-maxage=5',
      ...sourceHeaders(loaded),
    },
  })
}
