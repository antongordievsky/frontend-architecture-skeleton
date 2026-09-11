// CC-08, D-23: a version younger than the quarantine cannot enter the lockfile. Bun's resolver already
// refuses one; this checks the lockfile itself, whatever wrote it: a warm cache (CC-02), another tool, a
// hand edit. Only the versions a commit adds are checked, because a locked version was checked when it came.
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

const gitShow = (spec) => {
  try {
    return execFileSync('git', ['show', spec], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch {
    // No HEAD yet, or no lockfile in it: everything the lockfile holds is added.
    return null
  }
}

// bun.lock is JSON with trailing commas. Each entry starts with "name@version".
const lockedVersions = (text) => {
  const ids = new Set()
  if (text === null) return ids
  const lock = JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'))
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const id = entry[0]
    const at = id.lastIndexOf('@')
    if (at <= 0 || !/^\d+\.\d+\.\d+/.test(id.slice(at + 1))) {
      fail([
        `check-lockfile-age: ${key} is locked as "${id}", which is no registry version and cannot be checked`,
      ])
    }
    ids.add(id)
  }
  return ids
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
const base = lockedVersions(baseText)
const added = [...lockedVersions(headText)].filter((id) => !base.has(id))
if (added.length === 0) {
  console.log('check-lockfile-age: the lockfile adds no version')
  process.exit(0)
}

const versionsByName = new Map()
for (const id of added) {
  const at = id.lastIndexOf('@')
  const name = id.slice(0, at)
  versionsByName.set(name, [...(versionsByName.get(name) ?? []), id.slice(at + 1)])
}

const now = Date.now()
const young = []
const waived = []
const unchecked = []
const queue = [...versionsByName.keys()]
const worker = async () => {
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    let time
    try {
      const res = await fetch(`${args.registry}/${name.replace('/', '%2f')}`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      time = (await res.json()).time ?? {}
    } catch (e) {
      unchecked.push(
        `  ${name}: ${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ''}`,
      )
      continue
    }
    for (const version of versionsByName.get(name)) {
      const published = Date.parse(time[version])
      if (Number.isNaN(published)) {
        unchecked.push(`  ${name}@${version}: the registry gives no publish time`)
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
