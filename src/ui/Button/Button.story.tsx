import { useState } from 'react'
import { Button } from './Button.tsx'

// D-14: one export per state. Each is mounted by Button.spec.ts in Playwright's gallery, in three engines.
export const Primary = () => <Button>Try again</Button>

export const Disabled = () => <Button isDisabled>Try again</Button>

// The story owns the state and records it where the test can read it, as Playwright's gallery spec advises.
export const Pressable = () => {
  const [presses, setPresses] = useState(0)
  return (
    <>
      <Button onPress={() => setPresses((count) => count + 1)}>Try again</Button>
      <form hidden>
        <input data-testid="presses" readOnly value={String(presses)} />
      </form>
    </>
  )
}
