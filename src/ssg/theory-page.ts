import type { Album, Theory } from '../types'
import { authorUrl, formatDate, theoryUrl } from '../lib/theory-data.js'
import { renderMarkdown } from '../lib/markdown.js'
import { CREDIT_HTML } from '../lib/credit.js'
import type { Content } from '../lib/content-model.js'

/**
 * Страница теории — готовый HTML без JS. Рендерится функцией Vercel (api/theory.ts) с кэшем CDN,
 * поэтому правки из админки видны без пересборки; в dev — middleware в vite.config.ts.
 * Telegram (превью и Instant View), режимы чтения браузеров и поисковики видят готовый текст.
 * Разметка — обычная статья: <article>, <h1>, <time>, meta author / article:published_time.
 */

export interface SiteText {
  meta: { title: string; description: string }
  links: { channel: string }
  header: { wordmark: string; navArchive: string; cta: string }
  theory: { back: string; more: string }
  footer: { text: string; top: string }
}

export interface PageInput {
  theory: Theory
  album?: Album
  looseTitle: string
  related: Theory[]
  site: SiteText
  /** Абсолютный адрес сайта без слеша на конце; пусто — канонические ссылки не выводятся. */
  siteUrl: string
  /** <link>/<script> для стилей: в dev — исходник, в сборке — файл с хешем. */
  styles: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Канал в формате @name для telegram:channel — из ссылки t.me/<name>. */
const channelHandle = (url: string) => url.match(/t\.me\/([A-Za-z0-9_]{4,})\/?$/)?.[1]

export function renderTheoryPage({ theory: t, album, looseTitle, related, site, siteUrl, styles }: PageInput): string {
  const theme = t.album ?? 'loose'
  const albumTitle = album?.title ?? looseTitle
  const albumLine = album?.year ? `${albumTitle}, ${album.year}` : albumTitle
  const url = siteUrl ? `${siteUrl}${theoryUrl(t.slug)}` : ''
  const title = `${t.title} — ${site.meta.title}`
  const channel = channelHandle(site.links.channel)
  const firstImage = t.body.match(/!\[[^\]]*\]\(([^)\s]+)/)?.[1]
  const image = firstImage && siteUrl && firstImage.startsWith('/') ? siteUrl + firstImage : firstImage
  const author = authorUrl(t.author)
  // schema.org Article: по нему режимы чтения, поисковики и превью понимают, что это статья
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t.title,
    description: t.excerpt || undefined,
    datePublished: t.date,
    dateModified: t.date,
    inLanguage: 'ru',
    articleSection: albumTitle,
    author: { '@type': 'Person', name: t.author, url: author },
    publisher: { '@type': 'Organization', name: site.meta.title, url: siteUrl || undefined },
    mainEntityOfPage: url ? { '@type': 'WebPage', '@id': url } : undefined,
    url: url || undefined,
    image: image || undefined,
  }
  const ghost = album
    ? `<div class="album-name album-name--${theme} theory__ghost" data-text="${esc(album.title)}" aria-hidden="true">${esc(album.title)}</div>`
    : `<div class="chrome theory__ghost" aria-hidden="true">${esc(site.header.wordmark)}</div>`

  return `<!doctype html>
<html lang="ru" data-world="${theme}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#000000" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(t.excerpt)}" />
    <meta name="author" content="${esc(t.author)}" />
    ${url ? `<link rel="canonical" href="${esc(url)}" />` : ''}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${esc(site.meta.title)}" />
    <meta property="og:title" content="${esc(t.title)}" />
    <meta property="og:description" content="${esc(t.excerpt)}" />
    ${url ? `<meta property="og:url" content="${esc(url)}" />` : ''}
    ${image ? `<meta property="og:image" content="${esc(image)}" />\n    <meta name="twitter:card" content="summary_large_image" />` : '<meta name="twitter:card" content="summary" />'}
    <meta property="article:published_time" content="${esc(t.date)}" />
    <meta property="article:author" content="${esc(t.author)}" />
    <meta property="article:section" content="${esc(albumTitle)}" />
    ${channel ? `<meta property="telegram:channel" content="@${channel}" />` : ''}
    <!-- Telegram показывает Instant View только для сайтов с одобренным шаблоном. Этот тег включает
         его встроенный разбор статей (как у Medium) без шаблона — неофициальный, но распространённый приём. -->
    <meta property="al:android:app_name" content="Medium" />
    <meta property="article:modified_time" content="${esc(t.date)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,500;0,600;1,500;1,600&family=Onest:wght@300;400;500&family=UnifrakturMaguntia&family=Poiret+One&family=Playfair+Display:ital,wght@1,500&family=Syne:wght@700&family=Unbounded:wght@300&family=Anton&family=Oswald:wght@400&family=Archivo:wght@500;900&family=Inter:wght@900&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
    ${styles}
  </head>
  <body class="theory-page">
    <div class="ambient" aria-hidden="true"></div>
    <header class="header">
      <div class="wrap header__row">
        <a href="/" class="wordmark" aria-label="${esc(site.header.wordmark)} — на главную"><span class="chrome">${esc(site.header.wordmark)}</span></a>
        <nav class="nav" aria-label="Разделы">
          <a href="/#archive">${esc(site.header.navArchive)}</a>
          <a href="/#submit" class="nav__cta">${esc(site.header.cta)}</a>
        </nav>
      </div>
    </header>

    <main id="top">
      <article class="theory t-${theme}" itemscope itemtype="https://schema.org/Article">
        <header class="theory__hero">
          <div class="wrap theory__wrap">
            ${ghost}
            <p class="theory__meta"><a href="/#archive">${esc(albumLine)}</a>${t.ref ? ` — ${esc(t.ref)}` : ''}</p>
            <h1 class="theory__title" itemprop="headline">${esc(t.title)}</h1>
            ${t.excerpt ? `<p class="theory__lead" itemprop="description">${esc(t.excerpt)}</p>` : ''}
            <p class="theory__byline">
              ${author ? `<a class="author" rel="author noreferrer" href="${esc(author)}" target="_blank" itemprop="author">${esc(t.author)}</a>` : `<span itemprop="author">${esc(t.author)}</span>`}
              <time datetime="${esc(t.date)}" itemprop="datePublished">${esc(formatDate(t.date))}</time>
            </p>
          </div>
        </header>

        <div class="wrap theory__wrap">
          <div class="prose theory__body" itemprop="articleBody">
${renderMarkdown(t.body)}
          </div>

          <footer class="theory__foot">
            <a class="btn" href="/#archive">${esc(site.theory.back)}</a>
          </footer>
        </div>
      </article>

      ${
        related.length
          ? `<aside class="theory__more t-${theme}" aria-labelledby="more-title">
        <div class="wrap theory__wrap">
          <h2 id="more-title" class="theory__more-title">${esc(site.theory.more)}</h2>
          <ul class="rows">
            ${related
              .map(
                (r) => `<li class="row"><a class="row__btn" href="${theoryUrl(r.slug)}">
              <span class="row__ref">${esc(r.ref ?? '')}</span>
              <span class="row__main">
                <span class="row__title" data-text="${esc(r.title)}">${esc(r.title)}</span>
                <span class="row__excerpt">${esc(r.excerpt)}</span>
              </span>
            </a></li>`,
              )
              .join('\n            ')}
          </ul>
        </div>
      </aside>`
          : ''
      }
    </main>

    <footer class="footer t-${theme}">
      <div class="wrap footer__row">
        <span>${esc(site.footer.text)}</span>
        <span class="footer__end">
          ${CREDIT_HTML}
          <a href="#top">${esc(site.footer.top)}</a>
        </span>
      </div>
    </footer>
  </body>
</html>
`
}

/** Страница по адресу /t/<slug> из готовой модели контента; null — такой теории нет. */
export function renderTheoryBySlug(content: Content, slug: string, styles: string, fallbackUrl = ''): string | null {
  const theory = content.theories.find((t) => t.slug === slug)
  if (!theory) return null
  const siteUrl = ((content.site.meta as { url?: string }).url || fallbackUrl).replace(/\/+$/, '')
  return renderTheoryPage({
    theory,
    album: content.albums.find((a) => a.id === theory.album),
    looseTitle: content.loose.title,
    related: content.theories.filter((t) => t.album === theory.album && t !== theory).slice(0, 4),
    site: content.site,
    siteUrl,
    styles,
  })
}
