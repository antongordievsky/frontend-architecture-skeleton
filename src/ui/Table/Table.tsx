import { type Key, type ReactNode, useMemo } from 'react'
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  type SortDescriptor,
  TableLayout,
  Virtualizer,
} from 'react-aria-components'
import styles from './Table.module.css'

/**
 * D-07, D-06: the table part. Ten thousand rows reach the DOM a screenful at a time, through React Aria's
 * Virtualizer — measured need, not decoration (QR-6).
 *
 * The part knows nothing about transactions. A caller describes its columns as data and says how to draw a
 * cell, which keeps the markup out of the page and lets the page stay a list of decisions (FR-7).
 *
 * `aria-sort` is React Aria's own work (useTableColumnHeader writes it, with an extra described-by for
 * Android Talkback, which does not support the attribute) — measured in react-aria 1.21, not assumed. The
 * spec asserts it rather than the part setting it.
 */
export type TableColumn<Row> = {
  /** Also the sort field a caller matches against, so it is the column's identity, not its position. */
  readonly id: string
  readonly label: string
  readonly sortable?: boolean
  /** A row header is what a screen reader announces while moving between rows. One per table. */
  readonly isRowHeader?: boolean
  readonly cell: (row: Row) => ReactNode
}

/**
 * D-16: the kit owns the vocabulary of its own library. A page says "sorted by this column, this way"
 * without importing React Aria — only ui/ may do that, and lint enforces it.
 */
export type TableSortDescriptor = SortDescriptor

export type TableProps<Row extends { readonly id: string }> = {
  readonly label: string
  readonly columns: readonly TableColumn<Row>[]
  readonly rows: readonly Row[]
  readonly sortDescriptor?: SortDescriptor
  readonly onSortChange?: (descriptor: SortDescriptor) => void
  /** Shown in place of rows when there are none. The page decides the words: empty is not "no matches". */
  readonly renderEmptyState?: () => ReactNode
  readonly onRowAction?: (id: Key) => void
}

// The layout's own numbers, in px, because a virtualiser has to know a row's height before it renders one.
// They match the stylesheet's padding and line height; a change in one is a change in both.
const ROW_HEIGHT = 44
const HEADING_HEIGHT = 40

export function Table<Row extends { readonly id: string }>({
  label,
  columns,
  rows,
  renderEmptyState,
  ...props
}: TableProps<Row>) {
  // A fresh object each render would re-measure the whole collection on every keystroke elsewhere.
  const layoutOptions = useMemo(
    () => ({ rowHeight: ROW_HEIGHT, headingHeight: HEADING_HEIGHT }),
    [],
  )
  // Nothing to virtualise, and the virtualiser would give the empty state no height: measured, the grid
  // came out 2px tall with the message at display:contents and zero size. So an empty table is a plain one.
  const table = (
    <AriaTable {...props} aria-label={label} className={styles.table}>
      <AriaTableHeader className={styles.header}>
        {columns.map((column) => (
          <AriaColumn
            key={column.id}
            id={column.id}
            className={styles.column}
            {...(column.sortable === true ? { allowsSorting: true } : {})}
            {...(column.isRowHeader === true ? { isRowHeader: true } : {})}
          >
            {column.label}
          </AriaColumn>
        ))}
      </AriaTableHeader>
      <AriaTableBody
        items={rows}
        className={styles.body}
        {...(renderEmptyState ? { renderEmptyState } : {})}
      >
        {(row: Row) => (
          <AriaRow id={row.id} columns={columns} className={styles.row}>
            {(column: TableColumn<Row>) => (
              <AriaCell className={styles.cell}>{column.cell(row)}</AriaCell>
            )}
          </AriaRow>
        )}
      </AriaTableBody>
    </AriaTable>
  )
  if (rows.length === 0) return table
  return (
    <Virtualizer layout={TableLayout} layoutOptions={layoutOptions}>
      {table}
    </Virtualizer>
  )
}
