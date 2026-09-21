import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildContent } from './src/lib/content-model'
import { readLocalContent } from './src/lib/content-fs'
import { renderTheoryBySlug } from './src/ssg/theory-page'

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

/**
 * Ветка, в которую админка сохраняет правки: та, из которой Vercel собирает сайт
 * (production-деплой идёт из основной ветки), локально — текущая ветка git.
 */
function cmsBranch(): string {
  if (process.env.CMS_BRANCH) return process.env.CMS_BRANCH
  if (process.env.VERCEL_GIT_COMMIT_REF) return process.env.VERCEL_GIT_COMMIT_REF
  try {
    return execSync('git branch --show-current', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'main'
  } catch {
    return 'main'
  }
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

/**
 * Страницы теорий /t/<slug>. В продакшене их рендерит функция Vercel (api/theory.ts) из свежего
 * контента репозитория, поэтому в сборку они не пишутся. Здесь — то же самое для dev-сервера.
 */
function theoryPages(): Plugin {
  return {
    name: 'theory-pages',
    configureServer(server) {
      // шаблон страниц импортирован конфигом, поэтому его правки требуют перезапуска dev-сервера
      const templateFiles = ['src/ssg/theory-page.ts', 'src/lib/theory-data.ts', 'src/lib/markdown.ts', 'src/lib/credit.ts', 'src/lib/content-model.ts'].map((f) =>
        resolve(__dirname, f),
      )
      server.watcher.on('change', (file) => {
        if (templateFiles.includes(file)) server.restart()
      })
      server.middlewares.use((req, res, next) => {
        const m = req.url?.match(/^\/t\/([^/?#]+)\/?(?:[?#].*)?$/)
        if (!m) return next()
        const html = renderTheoryBySlug(buildContent(readLocalContent(__dirname)), decodeURIComponent(m[1]), '<link rel="stylesheet" href="/src/styles.css" />')
        if (!html) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), siteMeta(), theoryPages()],
  define: { __CMS_REPO__: JSON.stringify(cmsRepo()), __CMS_BRANCH__: JSON.stringify(cmsBranch()) },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin/index.html') },
      output: {
        // стили — по постоянному адресу /assets/main.css: на него ссылаются страницы теорий из функции Vercel
        assetFileNames: (asset) => (asset.names?.[0]?.endsWith('.css') ? 'assets/[name][extname]' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
  server: { allowedHosts },
  preview: { allowedHosts },
})
