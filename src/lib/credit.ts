/**
 * Подпись разработчика в подвале. Одна разметка и для React-главной, и для статических страниц теорий.
 * Знак Weliable окрашен в хром текущего альбома (токены --mk-* темы t-*), при наведении кольцо
 * перерисовывается, а узлы загораются акцентом альбома. В админку не выносится намеренно.
 */
export const CREDIT_URL = 'https://weliable.dev/'

// viewBox подогнан под реальные края знака (кольцо с обводкой + узлы), чтобы он центровался оптически
export const CREDIT_HTML = `<a class="credit" href="${CREDIT_URL}" target="_blank" rel="noopener" aria-label="Сайт сделан в Weliable">
  <span class="credit__label">сделано в</span>
  <span class="credit__lockup">
    <svg class="credit__mark" viewBox="306 169 230 234" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wl-chrome" x1="0" y1="169" x2="0" y2="403" gradientUnits="userSpaceOnUse">
          <stop class="mk-hi" offset="0" /><stop class="mk-mid" offset=".5" /><stop class="mk-lo" offset="1" />
        </linearGradient>
      </defs>
      <g stroke="url(#wl-chrome)" stroke-width="22" stroke-linecap="round">
        <circle class="credit__ring" cx="420.94" cy="284.49" r="103.63" pathLength="1" transform="rotate(-90 420.94 284.49)" />
        <line class="credit__edge" x1="364.91" y1="197.32" x2="456.68" y2="378.03" pathLength="1" />
        <line class="credit__edge" x1="476.98" y1="197.29" x2="455.33" y2="375.42" pathLength="1" />
      </g>
      <g class="credit__nodes" fill="url(#wl-chrome)">
        <circle cx="476.98" cy="197.32" r="27.5" /><circle cx="364.91" cy="197.32" r="27.5" /><circle cx="456.68" cy="375.42" r="27.5" />
      </g>
    </svg>
    <span class="credit__name">Weliable</span>
  </span>
</a>`
