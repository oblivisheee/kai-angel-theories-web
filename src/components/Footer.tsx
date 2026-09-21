import { SITE } from '../content'
import { CREDIT_HTML } from '../lib/credit'
import type { CategoryId } from '../types'

/** theme — альбом главной темы: в его цветах окрашена подпись Weliable. */
export function Footer({ theme }: { theme: CategoryId }) {
  return (
    <footer className={`footer t-${theme}`}>
      <div className="wrap footer__row">
        <span>{SITE.footer.text}</span>
        <span className="footer__end">
          <span className="footer__credit" dangerouslySetInnerHTML={{ __html: CREDIT_HTML }} />
          <a href="#top">{SITE.footer.top}</a>
        </span>
      </div>
    </footer>
  )
}
