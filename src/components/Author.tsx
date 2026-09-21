import { authorUrl } from '../lib/theory-data'

export function Author({ name }: { name: string }) {
  const url = authorUrl(name)
  return url ? (
    <a className="author" href={url} target="_blank" rel="noreferrer">
      {name}
    </a>
  ) : (
    <>{name}</>
  )
}
