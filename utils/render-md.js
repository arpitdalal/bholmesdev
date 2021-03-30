const md = require('markdown-it')({ html: true })
const attrs = require('markdown-it-attrs')
const prism = require('markdown-it-prism')
const headingAnchors = require('markdown-it-anchor')

const wrapWithNewlines = (str = '') => `\n\n${str}\n\n`

const toCodepenEmbed = (url = '', params = '') => {
  const defaultTabs = params.replace('default-tab=', '')
  const [_, slug] = url.match(/\/pen\/([\w|\d]*)$/)
  const height = 400
  return `<p class="codepen" data-height="${height}" data-theme-id="light" data-default-tab="${defaultTabs}" data-user="bholmesdev" data-slug-hash="${slug}" style="height: ${height}px; text-align: center" data-pen-title="Detect current section">
  <span><a href="${url}">See the Pen</a> by Benjamin Holmes (<a href="https://codepen.io/bholmesdev">@bholmesdev</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
`
}

const toYoutubeEmbed = (videoSlug = '') => {
  return `<iframe width="375" height="300" src="https://www.youtube-nocookie.com/embed/${videoSlug}"
          title="YouTube video player" frameborder="0" data-embed-type="youtube"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>`
}

const formatCodepenEmbeds = (rawMarkdown = '') => {
  const embeds = rawMarkdown.match(/\n\n{% codepen (.*) (.*) %}\n\n/g)
  if (!embeds) return rawMarkdown

  let markdown = rawMarkdown

  for (const embed of embeds) {
    try {
      const [_, url, params] = embed.match(/{% codepen (.*) (.*) %}/)
      markdown = markdown.replace(
        embed,
        wrapWithNewlines(toCodepenEmbed(url, params))
      )
    } catch (e) {
      console.error('There was a problem processing a Codepen embed', e)
    }
  }
  return markdown
}

const formatYoutubeEmbeds = (rawMarkdown = '') => {
  const embeds = rawMarkdown.match(/\n\n{% youtube (.*) %}\n\n/g)
  if (!embeds) return rawMarkdown

  let markdown = rawMarkdown

  for (const embed of embeds) {
    try {
      const [_, videoSlug] = embed.match(/{% youtube (.*) %}/)
      markdown = markdown.replace(
        embed,
        wrapWithNewlines(toYoutubeEmbed(videoSlug))
      )
    } catch (e) {
      console.error('There was a problem processing a Youtube embed', e)
    }
  }
  return markdown
}

module.exports = (rawMarkdown) => {
  // open all links in a new tab
  md.renderer.rules.link_open = (tokens, idx) => {
    const attrsAsString = tokens[idx].attrs.reduce((str, [attr, value]) => {
      return str + `${attr}="${value}" `
    }, '')
    return `<a ${attrsAsString}target="_blank" rel="noreferrer">`
  }

  md.use(prism)
    .use(attrs)
    .use(headingAnchors, {
      slugify: (s) =>
        'link-' +
        s
          .toLowerCase()
          .replace(/\s+/g, '-') // Replace spaces with -
          .replace(/[^\w\-]+/g, '') // Remove all non-word chars
          .replace(/\-\-+/g, '-') // Replace multiple - with single -
          .replace(/^-+/, '') // Trim - from start of text
          .replace(/-+$/, ''),
    })

  return md.render(formatYoutubeEmbeds(formatCodepenEmbeds(rawMarkdown)))
}
