import type { ReactNode } from 'react'
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'
import styles from './TextField.module.css'

export type TextFieldProps = Pick<
  AriaTextFieldProps,
  | 'name'
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'isRequired'
  | 'isDisabled'
  | 'isInvalid'
> & {
  readonly label: ReactNode
  readonly description?: ReactNode
  readonly errorMessage?: ReactNode
}

// D-07, QR-12: the label always exists — a placeholder standing in for one disappears as soon as someone types,
// and a screen reader never had it. React Aria ties the label, the description and the error to the input, so the
// field announces itself; the look is ours, read from the tokens (D-28, D-29).
export function TextField({ label, description, errorMessage, ...props }: TextFieldProps) {
  return (
    <AriaTextField {...props} className={styles.field}>
      <Label className={styles.label}>{label}</Label>
      <Input className={styles.input} />
      {description === undefined ? null : (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      {/* Renders only while the field is invalid, and becomes the input's description when it does. */}
      <FieldError className={styles.error}>{errorMessage}</FieldError>
    </AriaTextField>
  )
}
