import { useState } from 'react'
import type { SortDescriptor } from 'react-aria-components'
import { Table, type TableColumn } from './Table.tsx'

// D-14: one export per state. Each is mounted by Table.spec.ts in Playwright's gallery, in three engines.

type Row = {
  readonly id: string
  readonly occurredAt: string
  readonly kind: string
  readonly value: string
}

const COLUMNS: readonly TableColumn<Row>[] = [
  {
    id: 'occurredAt',
    label: 'Date',
    sortable: true,
    isRowHeader: true,
    cell: (row) => row.occurredAt,
  },
  { id: 'kind', label: 'Kind', cell: (row) => row.kind },
  { id: 'value', label: 'Value', sortable: true, cell: (row) => row.value },
]

const KINDS = ['deposit', 'withdrawal', 'trade']

// Fixed strings, never Date.now: a screenshot compared with zero tolerance cannot contain today's date.
const rowsOf = (count: number): readonly Row[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `tx-${String(i).padStart(5, '0')}`,
    occurredAt: `2026-08-${String(31 - (i % 28)).padStart(2, '0')}`,
    kind: KINDS[i % 3] ?? 'deposit',
    value: `€${((i % 97) * 13 + 4).toFixed(2)}`,
  }))

export const Default = () => <Table label="Transactions" columns={COLUMNS} rows={rowsOf(6)} />

export const Empty = () => (
  <Table
    label="Transactions"
    columns={COLUMNS}
    rows={[]}
    renderEmptyState={() => 'No transactions yet.'}
  />
)

// The sorted state, held by the story as a page would hold it in the address (D-06).
export const Sorted = () => {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'value',
    direction: 'descending',
  })
  return (
    <Table
      label="Transactions"
      columns={COLUMNS}
      rows={rowsOf(6)}
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
    />
  )
}

// QR-6: the case the part exists for. Only a screenful reaches the DOM; the spec counts the rows to prove it.
export const ManyRows = () => <Table label="Transactions" columns={COLUMNS} rows={rowsOf(10_000)} />
