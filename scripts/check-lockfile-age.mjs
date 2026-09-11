// CC-08, D-23: a version younger than the quarantine cannot enter the lockfile. Bun's resolver already
// refuses one; this checks the lockfile itself, whatever wrote it: a warm cache (CC-02), another tool, a
// hand edit. Only the entries a commit adds or changes are checked, because a locked entry was checked
// when it came.
//
//   node scripts/check-lockfile-age.mjs                    what the staged bun.lock adds to HEAD's
//   node scripts/check-lockfile-age.mjs --all              every locked version (the update recipe, QR-25)
//   node scripts/check-lockfile-age.mjs --base a --head b  what lockfile b adds to lockfile a (the proofs)
//
// In the agent's sandbox, Node's fetch reaches the registry only with NODE_USE_ENV_PROXY=1.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    base: { type: 'string' },
    head: { type: 'string' },
    registry: { type: 'string', default: 'https://registry.npmjs.org' },
  },
})

const fail = (lines) => {
  console.error(lines.join('\n'))
  process.exit(1)
}

const bunfig = readFileSync('bunfig.toml', 'utf8')
const quarantine = Number(/^minimumReleaseAge\s*=\s*(\d+)/m.exec(bunfig)?.[1])
if (!Number.isInteger(quarantine) || quarantine <= 0) {
  fail(['check-lockfile-age: bunfig.toml sets no minimumReleaseAge'])
}
// The reviewed exceptions (D-23): the gate reads Bun's own list rather than keeping a second one.
const excluded = new Set(
  [
    ...(/^minimumReleaseAgeExcludes\s*=\s*\[([^\]]*)\]/m.exec(bunfig)?.[1] ?? '').matchAll(
      /"([^"]+)"/g,
    ),
  ].map((m) => m[1]),
)

// Only a lockfile that does not exist reads as empty: no HEAD yet, or no lockfile in it or in the index.
// Any other failure stops the gate, so a lockfile git could not read never passes unchecked.
const gitShow = (spec) => {
  try {
    return execFileSync('git', ['show', spec], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (e) {
    const said = String(e.stderr ?? '')
    if (/does not exist|invalid object name 'HEAD'|bad revision 'HEAD'/.test(said)) return null
    return fail([`check-lockfile-age: git could not read ${spec}: ${said.trim() || e.message}`])
  }
}

// bun.lock is JSON with trailing commas. An entry is ["name@version", registry, metadata, integrity]; Bun
// writes "" as the registry for the default one. An entry is identified by its version and its integrity,
// so a hand edit that swaps the artifact behind a locked version counts as a change, and is checked.
const lockedEntries = (text) => {
  const entries = new Map()
  if (text === null) return entries
  const lock = JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'))
  for (const [key, [id, registry, , integrity]] of Object.entries(lock.packages ?? {})) {
    const at = id.lastIndexOf('@')
    if (at <= 0 || !/^\d+\.\d+\.\d+/.test(id.slice(at + 1))) {
      fail([
        `check-lockfile-age: ${key} is locked as "${id}", which is no registry version and cannot be checked`,
      ])
    }
    if (registry !== '') {
      fail([
        `check-lockfile-age: ${key} resolves from ${registry}, not the default registry, so its age cannot be checked`,
      ])
    }
    if (typeof integrity !== 'string' || integrity === '') {
      fail([`check-lockfile-age: ${key} has no integrity hash`])
    }
    entries.set(`${id} ${integrity}`, {
      name: id.slice(0, at),
      version: id.slice(at + 1),
      integrity,
    })
  }
  return entries
}

const headText = args.head
  ? readFileSync(args.head, 'utf8')
  : args.all
    ? readFileSync('bun.lock', 'utf8')
    : gitShow(':bun.lock')
const baseText = args.all
  ? null
  : args.base
    ? readFileSync(args.base, 'utf8')
    : gitShow('HEAD:bun.lock')
const base = lockedEntries(baseText)
const added = [...lockedEntries(headText)]
  .filter(([key]) => !base.has(key))
  .map(([, entry]) => entry)
if (added.length === 0) {
  console.log('check-lockfile-age: the lockfile adds no version')
  process.exit(0)
}

const entriesByName = new Map()
for (const entry of added)
  entriesByName.set(entry.name, [...(entriesByName.get(entry.name) ?? []), entry])

const now = Date.now()
const young = []
const waived = []
const unchecked = []
const queue = [...entriesByName.keys()]
const worker = async () => {
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    let doc
    try {
      const res = await fetch(`${args.registry}/${name.replace('/', '%2f')}`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      doc = await res.json()
    } catch (e) {
      unchecked.push(
        `  ${name}: ${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ''}`,
      )
      continue
    }
    for (const { version, integrity } of entriesByName.get(name)) {
      const published = Date.parse(doc.time?.[version])
      if (Number.isNaN(published)) {
        unchecked.push(`  ${name}@${version}: the registry gives no publish time`)
        continue
      }
      if (doc.versions?.[version]?.dist?.integrity !== integrity) {
        unchecked.push(
          `  ${name}@${version}: the locked integrity is not the one the registry publishes`,
        )
        continue
      }
      const age = (now - published) / 1000
      if (age >= quarantine) continue
      const line = `  ${name}@${version} — published ${new Date(published).toISOString()}, ${(age / 86400).toFixed(1)} days ago; it leaves the quarantine at ${new Date(published + quarantine * 1000).toISOString()}`
      if (excluded.has(name)) waived.push(line)
      else young.push(line)
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))

if (waived.length > 0) {
  console.log(
    [
      'check-lockfile-age: younger than the quarantine, but named in minimumReleaseAgeExcludes:',
      ...waived.sort(),
    ].join('\n'),
  )
}
if (unchecked.length > 0) {
  fail([
    'check-lockfile-age: these could not be checked against the registry, and nothing passes unchecked:',
    ...unchecked.sort(),
  ])
}
if (young.length > 0) {
  fail([
    `check-lockfile-age: ${young.length} locked version(s) younger than the quarantine (${quarantine / 86400} days), which Bun's resolver refuses (D-23, CC-08):`,
    ...young.sort(),
    'A reviewed security fix is named in minimumReleaseAgeExcludes in bunfig.toml, with its reason.',
  ])
}
console.log(`check-lockfile-age: ${added.length} added version(s), all older than the quarantine`)
