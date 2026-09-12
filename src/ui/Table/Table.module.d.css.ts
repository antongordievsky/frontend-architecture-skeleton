// The classes Table.module.css defines, so that a misspelled class fails typecheck rather than leaving the
// part unstyled. A class renamed in the stylesheet but not here fails the part's screenshots (D-14).
declare const styles: {
  readonly table: string
  readonly header: string
  readonly column: string
  readonly body: string
  readonly row: string
  readonly cell: string
}
export default styles
