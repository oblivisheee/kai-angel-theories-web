import { useEffect, type PointerEvent } from 'react'

/**
 * Фон страницы подстраивается под «мир» альбома, который сейчас в центре экрана:
 * секции помечены data-world, а на <html> выставляется data-world текущей.
 */
export function useAmbientWorld() {
  useEffect(() => {
    const root = document.documentElement
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) root.dataset.world = (e.target as HTMLElement).dataset.world
        }
      },
      { rootMargin: '-45% 0px -54% 0px' },
    )
    const scan = () => {
      io.disconnect()
      document.querySelectorAll('main [data-world]').forEach((el) => io.observe(el))
    }
    scan()
    // Фильтр архива перерисовывает группы — пересобираем наблюдение.
    const mo = new MutationObserver(scan)
    mo.observe(document.querySelector('main')!, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}

/**
 * Анимации появления названий альбомов стартуют, когда название попадает в кадр:
 * до этого они стоят на паузе (.js .album-name:not(.is-in)). Новые названия после
 * переключения вкладок каталога подхватываются и анимируются заново.
 */
export function useRevealNames() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { threshold: 0.35 },
    )
    const scan = () => document.querySelectorAll('.album-name:not(.is-in)').forEach((el) => io.observe(el))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}

/** Пятно света следует за курсором (см. .world::before). */
export function spotlight(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
