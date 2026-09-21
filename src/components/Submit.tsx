import { SITE } from '../content'

export function Submit() {
  const s = SITE.submit
  return (
    <section id="submit" className="submit" data-world="loose" aria-labelledby="submit-title">
      <div className="wrap submit__grid">
        <div>
          <h2 id="submit-title" className="h2">{s.title}</h2>
          <p className="lead">{s.lead}</p>
          <a href={SITE.links.bot} target="_blank" rel="noreferrer" className="btn btn--solid">
            {s.button}
          </a>
          {s.note && <p className="muted small">{s.note}</p>}
        </div>

        {s.format.length > 0 && (
          <div className="format">
            <p className="format__title">{s.formatTitle}</p>
            <ol>
              {s.format.map((f, i) => (
                <li key={i}>
                  <strong>{f.label}</strong> {f.text}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
