import { TextField } from './TextField.tsx'

// D-14: one export per state. Each is mounted by TextField.spec.ts in Playwright's gallery, in three engines.
export const Default = () => <TextField label="Email" name="email" type="email" />

export const Described = () => (
  <TextField
    label="Email"
    name="email"
    type="email"
    description="We use it to sign you in, nothing else."
  />
)

export const Invalid = () => (
  <TextField
    label="Email"
    name="email"
    type="email"
    defaultValue="not-an-email"
    isInvalid
    errorMessage="Enter an email address."
  />
)

export const Disabled = () => (
  <TextField label="Email" name="email" type="email" defaultValue="you@example.com" isDisabled />
)
