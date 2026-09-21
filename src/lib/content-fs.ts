import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { RawContent } from './content-model.js'

/** Читает папку content с диска — для dev-сервера и как запасной вариант функций Vercel. */
export function readLocalContent(root: string): RawContent {
  const dir = join(root, 'content')
  const readDir = (sub: string) => {
    const out: Record<string, never> = {}
    for (const name of readdirSync(join(dir, sub))) {
      if (!name.endsWith('.json')) continue
      try {
        out[name] = JSON.parse(readFileSync(join(dir, sub, name), 'utf8')) as never
      } catch {
        // битый файл пропускаем — сайт не должен падать из-за одной записи
      }
    }
    return out
  }
  return {
    site: JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8')),
    albums: readDir('albums'),
    theories: readDir('theories'),
  }
}
