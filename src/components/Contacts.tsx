import { SITE } from '../content'

export function Contacts() {
  const c = SITE.contacts
  return (
    <section id="contacts" className="contacts" data-world="loose" aria-labelledby="contacts-title">
      <div className="wrap">
        <h2 id="contacts-title" className="h2">{c.title}</h2>
        <ul className="contacts__list">
          {c.items.map((item, i) => (
            <li key={i}>
              <a href={item.url} target="_blank" rel="noreferrer" className="contact">
                <span className="muted small">{item.kind}</span>
                <span className="contact__handle">{item.handle}</span>
                <span className="contact__role">{item.role}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
