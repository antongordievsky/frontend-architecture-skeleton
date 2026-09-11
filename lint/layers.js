// D-16: the code's zones, page modules and layers, as one lint rule. Every import is resolved to the
// file it names, whether written with `@/` or as a relative path, and checked against the map below.
// oxlint runs it as a JS plugin, an alpha API (D-10), so lint/layers.test.mjs proves it on every check.
import { realpathSync } from 'node:fs'
import path from 'node:path'

// Real paths, so that a symlinked checkout (macOS /tmp is one) compares equal to itself.
const real = (p) => {
  try {
    return realpathSync(p)
  } catch {
    return p
  }
}

// This file lives in <repository>/lint, so the rule's `src` option is anchored there, never found by
// searching the path: a checkout inside some other folder named `src` must not change the answer.
const ROOT = path.dirname(real(import.meta.dirname))

// What each layer may import outside the zones. Zones have their own rules, in `intoZone`.
const ALLOWED = {
  shell: ['shell', 'components', 'ui', 'api', 'domain'],
  zone: ['components', 'ui', 'api', 'domain'],
  components: ['components', 'ui', 'api', 'domain'],
  ui: ['ui'],
  api: ['api', 'domain'],
  domain: ['domain'],
}

// Where a path sits under `src`: its layer, its zone, and the module (a folder with an index.ts) it
// belongs to. Outside `src` the rule has no opinion.
const locate = (file, src, zones) => {
  if (!file.startsWith(src + path.sep)) return undefined
  const parts = file
    .slice(src.length + 1)
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
  // D-05: route files are the shell's. They are thin, and reach a zone only through its index.ts.
  if (parts.length === 1 || top === 'routes') return { layer: 'shell', parts }
  if ((top === 'ui' || top === 'components') && parts[1]) {
    return { layer: top, module: parts.slice(0, 2).join('/'), rest: parts.slice(2), parts }
  }
  return { layer: top, parts }
}

const isKnown = (at) => at.layer === 'zone' || at.layer in ALLOWED
// D-03: the generated client is api's own; the rest of the code reaches the server through an adapter.
const isGenerated = (at) => at.layer === 'api' && at.parts[1] === 'generated'
const isTestFile = (file) => /\.test\.[cm]?[jt]sx?$/.test(file)
const isBarrel = (to) => to.rest.length === 0 || (to.rest.length === 1 && to.rest[0] === 'index')
const isZoneRoot = (at) =>
  at.layer === 'zone' &&
  (at.parts.length === 1 || (at.parts.length === 2 && at.parts[1] === 'index'))

// A zone is entered only through its index.ts, and only by the shell; inside it, pages stay apart.
const intoZone = (from, to) => {
  const inside = from.layer === 'zone' && from.zone === to.zone
  if (from.layer === 'zone' && !inside) {
    return `${from.zone}/ may not import ${to.zone}/: zones are isolated`
  }
  if (to.page) {
    if (from.page) {
      return `${from.module} imports ${to.module}: pages never import one another, not even types`
    }
    if (!(inside && isZoneRoot(from)))
      return `${to.module} is reached only through ${to.zone}/index.ts`
    if (!isBarrel(to)) return `${to.module} is private: import it through its index.ts`
    return undefined
  }
  if (isZoneRoot(to)) {
    return from.layer === 'shell' ? undefined : `${to.zone}/index.ts is imported only by the shell`
  }
  if (!inside) return `${to.zone}/ is reached only through ${to.zone}/index.ts`
  if (to.module && !isBarrel(to)) return `${to.module} is private: import it through its index.ts`
  return undefined
}

const verdict = (from, to) => {
  if (from.module && from.module === to.module) return undefined
  if (to.layer === 'zone') return intoZone(from, to)
  if (to.module && !isBarrel(to)) return `${to.module} is private: import it through its index.ts`
  if (isGenerated(to) && from.layer !== 'api') {
    return 'api/generated is private to api: import the resource adapter instead'
  }
  if (!ALLOWED[from.layer].includes(to.layer)) return `${from.layer} may not import ${to.layer}`
  return undefined
}

// The path an import names, if it is written out: a string, or a template literal with no `${}`.
const literal = (node) => {
  if (node?.type === 'Literal') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked
  }
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
            properties: {
              zones: { type: 'array', items: { type: 'string' } },
              src: { type: 'string' },
            },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const options = context.options[0] ?? {}
        const zones = new Set(options.zones ?? [])
        const src = real(path.resolve(ROOT, options.src ?? 'src'))
        const mock = path.join(path.dirname(src), 'mock')
        const file = real(context.filename)
        const from = locate(file, src, zones)
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
        const check = (node, source) => {
          if (typeof source !== 'string') return
          let target
          if (source.startsWith('@/')) target = path.resolve(src, source.slice(2))
          else if (source.startsWith('.')) target = path.resolve(path.dirname(file), source)
          else return
          const to = locate(target, src, zones)
          if (!to) {
            // D-04: nothing in src/ reaches outside it, so the stand-in never enters the bundle.
            // A test file may use the stand-in, and only it.
            if (!(isTestFile(file) && target.startsWith(mock + path.sep))) {
              report(node, 'src/ may not import from outside it: only a test file may reach mock/')
            }
            return
          }
          const message = verdict(from, to)
          if (message) report(node, message)
        }
        return {
          ImportDeclaration: (node) => check(node, node.source.value),
          ExportNamedDeclaration: (node) => node.source && check(node, node.source.value),
          ExportAllDeclaration: (node) => check(node, node.source.value),
          TSImportType: (node) => check(node, literal(node.source)),
          TSImportEqualsDeclaration: (node) =>
            node.moduleReference.type === 'TSExternalModuleReference' &&
            check(node, literal(node.moduleReference.expression)),
          ImportExpression: (node) => {
            const source = literal(node.source)
            if (source === undefined) {
              report(
                node,
                'import() with a computed path cannot be checked against the layer map: use a string literal',
              )
            } else check(node, source)
          },
        }
      },
    },
  },
}
