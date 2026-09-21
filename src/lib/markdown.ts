import { Marked } from 'marked'

/**
 * Разбор пишется в админке в Markdown: абзацы, ссылки, цитаты, списки, картинки.
 * Сырой HTML выключен — в текст разбора нельзя вставить разметку или скрипт.
 */
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: () => '',
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens)
      const external = /^https?:\/\//.test(href)
      const safe = /^(https?:|mailto:|tg:|#|\/)/.test(href) ? href.replaceAll('"', '%22') : '#'
      return `<a href="${safe}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${text}</a>`
    },
  },
})

export const renderMarkdown = (src: string): string => md.parse(src, { async: false })
