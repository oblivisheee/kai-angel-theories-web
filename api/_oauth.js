/**
 * Вход в админку через GitHub OAuth — порт sveltia-cms-auth (MIT) под функции Vercel.
 * Переменные окружения: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ALLOWED_DOMAINS (необязательно).
 * Файл с подчёркиванием Vercel не публикует как эндпоинт.
 */

const SCOPES = ['repo', 'public_repo', 'user', 'read:user', 'user:email']

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
    `<!doctype html><html><body><script>
      (() => {
        const patterns = ${serialize(domainPatterns())};
        const hasToken = ${serialize(!!token)};
        const trusted = (origin) => {
          try { const { hostname } = new URL(origin); return patterns.some((p) => new RegExp(p).test(hostname)) }
          catch { return false }
        };
        window.addEventListener('message', ({ data, origin }) => {
          if (data !== 'authorizing:github') return;
          if (hasToken && patterns.length && !trusted(origin)) return;
          window.opener?.postMessage(${serialize(message)}, origin);
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
  const csrf = crypto.randomUUID().replaceAll('-', '')
  const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope, state: csrf })

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      'Set-Cookie': `${COOKIE}=${csrf}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  })
}

export async function callback(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const csrf = request.headers.get('cookie')?.match(new RegExp(`\\b${COOKIE}=([0-9a-f]{32})\\b`))?.[1]

  if (!code || !state) return result({ error: 'GitHub не вернул код авторизации. Попробуйте ещё раз.', errorCode: 'AUTH_CODE_REQUEST_FAILED' })
  if (!csrf || csrf !== state) return result({ error: 'Проверка безопасности не прошла. Попробуйте войти ещё раз.', errorCode: 'CSRF_DETECTED' })

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
