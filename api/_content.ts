/// <reference types="node" />
import { gunzipSync } from 'node:zlib'
import { readLocalContent } from '../src/lib/content-fs.js'
import type { RawContent } from '../src/lib/content-model.js'

/**
 * Контент для функций читается прямо из репозитория, поэтому правки из админки видны без пересборки.
 *
 * Как: 1) узнаём коммит ветки через git-протокол (info/refs — как `git ls-remote`, без лимитов API);
 * 2) коммит не менялся — отдаём разобранный контент из памяти; 3) менялся — качаем архив этого коммита
 * (codeload, ~50 КБ) и достаём из него content/. Токен не нужен для публичного репозитория;
 * GITHUB_CONTENT_TOKEN (Contents: Read-only) нужен, только если репозиторий приватный.
 * Если GitHub недоступен — отдаём content/ из текущего деплоя.
 *
 * Репозиторий и ветку Vercel подставляет сам (VERCEL_GIT_*); вручную — CMS_REPO и CMS_BRANCH.
 */

export function repoInfo() {
  const env = process.env
  const [owner, name] = (env.CMS_REPO ?? `${env.VERCEL_GIT_REPO_OWNER ?? ''}/${env.VERCEL_GIT_REPO_SLUG ?? ''}`).split('/')
  const branch = env.CMS_BRANCH ?? env.VERCEL_GIT_COMMIT_REF ?? 'main'
  return { owner, name, branch, token: env.GITHUB_CONTENT_TOKEN }
}

const UA = { 'User-Agent': 'git/2.45 kai-angel-archive' }

/** Текущий коммит ветки — по git-протоколу, как `git ls-remote`. */
async function branchHead(owner: string, name: string, branch: string, token?: string): Promise<string> {
  const headers: Record<string, string> = { ...UA }
  if (token) headers.Authorization = `Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
  const res = await fetch(`https://github.com/${owner}/${name}.git/info/refs?service=git-upload-pack`, {
    headers,
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`refs ${res.status}`)
  const refs = await res.text()
  const sha = refs.match(new RegExp(`([0-9a-f]{40}) refs/heads/${branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\n|\\0)`))?.[1]
  if (!sha) throw new Error(`branch "${branch}" not found`)
  return sha
}

/** Файлы content/*.json из tar.gz-архива коммита. */
async function contentFromArchive(owner: string, name: string, sha: string, token?: string): Promise<RawContent> {
  const url = token
    ? `https://api.github.com/repos/${owner}/${name}/tarball/${sha}`
    : `https://codeload.github.com/${owner}/${name}/tar.gz/${sha}`
  const res = await fetch(url, {
    headers: { ...UA, ...(token ? { Authorization: `bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`archive ${res.status}`)
  const files = readTar(gunzipSync(Buffer.from(await res.arrayBuffer())))

  const site = files.get('content/site.json')
  if (!site) throw new Error('content/site.json not in archive')
  const dir = (sub: string) => {
    const out: Record<string, never> = {}
    for (const [path, text] of files) {
      const m = path.match(new RegExp(`^content/${sub}/([^/]+\\.json)$`))
      if (!m) continue
      try {
        out[m[1]] = JSON.parse(text) as never
      } catch {
        // битый файл пропускаем — сайт не должен падать из-за одной записи
      }
    }
    return out
  }
  return { site: JSON.parse(site), albums: dir('albums'), theories: dir('theories') }
}

/** Минимальный разбор tar (ustar + pax-пути для длинных, в т.ч. кириллических, имён). Только content/*.json. */
export function readTar(tar: Buffer): Map<string, string> {
  const files = new Map<string, string>()
  const field = (h: Buffer, from: number, to: number) => h.subarray(from, to).toString('utf8').replace(/\0[\s\S]*$/, '')
  let offset = 0
  let paxPath: string | undefined
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) break
    const size = parseInt(field(header, 124, 136).trim() || '0', 8)
    const type = String.fromCharCode(header[156])
    const body = tar.subarray(offset + 512, offset + 512 + size)
    const prefix = field(header, 345, 500)
    const path = paxPath ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100))

    if (type === 'x') paxPath = body.toString('utf8').match(/\d+ path=([^\n]*)\n/)?.[1]
    else if (type === 'L') paxPath = body.toString('utf8').replace(/\0[\s\S]*$/, '')
    else {
      paxPath = undefined
      // в архиве GitHub всё лежит в папке «<owner>-<repo>-<sha>/» — отрезаем её
      const rel = path.split('/').slice(1).join('/')
      if ((type === '0' || type === '\0') && rel.startsWith('content/') && rel.endsWith('.json')) files.set(rel, body.toString('utf8'))
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return files
}

type Loaded = { raw: RawContent; source: string; sha?: string; error?: string }

let byCommit: { sha: string; raw: RawContent } | undefined
// тёплый инстанс функции спрашивает GitHub о новом коммите не чаще раза в 10 секунд
let memo: { at: number; data: Promise<Loaded> } | undefined

async function fromGitHub(): Promise<Loaded> {
  const { owner, name, branch, token } = repoInfo()
  if (!owner || !name) throw new Error('repo unknown: set CMS_REPO or expose Vercel system env')
  const sha = await branchHead(owner, name, branch, token)
  if (byCommit?.sha !== sha) byCommit = { sha, raw: await contentFromArchive(owner, name, sha, token) }
  return { raw: byCommit.raw, source: 'github', sha }
}

export function loadContent(): Promise<Loaded> {
  if (memo && Date.now() - memo.at < 10_000) return memo.data
  const data = fromGitHub().catch((err) => {
    const error = String(err instanceof Error ? err.message : err).slice(0, 160)
    console.warn('content: fallback to deployed files —', error)
    return { raw: readLocalContent(process.cwd()), source: 'deploy', error }
  })
  memo = { at: Date.now(), data }
  return data
}

/** Заголовки для отладки: откуда контент, какой коммит, почему не удалось прочитать GitHub. */
export function sourceHeaders({ source, sha, error }: Loaded): Record<string, string> {
  return {
    'X-Content-Source': source,
    ...(sha ? { 'X-Content-Commit': sha.slice(0, 7) } : {}),
    ...(error ? { 'X-Content-Error': error.replace(/[^\x20-\x7e]/g, '?') } : {}),
  }
}

/** Кэш CDN Vercel: 10 с свежести, дальше отдаём старое и обновляем в фоне. */
export const CDN_CACHE = 'public, max-age=0, s-maxage=10, stale-while-revalidate=31536000'
