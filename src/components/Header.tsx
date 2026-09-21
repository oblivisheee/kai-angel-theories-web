import { SITE } from '../content'
import { Chrome } from './Chrome'

export function Header() {
  const h = SITE.header
  return (
    <header className="header">
      <div className="wrap header__row">
        <a href="#top" className="wordmark" aria-label={`${h.wordmark} — к началу`}>
          <Chrome>{h.wordmark}</Chrome>
        </a>
        <nav className="nav" aria-label="Разделы">
          <a href="#archive">{h.navArchive}</a>
          <a href="#contacts">{h.navContacts}</a>
          <a href={SITE.links.channel} target="_blank" rel="noreferrer">{h.navChannel}</a>
          <a href="#submit" className="nav__cta">{h.cta}</a>
        </nav>
      </div>
    </header>
  )
}
