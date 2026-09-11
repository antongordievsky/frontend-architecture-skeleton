// A test file may use the stand-in: allowed.
import { createHandler } from '../../mock/handler'
// expect: only a test file may reach mock/
import { contract } from '../../contract/openapi'

export const cases = [createHandler, contract]
