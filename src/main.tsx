import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { setContent } from './content'
import type { RawContent } from './lib/content-model'
import './styles.css'

// анимации названий альбомов ждут появления в кадре только там, где есть JS
document.documentElement.classList.add('js')

/**
 * Свежий контент из репозитория (/api/content, кэш CDN) — правки из админки без пересборки.
 * Если функция недоступна или отвечает дольше 2,5 с, рисуем контент из сборки.
 */
async function loadFreshContent() {
  if (import.meta.env.DEV) return // в dev контент и так читается из файлов с горячей перезагрузкой
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  try {
    const res = await fetch('/api/content', { signal: ctrl.signal })
    if (res.ok) setContent((await res.json()) as RawContent)
  } catch {
    // остаёмся на контенте из сборки
  } finally {
    clearTimeout(timer)
  }
}

loadFreshContent().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
