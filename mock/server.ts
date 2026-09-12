// D-04, D-12: the stand-in backend as a real HTTP server, so the browser asks it over the network exactly
// as it will ask the backend. The handler is unchanged — the same function the tests plug into `fetch` —
// which is the point: one stand-in, two ways in.
//
// Its shape comes from the environment, so a loading state or a failure can be seen without touching code:
//   MOCK_SEED        the dataset's seed        (default 42)
//   MOCK_COUNT       how many transactions     (default 10_000)
//   MOCK_LATENCY_MS  delay before every answer (default 0)
//   MOCK_FAIL_STATUS answer everything with this status
//   MOCK_PORT        the port to listen on      (default 3001)
import { createHandler, type MockOptions } from './handler.ts'

// An unset variable means "use the default"; a set but unreadable one is a mistake worth stopping for,
// rather than silently serving a different dataset than the operator asked for.
const number = (name: string): number | undefined => {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`${name} is not a number: ${raw}`)
  return value
}

// Read once each: `exactOptionalPropertyTypes` needs the narrowing to survive into the object, which
// two separate calls to the same function cannot give it.
const seed = number('MOCK_SEED')
const count = number('MOCK_COUNT')
const latencyMs = number('MOCK_LATENCY_MS')
const failStatus = number('MOCK_FAIL_STATUS')

const options: MockOptions = {
  ...(seed === undefined ? {} : { seed }),
  ...(count === undefined ? {} : { count }),
  ...(latencyMs === undefined ? {} : { latencyMs }),
  ...(failStatus === undefined ? {} : { failStatus }),
}

const handler = createHandler(options)
const port = number('MOCK_PORT') ?? 3001

const server = Bun.serve({
  port,
  // 0.0.0.0: inside a container the caller is another container, never localhost.
  hostname: '0.0.0.0',
  fetch: handler,
})

console.log(`the stand-in backend is listening on ${server.port}`, options)
