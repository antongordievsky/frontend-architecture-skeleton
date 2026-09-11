// D-04, QR-6: a deterministic dataset — the same seed gives the same transactions on every machine, so a
// failing test or a slow page can be reproduced exactly. Typed with the contract's generated types.
import type { CryptoAmount, Transaction } from '../src/api/generated/model/index.ts'

// mulberry32: a 32-bit seeded generator. Never Math.random or Date.now, which would break determinism.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
}

// Asset ids with their decimals, 6 to 24 — ids, not tickers (D-08).
const ASSETS: readonly (readonly [string, number])[] = [
  ['btc', 8],
  ['eth', 18],
  ['usdc-eth', 6],
  ['usdt-tron', 6],
  ['sol', 9],
  ['ada', 6],
  ['dot', 10],
  ['xrp', 6],
  ['doge', 8],
  ['ltc', 8],
  ['matic', 18],
  ['avax', 18],
  ['link-eth', 18],
  ['uni-eth', 18],
  ['atom', 6],
  ['xlm', 7],
  ['algo', 6],
  ['near', 24],
  ['trx', 6],
  ['bnb', 18],
  ['arb', 18],
  ['op', 18],
]

// The newest transaction's time; the rest go back from here.
const LATEST = Date.UTC(2026, 8, 1)

export const generateTransactions = (seed: number, count: number): readonly Transaction[] => {
  const random = seeded(seed)
  const amount = (): CryptoAmount => {
    const [asset, decimals] = ASSETS[Math.floor(random() * ASSETS.length)] ?? ['btc', 8]
    const length = 1 + Math.floor(random() * (decimals + 5))
    const digits = Array.from({ length }, () => Math.floor(random() * 10)).join('')
    return { asset, decimals, baseUnits: digits.replace(/^0+(?=\d)/, '') }
  }
  const value = () => ({ currency: 'EUR', minor: String(Math.floor(random() * 10_000_000)) })
  let time = LATEST
  return Array.from({ length: count }, (_, i): Transaction => {
    time -= 1_000 + Math.floor(random() * 6 * 3_600_000)
    const common = {
      id: `tx-${String(i).padStart(5, '0')}`,
      occurredAt: new Date(time).toISOString(),
    }
    const kind = random()
    if (kind < 0.45) return { ...common, kind: 'deposit', amount: amount(), value: value() }
    if (kind < 0.7) return { ...common, kind: 'withdrawal', amount: amount(), value: value() }
    return { ...common, kind: 'trade', sold: amount(), bought: amount(), value: value() }
  })
}
