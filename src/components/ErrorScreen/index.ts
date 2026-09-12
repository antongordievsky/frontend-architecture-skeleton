export { NotFoundScreen, RouteErrorScreen } from './ErrorScreen.tsx'
// D-18: a page that renders its own failure state (the transactions table does) reads the same words as the
// route-level screens, so one API answer is never described two ways.
export { describeError } from './describeError.ts'
