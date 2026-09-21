import { execSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { ALBUM_ORDER, toTheories, type TheoryFile } from './src/lib/theory-data'
import { renderTheoryPage, type SiteText } from './src/ssg/theory-page'
import type { Album } from './src/types'

// Точка в начале — любой поддомен: адрес ngrok меняется при каждом запуске туннеля.
const allowedHosts = ['.ngrok-free.app', '.ngrok.app', '.ngrok.io']

/**
 * Репозиторий, в который админка сохраняет правки.
 * На Vercel берётся из системных переменных сборки, локально — из git remote.
 */
function cmsRepo(): string {
  const { VERCEL_GIT_REPO_OWNER: owner, VERCEL_GIT_REPO_SLUG: slug, CMS_REPO } = process.env
  if (CMS_REPO) return CMS_REPO
  if (owner && slug) return `${owner}/${slug}`
  try {
    const url = execSync('git remote get-url origin', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/)
    if (m) return m[1]
  } catch {
    // remote ещё не настроен — локальный режим админки работает и без него
  }
  return 'owner/kai-angel-theories-web'
}

/** Заголовок и описание страницы для поисковиков и превью ссылок — из content/site.json. */
function siteMeta(): Plugin {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return {
    name: 'site-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (ctx.path.startsWith('/admin')) return html
        const { meta } = JSON.parse(readFileSync(resolve(__dirname, 'content/site.json'), 'utf8'))
        return html.replaceAll('%SITE_TITLE%', esc(meta.title)).replaceAll('%SITE_DESCRIPTION%', esc(meta.description))
      },
    },
  }
}

const readJson = <T,>(path: string): T => JSON.parse(readFileSync(resolve(__dirname, path), 'utf8'))

/**
 * Отдельная статическая страница на каждую теорию: /t/<имя файла>.
 * В dev отдаётся на лету (правки из админки видны сразу), при сборке пишется в dist/t/*.html.
 */
function theoryPages(): Plugin {
  const load = () => {
    const site = readJson<SiteText & { meta: { url?: string } }>('content/site.json')
    const files: Record<string, TheoryFile> = {}
    for (const name of readdirSync(resolve(__dirname, 'content/theories'))) {
      if (name.endsWith('.json')) files[name] = readJson(`content/theories/${name}`)
    }
    const albums: Album[] = ALBUM_ORDER.map((id) => {
      const a = readJson<{ title: string; year?: number | null; note?: string }>(`content/albums/${id}.json`)
      return { id, title: a.title || id, year: a.year ? Number(a.year) || undefined : undefined, note: a.note ?? '' }
    })
    const loose = readJson<{ title: string }>('content/albums/loose.json')
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL
    const siteUrl = (site.meta.url || (prod ? `https://${prod}` : '')).replace(/\/+$/, '')
    return { site, theories: toTheories(files), albums, looseTitle: loose.title, siteUrl }
  }

  const render = (data: ReturnType<typeof load>, slug: string, styles: string) => {
    const theory = data.theories.find((t) => t.slug === slug)
    if (!theory) return null
    const related = data.theories.filter((t) => t.album === theory.album && t !== theory).slice(0, 4)
    return renderTheoryPage({
      theory,
      album: data.albums.find((a) => a.id === theory.album),
      looseTitle: data.looseTitle,
      related,
      site: data.site,
      siteUrl: data.siteUrl,
      styles,
    })
  }

  return {
    name: 'theory-pages',
    configureServer(server) {
      // шаблон страниц импортирован конфигом, поэтому его правки требуют перезапуска dev-сервера
      const templateFiles = ['src/ssg/theory-page.ts', 'src/lib/theory-data.ts', 'src/lib/markdown.ts', 'src/lib/credit.ts'].map((f) =>
        resolve(__dirname, f),
      )
      server.watcher.on('change', (file) => {
        if (templateFiles.includes(file)) server.restart()
      })
      server.middlewares.use((req, res, next) => {
        const m = req.url?.match(/^\/t\/([^/?#]+)\/?(?:[?#].*)?$/)
        if (!m) return next()
        const html = render(load(), decodeURIComponent(m[1]), '<link rel="stylesheet" href="/src/styles.css" />')
        if (!html) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
    },
    generateBundle(_, bundle) {
      const css = Object.values(bundle)
        .filter((f) => f.type === 'asset' && f.fileName.endsWith('.css'))
        .map((f) => `<link rel="stylesheet" href="/${f.fileName}" />`)
        .join('\n    ')
      const data = load()
      for (const t of data.theories) {
        this.emitFile({ type: 'asset', fileName: `t/${t.slug}.html`, source: render(data, t.slug, css)! })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), siteMeta(), theoryPages()],
  define: { __CMS_REPO__: JSON.stringify(cmsRepo()) },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin/index.html') },
    },
  },
  server: { allowedHosts },
  preview: { allowedHosts },
})
