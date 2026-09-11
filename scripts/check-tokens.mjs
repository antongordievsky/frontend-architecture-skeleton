// D-28, FR-5: the design tokens are the only source of colour. Outside src/ui/tokens.css a stylesheet may not
// write a colour of its own, nor define a custom property, and every var(--…) it reads must be defined in the
// tokens file. A misspelled token would otherwise fall back silently to nothing.
//
//   node scripts/check-tokens.mjs
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const TOKENS = 'src/ui/tokens.css'
const ROOTS = ['src', 'playwright']

const stylesheets = (dir) => {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries.flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : stylesheets(file)
    return entry.name.endsWith('.css') ? [file] : []
  })
}

// Comments become spaces, so offsets and line numbers stay true.
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))

// A declaration is the text before a ";" or "}" that holds a ":"; the text before a "{" is a selector or an
// at-rule's prelude, and is skipped, so "a:hover" or "#root" is never read as a value.
const declarations = function* (css) {
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c !== '{' && c !== ';' && c !== '}') continue
    const text = css.slice(start, i)
    const colon = text.indexOf(':')
    if (c !== '{' && colon !== -1 && !text.trim().startsWith('@')) {
      const lead = text.length - text.trimStart().length
      yield {
        property: text.slice(0, colon).trim().toLowerCase(),
        value: text.slice(colon + 1),
        offset: start + lead,
      }
    }
    start = i + 1
  }
}

const HEX = /#[0-9a-f]{3,8}\b/i
const COLOUR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i
// In a property that takes a colour, any other bare word may be a named colour (red, rebeccapurple), so only
// these pass: the colour keywords that carry no colour, and the other words the shorthands take.
const COLOUR_PROPERTY =
  /^(color|background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|border-image(-source)?|mask(-image)?|outline(-color)?|fill|stroke|caret-color|accent-color|column-rule(-color)?|text-decoration(-color)?|text-emphasis(-color)?|box-shadow|text-shadow)$/
const ALLOWED_WORDS = new Set(
  (
    'transparent currentcolor inherit initial unset revert revert-layer none ' +
    'solid dashed dotted double groove ridge inset outset hidden auto thin medium thick ' +
    'no-repeat repeat repeat-x repeat-y space round center top bottom left right cover contain ' +
    'fixed scroll local padding-box border-box content-box text underline overline line-through wavy ' +
    'to from at in srgb oklch oklab hsl display-p3 longer shorter increasing decreasing hue alpha'
  ).split(' '),
)
const bareWords = (value) =>
  value
    .replace(/var\([^)]*\)/g, ' ')
    .replace(/url\([^)]*\)/g, ' ')
    .replace(/"[^"]*"|'[^']*'/g, ' ')
    // A function's name is not a colour; its arguments may be, so only the name goes.
    .replace(/[a-z][\w-]*\(/gi, ' ')
    .match(/(?<![\w.#-])[a-z][a-z-]*\b/gi) ?? []

const lineOf = (css, offset) => css.slice(0, offset).split('\n').length

const tokens = withoutComments(readFileSync(TOKENS, 'utf8'))
const defined = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))

const problems = []
const files = ROOTS.flatMap(stylesheets).sort()
for (const file of files) {
  const css = withoutComments(readFileSync(file, 'utf8'))
  const own = path.normalize(file) === path.normalize(TOKENS)
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!defined.has(m[1])) {
      problems.push(`${file}:${lineOf(css, m.index)}: ${m[1]} is not defined in ${TOKENS}`)
    }
  }
  if (own) continue
  for (const { property, value, offset } of declarations(css)) {
    const at = `${file}:${lineOf(css, offset)}`
    if (property.startsWith('--')) {
      problems.push(`${at}: ${property} is defined outside ${TOKENS}; tokens live in one file`)
    } else if (HEX.test(value) || COLOUR_FUNCTION.test(value)) {
      problems.push(
        `${at}: "${property}:${value.trim()}" writes a colour; use a token from ${TOKENS}`,
      )
    } else if (COLOUR_PROPERTY.test(property)) {
      const named = bareWords(value).filter((w) => !ALLOWED_WORDS.has(w.toLowerCase()))
      if (named.length > 0) {
        problems.push(
          `${at}: "${property}:${value.trim()}" names a colour (${named.join(', ')}); use a token from ${TOKENS}`,
        )
      }
    }
  }
}

if (problems.length > 0) {
  console.error(
    ['check-tokens: every colour comes from the design tokens (D-28):', ...problems].join('\n'),
  )
  process.exit(1)
}
console.log(`check-tokens: ${files.length} stylesheet(s) read their colours from ${TOKENS}`)
