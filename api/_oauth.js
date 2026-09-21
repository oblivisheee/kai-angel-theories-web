/**
 * Вход в админку через GitHub OAuth — порт sveltia-cms-auth (MIT) под функции Vercel.
 * Переменные окружения: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ALLOWED_DOMAINS (необязательно).
 * Файл с подчёркиванием Vercel не публикует как эндпоинт.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

const SCOPES = ['repo', 'public_repo', 'user', 'read:user', 'user:email']

/**
 * state для GitHub: «nonce.время.подпись». Подпись (HMAC секретом приложения) и срок 10 минут
 * проверяются всегда, cookie — если она дошла. На телефоне вход часто уходит в приложение GitHub
 * и возвращается уже в другой браузер, где cookie нет: без подписи такой вход падал с CSRF_DETECTED.
 */
const STATE_TTL = 10 * 60 * 1000
const sign = (payload) => createHmac('sha256', process.env.GITHUB_CLIENT_SECRET ?? '').update(payload).digest('base64url').slice(0, 32)

function makeState() {
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const payload = `${nonce}.${Date.now().toString(36)}`
  return { nonce, state: `${payload}.${sign(payload)}` }
}

function checkState(state, cookieNonce) {
  const [nonce, ts, sig] = (state ?? '').split('.')
  if (!nonce || !ts || !sig) return false
  const expected = Buffer.from(sign(`${nonce}.${ts}`))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false
  if (Date.now() - parseInt(ts, 36) > STATE_TTL) return false
  return !cookieNonce || cookieNonce === nonce
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const domainPatterns = () =>
  (process.env.ALLOWED_DOMAINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `^${escapeRegExp(s).replaceAll('\\*', '.+')}$`)

const serialize = (v) => JSON.stringify(v ?? null).replaceAll('<', '\\u003c')

const COOKIE = 'cms-csrf'

/** Страница в попапе: передаёт токен (или ошибку) окну админки и закрывается. */
export function result({ token, error, errorCode }) {
  const state = error ? 'error' : 'success'
  const content = error ? { provider: 'github', error, errorCode } : { provider: 'github', token }
  const message = `authorization:github:${state}:${JSON.stringify(content)}`
  return new Response(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Вход в админку</title>
    <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#e6e3dc;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}p{max-width:28rem;margin:0}</style>
    </head><body><p id="s">Передаём вход в админку…</p><script>
      (() => {
        const status = document.getElementById('s');
        const failed = ${serialize(!!error)};
        const token = ${serialize(token ?? null)};
        const errorText = ${serialize(error ?? null)};
        // Вход в той же вкладке (admin/cms.ts) или окно потеряло связь с админкой:
        // возвращаемся в админку по адресу #/signin/<данные> — Sveltia сама примет токен.
        const backToAdmin = () => {
          if (token) {
            const signin = btoa(JSON.stringify({ token }));
            sessionStorage.removeItem('cms-auth-error');
            sessionStorage.setItem('cms-signin', signin); // если браузер потеряет часть адреса после #
            location.replace('/admin#/signin/' + signin);
          } else {
            sessionStorage.setItem('cms-auth-error', errorText || 'неизвестная ошибка');
            location.replace('/admin');
          }
        };
        if (!window.opener) { backToAdmin(); return; }
        // окно есть, но админка не ответила — тоже возвращаемся сами
        const fallback = setTimeout(backToAdmin, 2500);
        const patterns = ${serialize(domainPatterns())};
        const hasToken = ${serialize(!!token)};
        const trusted = (origin) => {
          try { const { hostname } = new URL(origin); return patterns.some((p) => new RegExp(p).test(hostname)) }
          catch { return false }
        };
        window.addEventListener('message', ({ data, origin }) => {
          if (data !== 'authorizing:github') return;
          if (hasToken && patterns.length && !trusted(origin)) return;
          clearTimeout(fallback);
          window.opener?.postMessage(${serialize(message)}, origin);
          status.textContent = failed ? 'Не получилось войти — подробности в окне админки.' : 'Готово, окно можно закрыть.';
          if (!failed) setTimeout(() => window.close(), 400);
        });
        window.opener?.postMessage('authorizing:github', '*');
      })();
    </script></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Set-Cookie': `${COOKIE}=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure`,
      },
    },
  )
}

export function auth(request) {
  const { searchParams } = new URL(request.url)
  const { provider, site_id: domain, scope: requested } = Object.fromEntries(searchParams)
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env

  if (provider !== 'github') {
    return result({ error: 'Поддерживается только GitHub.', errorCode: 'UNSUPPORTED_BACKEND' })
  }
  const patterns = domainPatterns()
  if (patterns.length && !patterns.some((p) => new RegExp(p).test(domain ?? ''))) {
    return result({ error: 'Этот домен не может входить в админку.', errorCode: 'UNSUPPORTED_DOMAIN' })
  }
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return result({ error: 'На Vercel не заданы GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET.', errorCode: 'MISCONFIGURED_CLIENT' })
  }

  const asked = (requested ?? '').split(/[\s,]+/).filter(Boolean)
  const scope = asked.length && asked.every((s) => SCOPES.includes(s)) ? asked.join(',') : 'repo,user'
  const { nonce, state } = makeState()
  const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope, state })

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      'Set-Cookie': `${COOKIE}=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  })
}

export async function callback(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieNonce = request.headers.get('cookie')?.match(new RegExp(`\\b${COOKIE}=([0-9a-f]{32})\\b`))?.[1]

  if (!code || !state) return result({ error: 'GitHub не вернул код авторизации. Попробуйте ещё раз.', errorCode: 'AUTH_CODE_REQUEST_FAILED' })
  if (!checkState(state, cookieNonce)) return result({ error: 'Ссылка входа устарела или неверна. Попробуйте войти ещё раз.', errorCode: 'CSRF_DETECTED' })

  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET }),
    })
    const { access_token: token, error } = await res.json()
    return token ? result({ token }) : result({ error: error ?? 'GitHub не выдал токен.', errorCode: 'TOKEN_REQUEST_FAILED' })
  } catch {
    return result({ error: 'Не удалось связаться с GitHub. Попробуйте позже.', errorCode: 'TOKEN_REQUEST_FAILED' })
  }
}
