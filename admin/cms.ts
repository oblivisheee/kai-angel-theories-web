/**
 * Запуск админки. Поля и коллекции описаны в public/admin/config.yml,
 * здесь только то, что зависит от окружения: репозиторий и адрес входа через GitHub.
 */
declare const __CMS_REPO__: string
declare const CMS: { init: (opts: { config: Record<string, unknown> }) => void }

CMS.init({
  config: {
    backend: {
      name: 'github',
      repo: __CMS_REPO__,
      branch: 'main',
      // Вход через GitHub обслуживают функции этого же сайта на Vercel: api/auth.js и api/callback.js
      base_url: location.origin,
      auth_endpoint: 'api/auth',
    },
  },
})
