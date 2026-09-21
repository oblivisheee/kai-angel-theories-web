/// <reference types="node" />
import { readLocalContent } from '../src/lib/content-fs.js'
import type { RawContent } from '../src/lib/content-model.js'

/**
 * Контент для функций: читается прямо из GitHub (одним GraphQL-запросом), поэтому правки из админки
 * видны без пересборки сайта. Нет токена или GitHub недоступен — берём папку content из текущего деплоя.
 *
 * Переменные: GITHUB_CONTENT_TOKEN — токен с правом чтения репозитория (Contents: Read-only).
 * Репозиторий и ветку Vercel подставляет сам (VERCEL_GIT_*); вручную — CMS_REPO и CMS_BRANCH.
 */

export function repoInfo() {
  const env = process.env
  const [owner, name] = (env.CMS_REPO ?? `${env.VERCEL_GIT_REPO_OWNER ?? ''}/${env.VERCEL_GIT_REPO_SLUG ?? ''}`).split('/')
  const branch = env.CMS_BRANCH ?? env.VERCEL_GIT_COMMIT_REF ?? 'main'
  return { owner, name, branch, token: env.GITHUB_CONTENT_TOKEN }
}

const QUERY = `query($owner: String!, $name: String!, $site: String!, $albums: String!, $theories: String!) {
  repository(owner: $owner, name: $name) {
    site: object(expression: $site) { ... on Blob { text } }
    albums: object(expression: $albums) { ... on Tree { entries { name object { ... on Blob { text } } } } }
    theories: object(expression: $theories) { ... on Tree { entries { name object { ... on Blob { text } } } } }
  }
}`

type Tree = { entries: { name: string; object: { text: string | null } | null }[] } | null

const parseTree = (tree: Tree) => {
  const out: Record<string, never> = {}
  for (const e of tree?.entries ?? []) {
    if (!e.name.endsWith('.json') || !e.object?.text) continue
    try {
      out[e.name] = JSON.parse(e.object.text) as never
    } catch {
      // битый файл пропускаем
    }
  }
  return out
}

async function fromGitHub(): Promise<RawContent> {
  const { owner, name, branch, token } = repoInfo()
  if (!token || !owner || !name) throw new Error('no github config')
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'kai-angel-archive' },
    body: JSON.stringify({
      query: QUERY,
      variables: { owner, name, site: `${branch}:content/site.json`, albums: `${branch}:content/albums`, theories: `${branch}:content/theories` },
    }),
    signal: AbortSignal.timeout(4000),
  })
  const json = (await res.json()) as { data?: { repository?: { site: { text: string } | null; albums: Tree; theories: Tree } }; errors?: unknown }
  const repo = json.data?.repository
  if (!res.ok || !repo?.site?.text) throw new Error(`github: ${res.status} ${JSON.stringify(json.errors ?? '')}`)
  return { site: JSON.parse(repo.site.text), albums: parseTree(repo.albums), theories: parseTree(repo.theories) }
}

// тёплый инстанс функции не ходит в GitHub чаще раза в 10 секунд
let memo: { at: number; data: Promise<{ raw: RawContent; source: string }> } | undefined

export function loadContent(): Promise<{ raw: RawContent; source: string }> {
  if (memo && Date.now() - memo.at < 10_000) return memo.data
  const data = fromGitHub()
    .then((raw) => ({ raw, source: 'github' }))
    .catch((err) => {
      console.warn('content: fallback to deployed files —', String(err))
      return { raw: readLocalContent(process.cwd()), source: 'deploy' }
    })
  memo = { at: Date.now(), data }
  return data
}

/** Кэш CDN Vercel: 10 с свежести, дальше отдаём старое и обновляем в фоне. */
export const CDN_CACHE = 'public, max-age=0, s-maxage=10, stale-while-revalidate=31536000'
