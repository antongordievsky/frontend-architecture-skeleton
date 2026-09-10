// D-16: the code's zones, page modules and layers, as one lint rule. Every import is resolved to the
// file it names, whether written with `@/` or as a relative path, and checked against the map below.
// oxlint runs it as a JS plugin, an alpha API (D-10), so lint/layers.test.mjs proves it on every check.
import path from 'node:path'

// What each layer may import. Zones, their pages and their composites have their own rules below.
const ALLOWED = {
  shell: ['shell', 'zone', 'components', 'ui', 'api', 'domain'],
  zone: ['components', 'ui', 'api', 'domain'],
  components: ['components', 'ui', 'api', 'domain'],
  ui: ['ui'],
  api: ['api', 'domain'],
  domain: ['domain'],
}

const SRC = `${path.sep}src${path.sep}`

// Where a path sits: its layer, its zone, and the module (a folder with an index.ts) it belongs to.
const locate = (file, zones) => {
  const at = file.lastIndexOf(SRC)
  if (at === -1) return undefined
  const parts = file
    .slice(at + SRC.length)
    .replace(/\.[cm]?[jt]sx?$/, '')
    .split(path.sep)
  const top = parts[0]
  if (zones.has(top)) {
    if ((parts[1] === 'pages' || parts[1] === 'components') && parts[2]) {
      const module = parts.slice(0, 3).join('/')
      return {
        layer: 'zone',
        zone: top,
        page: parts[1] === 'pages',
        module,
        rest: parts.slice(3),
        parts,
      }
    }
    return { layer: 'zone', zone: top, parts }
  }
  if (parts.length === 1) return { layer: 'shell', parts }
  if ((top === 'ui' || top === 'components') && parts[1]) {
    return { layer: top, module: parts.slice(0, 2).join('/'), rest: parts.slice(2), parts }
  }
  return { layer: top, parts }
}

const isKnown = (at) => at.layer === 'zone' || at.layer in ALLOWED
const isBarrel = (to) => to.rest.length === 0 || (to.rest.length === 1 && to.rest[0] === 'index')
const isZoneRoot = (at) =>
  at.layer === 'zone' &&
  (at.parts.length === 1 || (at.parts.length === 2 && at.parts[1] === 'index'))

const verdict = (from, to) => {
  if (from.module && from.module === to.module) return undefined
  if (from.layer === 'zone' && to.layer === 'zone' && from.zone !== to.zone) {
    return `${from.zone}/ may not import ${to.zone}/: zones are isolated`
  }
  if (to.page) {
    if (from.page) {
      return `${from.module} imports ${to.module}: pages never import one another, not even types`
    }
    if (!(isZoneRoot(from) && from.zone === to.zone)) {
      return `${to.module} is reached only through ${to.zone}/index.ts`
    }
    if (!isBarrel(to)) return `${to.module} is private: import it through its index.ts`
    return undefined
  }
  if (isZoneRoot(to) && from.layer !== 'shell')
    return `${to.zone}/index.ts is imported only by the shell`
  if (to.module && !isBarrel(to)) return `${to.module} is private: import it through its index.ts`
  if (from.layer === 'zone' && to.layer === 'zone') return undefined
  if (!ALLOWED[from.layer].includes(to.layer)) return `${from.layer} may not import ${to.layer}`
  return undefined
}

export default {
  meta: { name: 'layers' },
  rules: {
    boundaries: {
      meta: {
        type: 'problem',
        schema: [
          {
            type: 'object',
            properties: { zones: { type: 'array', items: { type: 'string' } } },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const zones = new Set(context.options[0]?.zones ?? [])
        const file = context.filename
        const from = locate(file, zones)
        if (!from) return {}
        const report = (node, message) => context.report({ node, message: `${message} (D-16)` })
        // A file in an unknown folder gets one report, not one more for each of its imports.
        if (!isKnown(from)) {
          return {
            Program: (node) =>
              report(
                node,
                `src/${from.layer} is not a known layer: add it to lint/layers.js, or to the zones`,
              ),
          }
        }
        const src = file.slice(0, file.lastIndexOf(SRC) + SRC.length)
        const check = (node, source) => {
          if (typeof source !== 'string') return
          let target
          if (source.startsWith('@/')) target = path.join(src, source.slice(2))
          else if (source.startsWith('.')) target = path.resolve(path.dirname(file), source)
          else return
          const to = locate(target, zones)
          const message = to && verdict(from, to)
          if (message) report(node, message)
        }
        return {
          ImportDeclaration: (node) => check(node, node.source.value),
          ExportNamedDeclaration: (node) => node.source && check(node, node.source.value),
          ExportAllDeclaration: (node) => check(node, node.source.value),
          ImportExpression: (node) =>
            node.source.type === 'Literal' && check(node, node.source.value),
        }
      },
    },
  },
}
