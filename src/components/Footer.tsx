import { SITE } from '../content'

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__row">
        <span>{SITE.footer.text}</span>
        <a href="#top">{SITE.footer.top}</a>
      </div>
    </footer>
  )
}
