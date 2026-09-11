import type { ReactNode } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import styles from './Button.module.css'

export type ButtonProps = Pick<AriaButtonProps, 'onPress' | 'isDisabled' | 'type'> & {
  readonly children: ReactNode
}

// D-07: pressing by mouse, touch and keyboard, a focus ring only for the keyboard, and the disabled state come
// from React Aria. The look is ours, read from the tokens (D-28). One variant: the one the screens use.
export function Button({ children, ...props }: ButtonProps) {
  return (
    <AriaButton {...props} className={styles.button}>
      {children}
    </AriaButton>
  )
}
