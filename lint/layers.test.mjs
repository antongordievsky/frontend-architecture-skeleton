// D-16, QR-23: the layer rule proves itself on every check. oxlint's JS plugin API is alpha (D-10), so an
// update could switch the rule off without a word. Each `// expect: <reason>` comment in the fixture must
// be answered by a report with that reason on the next line, and every report must have been expected.
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const here = import.meta.dirname
const fixture = path.join(here, 'fixtures', 'layers')
const config = path.join(here, 'fixtures', 'layers.oxlintrc.json')
const oxlint = path.join(here, '..', 'node_modules', '.bin', 'oxlint')

const expected = []
for (const name of readdirSync(fixture, { recursive: true })) {
  if (!/\.[jt]sx?$/.test(name)) continue
  const file = path.join(fixture, name)
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((text, index) => {
      const marker = text.match(/\/\/ expect: (.+)$/)
      if (marker) expected.push({ file, line: index + 2, reason: marker[1].trim() })
    })
}

const run = spawnSync(oxlint, ['-c', config, '--format', 'unix', fixture], { encoding: 'utf8' })
if (run.status !== 0 && run.status !== 1) {
  console.error(
    `layers: oxlint did not run (status ${run.status})\n${run.stderr}${run.error ?? ''}`,
  )
  process.exit(1)
}

const reports = run.stdout
  .split('\n')
  .map((line) => line.match(/^(.+?):(\d+):\d+: (.+) \[\w+\/.+\]$/))
  .filter(Boolean)
  .map(([, file, line, message]) => ({ file: path.resolve(file), line: Number(line), message }))

const answers = (want, got) =>
  got.file === want.file && got.line === want.line && got.message.includes(want.reason)
const unanswered = expected.filter((want) => !reports.some((got) => answers(want, got)))
const unexpected = reports.filter((got) => !expected.some((want) => answers(want, got)))

const where = (file, line) => `${path.relative(fixture, file)}:${line}`
for (const want of unanswered)
  console.error(`expected, not reported: ${where(want.file, want.line)} ${want.reason}`)
for (const got of unexpected)
  console.error(`reported, not expected: ${where(got.file, got.line)} ${got.message}`)
if (unanswered.length > 0 || unexpected.length > 0) process.exit(1)
console.log(`layers: all ${expected.length} expected violations reported, and nothing else (D-16)`)
