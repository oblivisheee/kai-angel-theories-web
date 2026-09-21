/**
 * Запуск админки. Поля и коллекции описаны в public/admin/config.yml,
 * здесь только то, что зависит от окружения, и вход без всплывающих окон.
 */
declare const __CMS_REPO__: string
declare const __CMS_BRANCH__: string
declare const CMS: { init: (opts: { config: Record<string, unknown> }) => void }

const AUTH_PATH = '/api/auth'
const ERROR_KEY = 'cms-auth-error'
const USER_KEY = 'sveltia-cms.user'

/**
 * Вход через GitHub в той же вкладке вместо всплывающего окна. Браузеры с жёсткой блокировкой
 * попапов (Helium, Brave, Safari с настройками) молча не открывают окно, и Sveltia висит на
 * «Signing in…». Здесь окно не нужно: уходим на GitHub, а /api/callback возвращает сюда
 * по адресу #/signin/<токен> — его Sveltia понимает сама.
 */
const nativeOpen = window.open.bind(window)
window.open = (url?: string | URL, target?: string, features?: string) => {
  const href = url?.toString() ?? ''
  if (href.includes(AUTH_PATH)) {
    // автоматическая попытка без клика после неудачного входа — не зацикливаемся
    const byUser = navigator.userActivation?.isActive ?? true
    if (!byUser && sessionStorage.getItem(ERROR_KEY)) return null
    location.assign(href)
    return null
  }
  return nativeOpen(url, target, features)
}

/** Плашка поверх админки: ошибка входа или зависший вход с кнопкой сброса. */
function notice(text: string) {
  if (document.getElementById('cms-notice')) return
  const box = document.createElement('div')
  box.id = 'cms-notice'
  box.setAttribute('role', 'alert')
  box.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:min(560px,calc(100% - 32px));' +
    'display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 16px;border-radius:12px;' +
    'background:#1b1b1f;color:#eee;border:1px solid #3a3a42;font:14px/1.45 system-ui,sans-serif;box-shadow:0 12px 40px rgb(0 0 0/.45)'
  const msg = document.createElement('span')
  msg.style.flex = '1 1 260px'
  msg.textContent = text
  const btn = document.createElement('button')
  btn.textContent = 'Сбросить вход и войти заново'
  btn.style.cssText = 'padding:8px 14px;border-radius:999px;border:0;background:#eee;color:#111;font:inherit;font-weight:600;cursor:pointer'
  btn.onclick = () => {
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(ERROR_KEY)
    location.replace(location.pathname)
  }
  box.append(msg, btn)
  document.body.append(box)
}

// вход вернулся из /api/callback, но часть адреса после # потерялась (редиректы, мобильные браузеры) —
// восстанавливаем её до старта Sveltia; одноразово
const pendingSignin = sessionStorage.getItem('cms-signin')
if (pendingSignin) {
  sessionStorage.removeItem('cms-signin')
  if (!location.hash.startsWith('#/signin/')) history.replaceState(null, '', `${location.pathname}#/signin/${pendingSignin}`)
}

const authError = sessionStorage.getItem(ERROR_KEY)
if (authError) notice(`Не удалось войти: ${authError}`)

// вход завис (например, остался недовход после заблокированного окна) — предлагаем сброс
setTimeout(() => {
  if (/Signing in/i.test(document.body.innerText)) {
    notice('Вход завис. Обычно помогает сброс — после него нажмите «Sign In with GitHub» ещё раз.')
  }
}, 8000)

CMS.init({
  config: {
    backend: {
      name: 'github',
      repo: __CMS_REPO__,
      branch: __CMS_BRANCH__,
      // Вход через GitHub обслуживают функции этого же сайта на Vercel: api/auth.js и api/callback.js
      base_url: location.origin,
      auth_endpoint: 'api/auth',
    },
  },
})
