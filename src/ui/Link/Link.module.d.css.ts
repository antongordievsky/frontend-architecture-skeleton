// The classes Link.module.css defines, so that a misspelled class fails typecheck rather than leaving the part
// unstyled. A class renamed in the stylesheet but not here fails the part's screenshots (D-14).
declare const styles: { readonly link: string }
export default styles
